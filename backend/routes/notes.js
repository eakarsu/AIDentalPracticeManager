const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all clinical notes (optionally filter by patient) — supports ?page=N&limit=N for pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id } = req.query;
    const baseFrom = `FROM clinical_notes cn JOIN patients p ON cn.patient_id = p.id`;
    const whereClause = patient_id ? `WHERE cn.patient_id = $1` : '';

    if (req.query.page !== undefined) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const countParams = patient_id ? [patient_id] : [];
      const countResult = await db.query(`SELECT COUNT(*) as total ${baseFrom} ${whereClause}`, countParams);
      const total = parseInt(countResult.rows[0].total);

      const dataParams = patient_id ? [patient_id, limit, offset] : [limit, offset];
      const limitOffset = patient_id ? `LIMIT $2 OFFSET $3` : `LIMIT $1 OFFSET $2`;
      const result = await db.query(
        `SELECT cn.*, p.first_name, p.last_name ${baseFrom} ${whereClause} ORDER BY cn.visit_date DESC, cn.created_at DESC ${limitOffset}`,
        dataParams
      );
      return res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    let query = `SELECT cn.*, p.first_name, p.last_name ${baseFrom} `;
    const params = [];
    if (patient_id) {
      query += ' WHERE cn.patient_id = $1';
      params.push(patient_id);
    }
    query += ' ORDER BY cn.visit_date DESC, cn.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single note
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cn.*, p.first_name, p.last_name
       FROM clinical_notes cn JOIN patients p ON cn.patient_id = p.id
       WHERE cn.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create note
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, visit_date, note_type, chief_complaint, subjective, objective, assessment, plan, provider, tooth_numbers, procedures_performed, notes } = req.body;
    const result = await db.query(
      `INSERT INTO clinical_notes (patient_id, visit_date, note_type, chief_complaint, subjective, objective, assessment, plan, provider, tooth_numbers, procedures_performed, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [patient_id, visit_date, note_type, chief_complaint, subjective, objective, assessment, plan, provider, tooth_numbers, procedures_performed, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update note
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { patient_id, visit_date, note_type, chief_complaint, subjective, objective, assessment, plan, provider, tooth_numbers, procedures_performed, notes } = req.body;
    const result = await db.query(
      `UPDATE clinical_notes SET patient_id=$1, visit_date=$2, note_type=$3, chief_complaint=$4,
       subjective=$5, objective=$6, assessment=$7, plan=$8, provider=$9,
       tooth_numbers=$10, procedures_performed=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [patient_id, visit_date, note_type, chief_complaint, subjective, objective, assessment, plan, provider, tooth_numbers, procedures_performed, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete note
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM clinical_notes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notes/ai-draft — generate AI SOAP note draft
router.post('/ai-draft', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { patient_id, chief_complaint, procedures_performed, tooth_numbers } = req.body;

    if (!patient_id || !chief_complaint) {
      return res.status(400).json({ error: 'Missing required fields: patient_id, chief_complaint' });
    }

    // Fetch patient data
    const patientResult = await db.query(
      'SELECT first_name, last_name, date_of_birth, medical_history, allergies FROM patients WHERE id = $1',
      [patient_id]
    );
    if (patientResult.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientResult.rows[0];

    // Fetch last 3 clinical notes for context
    const recentNotes = await db.query(
      `SELECT visit_date, note_type, chief_complaint, subjective, objective, assessment, plan, procedures_performed
       FROM clinical_notes WHERE patient_id = $1 ORDER BY visit_date DESC, created_at DESC LIMIT 3`,
      [patient_id]
    );

    const age = patient.date_of_birth
      ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / 31557600000)
      : 'Unknown';

    const prompt = `Generate a clinical SOAP note draft for this dental visit.

Patient: ${patient.first_name} ${patient.last_name}, Age: ${age}
Medical History: ${patient.medical_history || 'None reported'}
Allergies: ${patient.allergies || 'None'}

Visit Information:
- Chief Complaint: ${chief_complaint}
- Procedures Performed: ${procedures_performed || 'Not specified'}
- Tooth Numbers: ${tooth_numbers || 'Not specified'}

Recent Visit History (last 3 notes for context):
${recentNotes.rows.length > 0 ? JSON.stringify(recentNotes.rows, null, 2) : 'No prior notes'}

Generate a complete SOAP note. Return ONLY valid JSON in this exact format:
{
  "subjective": "Patient's chief complaint and reported symptoms in detail...",
  "objective": "Clinical findings, exam results, radiographic findings...",
  "assessment": "Diagnosis and clinical assessment...",
  "plan": "Treatment plan, procedures performed, follow-up instructions..."
}`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are an expert dental clinical documentation AI. Generate professional, accurate SOAP notes based on the visit information provided. Return only valid JSON.'
    );

    const { parseAIJson } = require('../services/parseAIJson');
    const parsed = parseAIJson(aiResult.content);
    let structured;
    if (parsed.raw_response) {
      // 4th-strategy SOAP-specific extraction
      const text = parsed.raw_response;
      structured = {
        subjective: text.match(/subjective[:\s]+(.+?)(?=objective|$)/is)?.[1]?.trim() || text,
        objective: text.match(/objective[:\s]+(.+?)(?=assessment|$)/is)?.[1]?.trim() || '',
        assessment: text.match(/assessment[:\s]+(.+?)(?=plan|$)/is)?.[1]?.trim() || '',
        plan: text.match(/plan[:\s]+(.+?)$/is)?.[1]?.trim() || ''
      };
    } else {
      structured = parsed;
    }

    res.json({
      draft: structured,
      patient: { id: patient_id, name: `${patient.first_name} ${patient.last_name}` },
      model: aiResult.model,
      usage: aiResult.usage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
