const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const router = express.Router();

// Get all x-ray analyses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT x.*, p.first_name, p.last_name
      FROM xray_analyses x
      JOIN patients p ON x.patient_id = p.id
      ORDER BY x.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single x-ray analysis
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT x.*, p.first_name, p.last_name, p.medical_history, p.allergies
      FROM xray_analyses x
      JOIN patients p ON x.patient_id = p.id
      WHERE x.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'X-ray analysis not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create x-ray analysis
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, image_description, tooth_number, analysis_type, severity, dentist_notes } = req.body;
    const result = await db.query(
      `INSERT INTO xray_analyses (patient_id, image_description, tooth_number, analysis_type, severity, dentist_notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patient_id, image_description, tooth_number, analysis_type, severity || 'moderate', dentist_notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analyze x-ray
router.post('/:id/analyze', authenticateToken, async (req, res) => {
  try {
    const xray = await db.query(`
      SELECT x.*, p.first_name, p.last_name, p.medical_history, p.allergies, p.date_of_birth
      FROM xray_analyses x
      JOIN patients p ON x.patient_id = p.id
      WHERE x.id = $1
    `, [req.params.id]);

    if (xray.rows.length === 0) return res.status(404).json({ error: 'X-ray not found' });

    const record = xray.rows[0];
    const prompt = `Analyze this dental X-ray and provide detailed findings:

Patient: ${record.first_name} ${record.last_name}
Date of Birth: ${record.date_of_birth}
Medical History: ${record.medical_history || 'None reported'}
Allergies: ${record.allergies || 'None'}

X-ray Details:
- Type: ${record.analysis_type}
- Tooth/Area: ${record.tooth_number}
- Description: ${record.image_description}
- Dentist Notes: ${record.dentist_notes || 'None'}

Please provide:
1. **Detailed Findings**: What pathology or conditions are visible
2. **Differential Diagnosis**: Possible conditions to consider
3. **Severity Assessment**: Low/Moderate/High with reasoning
4. **Recommended Actions**: Next steps for treatment
5. **Annotations**: Key areas of concern with descriptions
6. **Follow-up**: Recommended follow-up timeline`;

    const aiResult = await queryOpenRouter(prompt, 'You are an expert dental radiologist AI. Provide detailed, professional analysis of dental X-rays. Be thorough but clear.');

    await db.query(
      `UPDATE xray_analyses SET ai_findings = $1, ai_annotations = $2, status = 'analyzed', updated_at = NOW() WHERE id = $3`,
      [aiResult.content, JSON.stringify({ model: aiResult.model, usage: aiResult.usage }), req.params.id]
    );

    res.json({ analysis: aiResult.content, model: aiResult.model, usage: aiResult.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update x-ray analysis
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { image_description, tooth_number, analysis_type, severity, status, dentist_notes } = req.body;
    const result = await db.query(
      `UPDATE xray_analyses SET image_description=$1, tooth_number=$2, analysis_type=$3, severity=$4, status=$5, dentist_notes=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [image_description, tooth_number, analysis_type, severity, status, dentist_notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete x-ray analysis
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM xray_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'X-ray analysis deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
