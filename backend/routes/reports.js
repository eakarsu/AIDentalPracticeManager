const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Revenue report
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const monthly = await db.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COALESCE(SUM(total_amount), 0) as billed,
        COALESCE(SUM(paid_amount), 0) as collected,
        COALESCE(SUM(total_amount) - SUM(paid_amount), 0) as outstanding
      FROM invoices
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `, [startDate, endDate]);

    const totals = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(total_amount) - SUM(paid_amount), 0) as total_outstanding,
        COUNT(*) as total_invoices
      FROM invoices
      WHERE created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);

    const byMethod = await db.query(`
      SELECT payment_method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM payments
      WHERE payment_date >= $1 AND payment_date <= $2
      GROUP BY payment_method ORDER BY total DESC
    `, [startDate, endDate]);

    res.json({ monthly: monthly.rows, totals: totals.rows[0], byMethod: byMethod.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Patient demographics report
router.get('/demographics', authenticateToken, async (req, res) => {
  try {
    const ageGroups = await db.query(`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'Under 18'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 34 THEN '18-34'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 35 AND 54 THEN '35-54'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 55 AND 74 THEN '55-74'
          ELSE '75+'
        END as age_group,
        COUNT(*) as count
      FROM patients WHERE date_of_birth IS NOT NULL
      GROUP BY age_group ORDER BY age_group
    `);

    const insuranceBreakdown = await db.query(`
      SELECT COALESCE(insurance_provider, 'No Insurance') as provider, COUNT(*) as count
      FROM patients GROUP BY insurance_provider ORDER BY count DESC
    `);

    const totalPatients = await db.query('SELECT COUNT(*) as count FROM patients');
    const newThisMonth = await db.query("SELECT COUNT(*) as count FROM patients WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)");

    res.json({
      ageGroups: ageGroups.rows,
      insuranceBreakdown: insuranceBreakdown.rows,
      totalPatients: parseInt(totalPatients.rows[0].count),
      newThisMonth: parseInt(newThisMonth.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procedure statistics
router.get('/procedures', authenticateToken, async (req, res) => {
  try {
    const byType = await db.query(`
      SELECT appointment_type as procedure_type, COUNT(*) as count
      FROM appointments
      WHERE appointment_type IS NOT NULL
      GROUP BY appointment_type ORDER BY count DESC
    `);

    const byStatus = await db.query(`
      SELECT status, COUNT(*) as count
      FROM treatment_plans GROUP BY status ORDER BY count DESC
    `);

    const byProvider = await db.query(`
      SELECT provider, COUNT(*) as count
      FROM appointments WHERE provider IS NOT NULL
      GROUP BY provider ORDER BY count DESC
    `);

    res.json({ byType: byType.rows, treatmentStatus: byStatus.rows, byProvider: byProvider.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Insurance report
router.get('/insurance', authenticateToken, async (req, res) => {
  try {
    const byStatus = await db.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(claim_amount), 0) as total_amount
      FROM insurance_claims GROUP BY status ORDER BY count DESC
    `);

    const byProvider = await db.query(`
      SELECT insurance_provider, COUNT(*) as count,
        COALESCE(SUM(claim_amount), 0) as total_claimed,
        COALESCE(SUM(approved_amount), 0) as total_approved
      FROM insurance_claims GROUP BY insurance_provider ORDER BY count DESC
    `);

    const approvalRate = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'denied') as denied,
        COUNT(*) as total
      FROM insurance_claims WHERE status IN ('approved', 'denied')
    `);

    res.json({ byStatus: byStatus.rows, byProvider: byProvider.rows, approvalRate: approvalRate.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
