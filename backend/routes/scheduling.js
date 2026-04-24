const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const router = express.Router();

// Get all appointments
router.get('/', authenticateToken, async (req, res) => {
  try {
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

// Create appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, appointment_date, duration_minutes, appointment_type, provider, operatory, status, notes } = req.body;
    const result = await db.query(
      `INSERT INTO appointments (patient_id, appointment_date, duration_minutes, appointment_type, provider, operatory, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [patient_id, appointment_date, duration_minutes || 30, appointment_type, provider, operatory, status || 'scheduled', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Schedule optimization
router.post('/ai-optimize', authenticateToken, async (req, res) => {
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
