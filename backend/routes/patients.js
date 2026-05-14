const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logPatientAccess } = require('../middleware/auditLog');
const router = express.Router();

// Get all patients — supports ?page=N&limit=N for pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.query.page !== undefined) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const countResult = await db.query('SELECT COUNT(*) as total FROM patients');
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      const result = await db.query(
        'SELECT * FROM patients ORDER BY last_name, first_name LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return res.json({ data: result.rows, pagination: { page, limit, total, totalPages } });
    }

    const result = await db.query('SELECT * FROM patients ORDER BY last_name, first_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single patient — HIPAA: log access
router.get('/:id', authenticateToken, logPatientAccess, async (req, res) => {
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

    // Input validation
    const missing = [];
    if (!first_name || !first_name.trim()) missing.push('first_name');
    if (!last_name || !last_name.trim()) missing.push('last_name');
    if (!date_of_birth) missing.push('date_of_birth');
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
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
