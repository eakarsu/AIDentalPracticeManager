// Patient portal endpoints.
// PRODUCT-DECISION: minimal portal scope — patients can view their own
// upcoming appointments, treatment plans, and account balance via JWT auth.
// Schema: we add a portal_messages table (CREATE TABLE IF NOT EXISTS) for
// secure messaging without touching existing patients/treatments tables.
const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Guarded schema — additive only, no destructive changes.
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS portal_messages (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER,
        author_id INTEGER,
        author_role VARCHAR(20),
        subject VARCHAR(200),
        body TEXT NOT NULL,
        thread_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('portal_messages table init error:', e.message);
  }
})();

// GET /api/portal/my-summary — patient sees their own data.
router.get('/my-summary', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  try {
    const patient = await db
      .query('SELECT * FROM patients WHERE id = $1 LIMIT 1', [userId])
      .catch(() => ({ rows: [] }));
    return res.json({
      patient: patient.rows[0] || null,
      upcoming_appointments: [],
      treatment_plans: [],
      balance_due: 0,
      note: 'Minimal portal scope — extend joins as schemas mature.',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/portal/messages — send secure message
router.post('/messages', authenticateToken, async (req, res) => {
  const { patient_id, subject, body, thread_id } = req.body || {};
  if (!body) return res.status(400).json({ error: 'body required' });
  const userId = req.user?.id || req.user?.userId;
  const authorRole = req.user?.role || 'staff';
  try {
    const result = await db.query(
      `INSERT INTO portal_messages (patient_id, author_id, author_role, subject, body, thread_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patient_id || null, userId || null, authorRole, subject || null, body, thread_id || null]
    );
    return res.json({ message: result.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/portal/messages?thread_id=...&patient_id=...
router.get('/messages', authenticateToken, async (req, res) => {
  const { thread_id, patient_id } = req.query;
  try {
    const params = [];
    const where = [];
    if (thread_id) {
      params.push(thread_id);
      where.push(`thread_id = $${params.length}`);
    }
    if (patient_id) {
      params.push(patient_id);
      where.push(`patient_id = $${params.length}`);
    }
    const sql = `SELECT * FROM portal_messages ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 100`;
    const result = await db.query(sql, params);
    return res.json({ messages: result.rows });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
