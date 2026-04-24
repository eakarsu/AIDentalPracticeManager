const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [patients, appointments, claims, treatments, xrays, recalls] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM patients'),
      db.query("SELECT COUNT(*) as count FROM appointments WHERE status IN ('scheduled', 'confirmed')"),
      db.query("SELECT COUNT(*) as count FROM insurance_claims WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as count FROM treatment_plans WHERE status IN ('proposed', 'active', 'approved')"),
      db.query("SELECT COUNT(*) as count FROM xray_analyses WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as count FROM recall_campaigns WHERE status = 'pending'"),
    ]);

    const revenueResult = await db.query("SELECT COALESCE(SUM(approved_amount), 0) as total FROM insurance_claims WHERE status = 'approved'");
    const todayAppts = await db.query("SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = CURRENT_DATE");

    const [unpaidInvoices, lowStock, clinicalNotes] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM invoices WHERE status IN ('unpaid', 'partial', 'overdue')"),
      db.query("SELECT COUNT(*) as count FROM inventory WHERE quantity <= reorder_level"),
      db.query("SELECT COUNT(*) as count FROM clinical_notes"),
    ]);

    res.json({
      totalPatients: parseInt(patients.rows[0].count),
      upcomingAppointments: parseInt(appointments.rows[0].count),
      pendingClaims: parseInt(claims.rows[0].count),
      activeTreatments: parseInt(treatments.rows[0].count),
      pendingXrays: parseInt(xrays.rows[0].count),
      pendingRecalls: parseInt(recalls.rows[0].count),
      totalRevenue: parseFloat(revenueResult.rows[0].total),
      todayAppointments: parseInt(todayAppts.rows[0].count),
      unpaidInvoices: parseInt(unpaidInvoices.rows[0].count),
      lowStockItems: parseInt(lowStock.rows[0].count),
      totalNotes: parseInt(clinicalNotes.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
