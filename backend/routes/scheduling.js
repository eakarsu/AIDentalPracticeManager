const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all appointments — supports ?page=N&limit=N for pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.query.page !== undefined) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const countResult = await db.query('SELECT COUNT(*) as total FROM appointments');
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      const result = await db.query(`
        SELECT a.*, p.first_name, p.last_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        ORDER BY a.appointment_date ASC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      return res.json({ data: result.rows, pagination: { page, limit, total, totalPages } });
    }

    const result = await db.query(`
      SELECT a.*, p.first_name, p.last_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      ORDER BY a.appointment_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scheduling/check-conflicts?date=...&duration=...&provider=...&operatory=...
// Defined before /:id to avoid route shadowing
router.get('/check-conflicts', authenticateToken, async (req, res) => {
  try {
    const { date, duration, provider, operatory, exclude_id } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });
    const dur = parseInt(duration) || 30;

    const params = [provider || null, operatory || null, date, dur];
    let sql = `SELECT id, patient_id, provider, operatory, appointment_date, duration_minutes, appointment_type
       FROM appointments
       WHERE status NOT IN ('cancelled', 'no_show')
         AND (
           (provider = $1 AND $1 IS NOT NULL) OR
           (operatory = $2 AND $2 IS NOT NULL)
         )
         AND (
           appointment_date < ($3::timestamp + ($4 || ' minutes')::interval)
           AND (appointment_date + (duration_minutes || ' minutes')::interval) > $3::timestamp
         )`;
    if (exclude_id) {
      params.push(exclude_id);
      sql += ` AND id <> $${params.length}`;
    }
    const conflicts = await db.query(sql, params);
    res.json({ has_conflicts: conflicts.rows.length > 0, conflicts: conflicts.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scheduling/availability?date=YYYY-MM-DD&provider=...
// Returns available 30-minute slots between 09:00–17:00
// Defined before /:id to avoid route shadowing
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const { date, provider, slot_minutes } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    const slot = parseInt(slot_minutes) || 30;
    const startHour = 9;
    const endHour = 17;

    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${date}T23:59:59Z`;
    const params = [dayStart, dayEnd];
    let sql = `SELECT id, appointment_date, duration_minutes, provider, operatory FROM appointments WHERE appointment_date BETWEEN $1::timestamp AND $2::timestamp AND status NOT IN ('cancelled','no_show')`;
    if (provider) { params.push(provider); sql += ` AND provider = $${params.length}`; }
    const booked = await db.query(sql, params);

    const busy = booked.rows.map(b => {
      const start = new Date(b.appointment_date);
      const end = new Date(start.getTime() + (b.duration_minutes || 30) * 60000);
      return [start.getTime(), end.getTime()];
    });

    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slot) {
        const slotStart = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`).getTime();
        const slotEnd = slotStart + slot * 60000;
        const conflict = busy.some(([bs, be]) => bs < slotEnd && be > slotStart);
        slots.push({ time: new Date(slotStart).toISOString(), available: !conflict });
      }
    }

    res.json({ date, provider: provider || 'any', slot_minutes: slot, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single appointment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, p.first_name, p.last_name, p.phone, p.email, p.medical_history, p.allergies, p.insurance_provider
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create appointment — checks for provider/operatory conflicts before insert
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, appointment_date, duration_minutes, appointment_type, provider, operatory, status, notes } = req.body;
    if (!patient_id || !appointment_date) {
      return res.status(400).json({ error: 'patient_id and appointment_date are required' });
    }

    const dur = duration_minutes || 30;
    // Conflict check: same provider OR same operatory overlapping window
    const conflictCheck = await db.query(
      `SELECT id, patient_id, provider, operatory, appointment_date, duration_minutes, appointment_type
       FROM appointments
       WHERE status NOT IN ('cancelled', 'no_show')
         AND (
           (provider = $1 AND provider IS NOT NULL) OR
           (operatory = $2 AND operatory IS NOT NULL)
         )
         AND (
           appointment_date < ($3::timestamp + ($4 || ' minutes')::interval)
           AND (appointment_date + (duration_minutes || ' minutes')::interval) > $3::timestamp
         )`,
      [provider, operatory, appointment_date, dur]
    );

    if (conflictCheck.rows.length > 0 && !req.body.override_conflict) {
      return res.status(409).json({
        error: 'Scheduling conflict detected',
        conflicts: conflictCheck.rows,
        hint: 'Send override_conflict=true to force-create the appointment.',
      });
    }

    const result = await db.query(
      `INSERT INTO appointments (patient_id, appointment_date, duration_minutes, appointment_type, provider, operatory, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [patient_id, appointment_date, dur, appointment_type, provider, operatory, status || 'scheduled', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Schedule optimization
router.post('/ai-optimize', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const appointments = await db.query(`
      SELECT a.*, p.first_name, p.last_name, p.medical_history
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.appointment_date >= NOW()
      ORDER BY a.appointment_date ASC
      LIMIT 30
    `);

    const appointmentList = appointments.rows.map(a =>
      `- ${a.first_name} ${a.last_name}: ${a.appointment_type} on ${new Date(a.appointment_date).toLocaleString()} (${a.duration_minutes}min) with ${a.provider} in ${a.operatory} [${a.status}]`
    ).join('\n');

    const prompt = `Analyze and optimize this dental practice schedule:

Upcoming Appointments:
${appointmentList}

Please provide:
1. **Schedule Analysis**: Overview of current schedule efficiency
2. **Optimization Suggestions**: Specific improvements for better patient flow
3. **Conflict Detection**: Any scheduling conflicts or overlaps
4. **Gap Analysis**: Identify underutilized time slots
5. **Provider Utilization**: How well each provider's time is allocated
6. **Patient Experience**: Suggestions for reducing wait times
7. **Revenue Optimization**: Opportunities to fill gaps with productive procedures
8. **Emergency Slots**: Recommendation for emergency appointment availability`;

    const aiResult = await queryOpenRouter(prompt, 'You are an expert dental practice scheduling AI. Optimize schedules for maximum efficiency, patient satisfaction, and revenue.');

    res.json({ optimization: aiResult.content, model: aiResult.model, usage: aiResult.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { appointment_date, duration_minutes, appointment_type, provider, operatory, status, notes } = req.body;
    const result = await db.query(
      `UPDATE appointments SET appointment_date=$1, duration_minutes=$2, appointment_type=$3, provider=$4, operatory=$5, status=$6, notes=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [appointment_date, duration_minutes, appointment_type, provider, operatory, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete appointment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
