const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const router = express.Router();

// Get all insurance claims
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, p.first_name, p.last_name
      FROM insurance_claims i
      JOIN patients p ON i.patient_id = p.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single claim
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, p.first_name, p.last_name, p.insurance_provider as patient_insurance, p.insurance_id as patient_insurance_id
      FROM insurance_claims i
      JOIN patients p ON i.patient_id = p.id
      WHERE i.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create claim
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, treatment_plan_id, insurance_provider, policy_number, claim_amount, procedure_codes, status, submission_date } = req.body;
    const result = await db.query(
      `INSERT INTO insurance_claims (patient_id, treatment_plan_id, insurance_provider, policy_number, claim_amount, procedure_codes, status, submission_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [patient_id, treatment_plan_id, insurance_provider, policy_number, claim_amount, procedure_codes, status || 'pending', submission_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Pre-authorization
router.post('/:id/ai-preauth', authenticateToken, async (req, res) => {
  try {
    const claim = await db.query(`
      SELECT i.*, p.first_name, p.last_name, p.medical_history, p.date_of_birth, p.insurance_provider as patient_ins,
             t.diagnosis, t.treatment_description, t.procedures as treatment_procedures
      FROM insurance_claims i
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN treatment_plans t ON i.treatment_plan_id = t.id
      WHERE i.id = $1
    `, [req.params.id]);

    if (claim.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });

    const record = claim.rows[0];
    const prompt = `Generate an insurance pre-authorization letter and analysis for this dental claim:

Patient: ${record.first_name} ${record.last_name}
DOB: ${record.date_of_birth}
Insurance: ${record.insurance_provider} - Policy: ${record.policy_number}
Medical History: ${record.medical_history || 'None'}

Claim Details:
- Amount: $${record.claim_amount}
- Procedure Codes: ${record.procedure_codes}
- Diagnosis: ${record.diagnosis || 'See procedures'}
- Treatment Plan: ${record.treatment_description || 'N/A'}

Please provide:
1. **Pre-Authorization Letter**: Professional letter to insurance company justifying medical necessity
2. **Clinical Justification**: Evidence-based reasoning for each procedure
3. **ADA Code Analysis**: Proper coding verification and suggestions
4. **Coverage Prediction**: Likelihood of approval based on common insurance patterns
5. **Alternative Coding**: If denied, alternative codes to consider
6. **Appeal Strategy**: Pre-emptive appeal points if initially denied
7. **Documentation Checklist**: Required supporting documents for submission`;

    const aiResult = await queryOpenRouter(prompt, 'You are an expert dental insurance billing and coding AI. Help maximize legitimate claim approvals through proper documentation and coding.');

    await db.query(
      `UPDATE insurance_claims SET ai_pre_auth_notes = $1, updated_at = NOW() WHERE id = $2`,
      [aiResult.content, req.params.id]
    );

    res.json({ preauth: aiResult.content, model: aiResult.model, usage: aiResult.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update claim
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { insurance_provider, policy_number, claim_amount, approved_amount, procedure_codes, status, submission_date, response_date, denial_reason } = req.body;
    const result = await db.query(
      `UPDATE insurance_claims SET insurance_provider=$1, policy_number=$2, claim_amount=$3, approved_amount=$4, procedure_codes=$5, status=$6, submission_date=$7, response_date=$8, denial_reason=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [insurance_provider, policy_number, claim_amount, approved_amount, procedure_codes, status, submission_date, response_date, denial_reason, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete claim
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM insurance_claims WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Insurance claim deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
