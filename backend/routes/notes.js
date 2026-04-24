const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all clinical notes (optionally filter by patient)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `
      SELECT cn.*, p.first_name, p.last_name
      FROM clinical_notes cn
      JOIN patients p ON cn.patient_id = p.id
    `;
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

module.exports = router;
