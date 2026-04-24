const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, p.first_name, p.last_name
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice with payments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await db.query('SELECT i.*, p.first_name, p.last_name FROM invoices i JOIN patients p ON i.patient_id = p.id WHERE i.id = $1', [req.params.id]);
    if (invoice.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const payments = await db.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC', [req.params.id]);
    res.json({ ...invoice.rows[0], payments: payments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create invoice
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, items, tax_rate, notes } = req.body;
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * (tax_rate || 0) / 100;
    const total = subtotal + tax;
    const result = await db.query(
      `INSERT INTO invoices (patient_id, items, subtotal, tax_rate, tax_amount, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [patient_id, JSON.stringify(items), subtotal, tax_rate || 0, tax, total, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { patient_id, items, tax_rate, status, notes } = req.body;
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * (tax_rate || 0) / 100;
    const total = subtotal + tax;
    const result = await db.query(
      `UPDATE invoices SET patient_id=$1, items=$2, subtotal=$3, tax_rate=$4, tax_amount=$5,
       total_amount=$6, status=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [patient_id, JSON.stringify(items), subtotal, tax_rate || 0, tax, total, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete invoice
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record payment
router.post('/:id/payments', authenticateToken, async (req, res) => {
  try {
    const { amount, payment_method, reference_number, notes } = req.body;
    const payment = await db.query(
      `INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, amount, payment_method, reference_number, notes]
    );
    // Update paid amount and status
    await db.query(`
      UPDATE invoices SET
        paid_amount = COALESCE(paid_amount, 0) + $1,
        status = CASE
          WHEN COALESCE(paid_amount, 0) + $1 >= total_amount THEN 'paid'
          WHEN COALESCE(paid_amount, 0) + $1 > 0 THEN 'partial'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $2
    `, [amount, req.params.id]);
    res.status(201).json(payment.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get patient balance summary
router.get('/patient/:patientId/summary', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(total_amount), 0) - COALESCE(SUM(paid_amount), 0) as outstanding_balance,
        COUNT(*) as total_invoices,
        COUNT(*) FILTER (WHERE status = 'unpaid' OR status = 'partial' OR status = 'overdue') as unpaid_invoices
      FROM invoices WHERE patient_id = $1
    `, [req.params.patientId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
