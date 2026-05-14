const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all treatment plans — supports ?page=N&limit=N for pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.query.page !== undefined) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const countResult = await db.query('SELECT COUNT(*) as total FROM treatment_plans');
      const total = parseInt(countResult.rows[0].total);

      const result = await db.query(`
        SELECT t.*, p.first_name, p.last_name
        FROM treatment_plans t
        JOIN patients p ON t.patient_id = p.id
        ORDER BY t.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      return res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const result = await db.query(`
      SELECT t.*, p.first_name, p.last_name
      FROM treatment_plans t
      JOIN patients p ON t.patient_id = p.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single treatment plan
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, p.first_name, p.last_name, p.medical_history, p.allergies, p.insurance_provider
      FROM treatment_plans t
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Treatment plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create treatment plan
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, diagnosis, treatment_description, procedures, estimated_cost, priority, status, start_date, end_date, notes } = req.body;
    const result = await db.query(
      `INSERT INTO treatment_plans (patient_id, diagnosis, treatment_description, procedures, estimated_cost, priority, status, start_date, end_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [patient_id, diagnosis, treatment_description, procedures, estimated_cost, priority || 'medium', status || 'proposed', start_date, end_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Generate treatment plan
router.post('/:id/ai-recommend', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const plan = await db.query(`
      SELECT t.*, p.first_name, p.last_name, p.medical_history, p.allergies, p.date_of_birth, p.insurance_provider
      FROM treatment_plans t
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (plan.rows.length === 0) return res.status(404).json({ error: 'Treatment plan not found' });

    const record = plan.rows[0];
    const prompt = `Generate a comprehensive dental treatment plan recommendation:

Patient: ${record.first_name} ${record.last_name}
Age: ${record.date_of_birth ? Math.floor((Date.now() - new Date(record.date_of_birth)) / 31557600000) : 'Unknown'}
Medical History: ${record.medical_history || 'None reported'}
Allergies: ${record.allergies || 'None'}
Insurance: ${record.insurance_provider || 'Unknown'}

Current Diagnosis: ${record.diagnosis}
Current Plan: ${record.treatment_description || 'None yet'}
Procedures: ${record.procedures || 'None listed'}

Please provide:
1. **Recommended Treatment Approach**: Step-by-step treatment plan
2. **Alternative Options**: Other viable treatment approaches with pros/cons
3. **Risk Assessment**: Potential complications and how to mitigate them
4. **Estimated Timeline**: Realistic treatment timeline
5. **Cost Analysis**: Approximate cost breakdown by procedure
6. **Special Considerations**: Based on patient's medical history and allergies
7. **Success Rate**: Expected outcome and prognosis
8. **Post-Treatment Care**: Home care instructions and follow-up schedule`;

    const aiResult = await queryOpenRouter(prompt, 'You are an expert dental treatment planning AI. Provide evidence-based treatment recommendations. Consider patient medical history and insurance coverage.');

    await db.query(
      `UPDATE treatment_plans SET ai_recommendation = $1, updated_at = NOW() WHERE id = $2`,
      [aiResult.content, req.params.id]
    );

    res.json({ recommendation: aiResult.content, model: aiResult.model, usage: aiResult.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update treatment plan
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { diagnosis, treatment_description, procedures, estimated_cost, priority, status, start_date, end_date, notes } = req.body;
    const result = await db.query(
      `UPDATE treatment_plans SET diagnosis=$1, treatment_description=$2, procedures=$3, estimated_cost=$4, priority=$5, status=$6, start_date=$7, end_date=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [diagnosis, treatment_description, procedures, estimated_cost, priority, status, start_date, end_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete treatment plan
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM treatment_plans WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Treatment plan deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
