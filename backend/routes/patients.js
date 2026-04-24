const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all patients
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM patients ORDER BY last_name, first_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single patient
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create patient
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, address, insurance_provider, insurance_id, medical_history, allergies, notes } = req.body;
    const result = await db.query(
      `INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, address, insurance_provider, insurance_id, medical_history, allergies, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [first_name, last_name, email, phone, date_of_birth, address, insurance_provider, insurance_id, medical_history, allergies, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update patient
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, address, insurance_provider, insurance_id, medical_history, allergies, notes } = req.body;
    const result = await db.query(
      `UPDATE patients SET first_name=$1, last_name=$2, email=$3, phone=$4, date_of_birth=$5, address=$6,
       insurance_provider=$7, insurance_id=$8, medical_history=$9, allergies=$10, notes=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [first_name, last_name, email, phone, date_of_birth, address, insurance_provider, insurance_id, medical_history, allergies, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete patient
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted', patient: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
