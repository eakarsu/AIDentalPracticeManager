const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const router = express.Router();

// Get all recall campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, p.first_name, p.last_name
      FROM recall_campaigns r
      JOIN patients p ON r.patient_id = p.id
      ORDER BY r.due_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single recall
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.medical_history
      FROM recall_campaigns r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Recall not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create recall
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, campaign_type, recall_reason, due_date, contact_method, message_template, status } = req.body;
    const result = await db.query(
      `INSERT INTO recall_campaigns (patient_id, campaign_type, recall_reason, due_date, contact_method, message_template, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patient_id, campaign_type, recall_reason, due_date, contact_method || 'email', message_template, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Generate personalized message
router.post('/:id/ai-personalize', authenticateToken, async (req, res) => {
  try {
    const recall = await db.query(`
      SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.medical_history, p.date_of_birth, p.notes as patient_notes
      FROM recall_campaigns r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.id = $1
    `, [req.params.id]);

    if (recall.rows.length === 0) return res.status(404).json({ error: 'Recall not found' });

    const record = recall.rows[0];
    const prompt = `Generate a personalized recall campaign message for this dental patient:

Patient: ${record.first_name} ${record.last_name}
Age: ${record.date_of_birth ? Math.floor((Date.now() - new Date(record.date_of_birth)) / 31557600000) : 'Unknown'}
Medical History: ${record.medical_history || 'None'}
Patient Notes: ${record.patient_notes || 'None'}

Campaign Details:
- Type: ${record.campaign_type}
- Reason: ${record.recall_reason}
- Due Date: ${record.due_date}
- Contact Method: ${record.contact_method}
- Template Type: ${record.message_template}

Please provide:
1. **Personalized Message**: A warm, professional ${record.contact_method} message tailored to this patient
2. **Subject Line**: (for email) Engaging subject line
3. **Key Points**: Important information to convey
4. **Call to Action**: Clear next steps for the patient
5. **Tone Analysis**: Why this tone was chosen for this patient
6. **Follow-up Strategy**: If no response, recommended follow-up approach
7. **Best Time to Send**: Optimal timing for this type of communication`;

    const aiResult = await queryOpenRouter(prompt, 'You are an expert dental patient communication AI. Create personalized, empathetic messages that encourage patient engagement while maintaining professionalism.');

    await db.query(
      `UPDATE recall_campaigns SET ai_personalized_message = $1, updated_at = NOW() WHERE id = $2`,
      [aiResult.content, req.params.id]
    );

    res.json({ message: aiResult.content, model: aiResult.model, usage: aiResult.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update recall
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { campaign_type, recall_reason, due_date, contact_method, message_template, status } = req.body;
    const result = await db.query(
      `UPDATE recall_campaigns SET campaign_type=$1, recall_reason=$2, due_date=$3, contact_method=$4, message_template=$5, status=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [campaign_type, recall_reason, due_date, contact_method, message_template, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete recall
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM recall_campaigns WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Recall campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
