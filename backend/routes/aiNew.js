const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const { parseAIJson } = require('../services/parseAIJson');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Ensure ai_results JSONB persistence table exists
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id INTEGER,
        input_summary TEXT,
        result JSONB NOT NULL,
        model VARCHAR(200),
        tokens_used INTEGER,
        user_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('ai_results table init error:', e.message);
  }
})();

async function persistAIResult({ endpoint, resource_type, resource_id, input_summary, result, model, tokens_used, user_id }) {
  try {
    await db.query(
      `INSERT INTO ai_results (endpoint, resource_type, resource_id, input_summary, result, model, tokens_used, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [endpoint, resource_type || null, resource_id || null, input_summary || null, result, model || null, tokens_used || null, user_id || null]
    );
  } catch (err) {
    console.error('persistAIResult error:', err.message);
  }
}

// POST /api/ai/insurance-preauth
// Accepts: { treatment_id }
// Returns pre-authorization likelihood assessment
router.post('/insurance-preauth', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { treatment_id } = req.body;
    if (!treatment_id) return res.status(400).json({ error: 'Missing required field: treatment_id' });

    const treatmentResult = await db.query(`
      SELECT t.*, p.first_name, p.last_name, p.date_of_birth, p.insurance_provider,
             p.insurance_id, p.medical_history, p.allergies
      FROM treatment_plans t
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = $1
    `, [treatment_id]);

    if (treatmentResult.rows.length === 0) return res.status(404).json({ error: 'Treatment plan not found' });
    const treatment = treatmentResult.rows[0];

    const age = treatment.date_of_birth
      ? Math.floor((Date.now() - new Date(treatment.date_of_birth)) / 31557600000)
      : 'Unknown';

    const prompt = `Assess the insurance pre-authorization likelihood for this dental treatment:

Patient: ${treatment.first_name} ${treatment.last_name}, Age: ${age}
Insurance Provider: ${treatment.insurance_provider || 'Unknown'}
Insurance ID: ${treatment.insurance_id || 'Not provided'}
Medical History: ${treatment.medical_history || 'None'}
Allergies: ${treatment.allergies || 'None'}

Treatment Plan:
- Diagnosis: ${treatment.diagnosis}
- Description: ${treatment.treatment_description}
- Procedures: ${treatment.procedures}
- Estimated Cost: $${treatment.estimated_cost || 'Not specified'}
- Priority: ${treatment.priority}

Provide a pre-authorization assessment. Return JSON:
{
  "coverage_likelihood": "high|moderate|low",
  "likelihood_percentage": 75,
  "flags": ["list of potential coverage concerns"],
  "supporting_docs_needed": ["list of required documentation"],
  "billing_codes": ["relevant CDT codes if applicable"],
  "appeal_strategy": "if coverage is likely denied, strategy to appeal",
  "estimated_patient_responsibility": "estimated out-of-pocket amount or percentage",
  "recommendation": "next steps to maximize coverage approval"
}`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are an expert dental insurance billing and pre-authorization specialist. Provide accurate, actionable pre-auth assessments based on standard dental insurance practices.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'insurance-preauth',
      resource_type: 'treatment_plan',
      resource_id: treatment_id,
      input_summary: `Pre-auth for ${treatment.first_name} ${treatment.last_name} — ${treatment.diagnosis}`,
      result: parsed,
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      treatment_id,
      patient: { name: `${treatment.first_name} ${treatment.last_name}`, insurance: treatment.insurance_provider },
      preauth_assessment: parsed,
      model: aiResult.model,
      usage: aiResult.usage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/treatment-plan-summary
// Accepts: { patient_id }
// Returns patient-friendly summary of complete treatment plan
router.post('/treatment-plan-summary', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { patient_id } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Missing required field: patient_id' });

    const patientResult = await db.query(
      'SELECT first_name, last_name, date_of_birth, medical_history, allergies FROM patients WHERE id = $1',
      [patient_id]
    );
    if (patientResult.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientResult.rows[0];

    const treatments = await db.query(`
      SELECT diagnosis, treatment_description, procedures, estimated_cost,
             priority, status, start_date, end_date, notes, ai_recommendation
      FROM treatment_plans
      WHERE patient_id = $1
      ORDER BY created_at DESC
    `, [patient_id]);

    if (treatments.rows.length === 0) {
      return res.status(404).json({ error: 'No treatment plans found for this patient' });
    }

    const totalCost = treatments.rows.reduce((sum, t) => sum + (parseFloat(t.estimated_cost) || 0), 0);
    const age = patient.date_of_birth
      ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / 31557600000)
      : 'Unknown';

    const prompt = `Create a patient-friendly summary of this dental patient's complete treatment plan.
The summary should be easy to understand (avoid jargon), reassuring, and actionable.

Patient: ${patient.first_name} ${patient.last_name}, Age: ${age}
Medical History: ${patient.medical_history || 'None'}

Treatment Plans (${treatments.rows.length} total, estimated total: $${totalCost.toFixed(2)}):
${JSON.stringify(treatments.rows, null, 2)}

Return JSON:
{
  "greeting": "personalized opening sentence",
  "overview": "2-3 sentence plain-English overview of overall dental health and treatment needs",
  "treatments": [
    {
      "name": "friendly name for procedure",
      "why_needed": "plain English explanation",
      "what_to_expect": "brief description of the experience",
      "priority": "immediate|soon|routine",
      "estimated_cost": "$X"
    }
  ],
  "next_step": "clear single call to action",
  "timeline_summary": "overall treatment timeline in plain English",
  "reassurance": "empathetic closing note"
}`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a patient communication specialist at a dental practice. Create warm, clear, non-intimidating treatment summaries that help patients understand and commit to their care.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'treatment-plan-summary',
      resource_type: 'patient',
      resource_id: patient_id,
      input_summary: `Treatment summary for ${patient.first_name} ${patient.last_name} (${treatments.rows.length} plans)`,
      result: parsed,
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      patient: { id: patient_id, name: `${patient.first_name} ${patient.last_name}` },
      treatment_count: treatments.rows.length,
      total_estimated_cost: totalCost.toFixed(2),
      patient_summary: parsed,
      model: aiResult.model,
      usage: aiResult.usage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/practice-insights
// Accepts: { date_range: { start, end } }
// Returns practice performance insights
router.post('/practice-insights', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { date_range } = req.body;
    const startDate = date_range?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = date_range?.end || new Date().toISOString();

    const [appointments, billing, treatments, patientStats] = await Promise.all([
      db.query(`
        SELECT
          TO_CHAR(appointment_date, 'Day') as day_of_week,
          appointment_type,
          status,
          COUNT(*) as count,
          AVG(duration_minutes) as avg_duration
        FROM appointments
        WHERE appointment_date BETWEEN $1 AND $2
        GROUP BY day_of_week, appointment_type, status
        ORDER BY count DESC
      `, [startDate, endDate]),

      db.query(`
        SELECT
          billing_type,
          status,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM billing
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY billing_type, status
        ORDER BY total_amount DESC
      `, [startDate, endDate]).catch(() => ({ rows: [] })),

      db.query(`
        SELECT
          diagnosis,
          priority,
          status,
          COUNT(*) as count,
          SUM(estimated_cost) as total_value
        FROM treatment_plans
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY diagnosis, priority, status
        ORDER BY count DESC
        LIMIT 20
      `, [startDate, endDate]),

      db.query(`
        SELECT
          COUNT(DISTINCT id) as new_patients
        FROM patients
        WHERE created_at BETWEEN $1 AND $2
      `, [startDate, endDate])
    ]);

    const prompt = `Analyze this dental practice performance data for the period ${startDate} to ${endDate}.

Appointment Statistics: ${JSON.stringify(appointments.rows, null, 2)}
Billing Data: ${JSON.stringify(billing.rows, null, 2)}
Treatment Plan Data: ${JSON.stringify(treatments.rows, null, 2)}
New Patients: ${patientStats.rows[0]?.new_patients || 0}

Return comprehensive practice insights as JSON:
{
  "executive_summary": "2-3 sentence overview of practice performance",
  "busiest_days": ["ranked list of busiest days with appointment counts"],
  "top_procedures": ["most common procedures with revenue contribution"],
  "revenue_insights": {
    "total_billed": N,
    "collection_rate": "X%",
    "top_revenue_treatments": ["list"]
  },
  "patient_retention": {
    "new_patients": N,
    "insights": "retention analysis"
  },
  "scheduling_efficiency": "analysis of schedule utilization and no-shows",
  "growth_opportunities": ["3-5 specific actionable recommendations"],
  "alerts": ["any concerning trends that need attention"]
}`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a dental practice management consultant. Provide actionable, data-driven insights to help the practice improve efficiency and revenue.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'practice-insights',
      resource_type: 'practice',
      input_summary: `Practice insights ${startDate} → ${endDate}`,
      result: parsed,
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      date_range: { start: startDate, end: endDate },
      raw_stats: {
        appointments: appointments.rows.length,
        billing_records: billing.rows.length,
        treatment_plans: treatments.rows.length
      },
      insights: parsed,
      model: aiResult.model,
      usage: aiResult.usage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/predict-no-show
// Audit recommendation: stateless no-show prediction.
router.post('/predict-no-show', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { patient_profile, appointment_details } = req.body;
    if (!patient_profile || !appointment_details) {
      return res.status(400).json({ error: 'patient_profile and appointment_details are required' });
    }

    const prompt = `Predict the no-show probability for this dental appointment.

PATIENT PROFILE:
${typeof patient_profile === 'string' ? patient_profile : JSON.stringify(patient_profile, null, 2)}

APPOINTMENT DETAILS:
${typeof appointment_details === 'string' ? appointment_details : JSON.stringify(appointment_details, null, 2)}

Return JSON: { probability (0-1), confidence ("low"|"medium"|"high"), top_factors: [], recommendations: [] }`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a dental practice scheduling analyst. Estimate appointment no-show probability based on patient and appointment data. Be conservative when data is sparse.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'predict-no-show',
      resource_type: 'appointment',
      input_summary: 'predict-no-show stateless',
      result: parsed || { raw: aiResult.content },
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      prediction: parsed || { raw: aiResult.content },
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/identify-recall-candidates
// Audit recommendation: stateless recall-candidate identification.
router.post('/identify-recall-candidates', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { patient_list, recall_criteria } = req.body;
    if (!patient_list || !Array.isArray(patient_list) || patient_list.length === 0) {
      return res.status(400).json({ error: 'patient_list (non-empty array) is required' });
    }

    const prompt = `From the following patients, identify the best candidates for a recall campaign${recall_criteria ? ` using these criteria: ${typeof recall_criteria === 'string' ? recall_criteria : JSON.stringify(recall_criteria)}` : ''}.

PATIENTS:
${JSON.stringify(patient_list, null, 2)}

Return JSON: { candidates: [{ patient_id, name, score (0-100), reasons: [] }], excluded: [{ patient_id, reason }], summary }`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a dental recall campaign analyst. Identify recall candidates using last-visit recency, treatment history, and risk factors.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'identify-recall-candidates',
      resource_type: 'recall',
      input_summary: `recall candidates from ${patient_list.length} patients`,
      result: parsed || { raw: aiResult.content },
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      recall_candidates: parsed || { raw: aiResult.content },
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/predict-treatment-outcome
// Audit recommendation: stateless treatment outcome prediction.
router.post('/predict-treatment-outcome', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'AI provider not configured' });
    const { patient_profile, treatment_plan } = req.body;
    if (!patient_profile || !treatment_plan) {
      return res.status(400).json({ error: 'patient_profile and treatment_plan are required' });
    }

    const prompt = `Predict the clinical outcome for this dental treatment.

PATIENT PROFILE:
${typeof patient_profile === 'string' ? patient_profile : JSON.stringify(patient_profile, null, 2)}

TREATMENT PLAN:
${typeof treatment_plan === 'string' ? treatment_plan : JSON.stringify(treatment_plan, null, 2)}

Return JSON: { success_probability (0-1), expected_recovery_weeks, risk_factors: [], complications_to_watch: [], post_op_recommendations: [], confidence ("low"|"medium"|"high") }`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a dental clinical analyst. Predict treatment outcomes conservatively from patient and plan data.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'predict-treatment-outcome',
      resource_type: 'treatment_plan',
      input_summary: 'predict-treatment-outcome stateless',
      result: parsed || { raw: aiResult.content },
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      prediction: parsed || { raw: aiResult.content },
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/patient-risk-scoring
// Audit recommendation: stateless patient risk scoring.
router.post('/patient-risk-scoring', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'AI provider not configured' });
    const { patient_profile, history } = req.body;
    if (!patient_profile) {
      return res.status(400).json({ error: 'patient_profile is required' });
    }

    const prompt = `Stratify dental risk for the following patient.

PATIENT PROFILE:
${typeof patient_profile === 'string' ? patient_profile : JSON.stringify(patient_profile, null, 2)}

HISTORY:
${history ? (typeof history === 'string' ? history : JSON.stringify(history, null, 2)) : 'No additional history provided.'}

Return JSON: { risk_score (0-100), risk_tier ("low"|"moderate"|"high"|"very_high"), top_drivers: [], preventive_recommendations: [], recall_interval_months }`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a dental risk-stratification analyst. Score caries, periodontal, oral cancer, and adherence risks together.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'patient-risk-scoring',
      resource_type: 'patient',
      input_summary: 'patient-risk-scoring stateless',
      result: parsed || { raw: aiResult.content },
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      risk_assessment: parsed || { raw: aiResult.content },
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/optimize-scheduling
// Audit recommendation: stateless schedule optimization helper.
router.post('/optimize-scheduling', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'AI provider not configured' });
    const { current_schedule, constraints } = req.body;
    if (!current_schedule) {
      return res.status(400).json({ error: 'current_schedule is required' });
    }

    const prompt = `Suggest schedule optimizations for this dental practice day/week.

CURRENT SCHEDULE:
${typeof current_schedule === 'string' ? current_schedule : JSON.stringify(current_schedule, null, 2)}

CONSTRAINTS:
${constraints ? (typeof constraints === 'string' ? constraints : JSON.stringify(constraints, null, 2)) : 'None provided.'}

Return JSON: { optimized_changes: [{ from, to, reason }], utilization_estimate_pct, idle_gaps_minutes, double_booking_risks: [], recommendations: [] }`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a dental scheduling optimizer. Reduce idle gaps, balance provider load, and respect appointment durations.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'optimize-scheduling',
      resource_type: 'schedule',
      input_summary: 'optimize-scheduling stateless',
      result: parsed || { raw: aiResult.content },
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      optimization: parsed || { raw: aiResult.content },
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/insurance-claim-optimization
// Audit recommendation: stateless claim-optimization helper.
router.post('/insurance-claim-optimization', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'AI provider not configured' });
    const { claim, patient_context } = req.body;
    if (!claim) {
      return res.status(400).json({ error: 'claim is required' });
    }

    const prompt = `Review and optimize this dental insurance claim for higher acceptance.

CLAIM:
${typeof claim === 'string' ? claim : JSON.stringify(claim, null, 2)}

PATIENT CONTEXT:
${patient_context ? (typeof patient_context === 'string' ? patient_context : JSON.stringify(patient_context, null, 2)) : 'None provided.'}

Return JSON: { issues: [], recommended_codes: [], narrative_suggestions: [], attachments_needed: [], denial_risk ("low"|"moderate"|"high"), expected_acceptance_pct }`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a dental insurance claim optimization specialist. Use standard CDT coding and improve narratives.'
    );

    const parsed = parseAIJson(aiResult.content);

    persistAIResult({
      endpoint: 'insurance-claim-optimization',
      resource_type: 'claim',
      input_summary: 'insurance-claim-optimization stateless',
      result: parsed || { raw: aiResult.content },
      model: aiResult.model,
      tokens_used: aiResult.usage?.total_tokens,
      user_id: req.user?.id,
    });

    res.json({
      optimization: parsed || { raw: aiResult.content },
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/history — paginated list of AI results (optional filters: endpoint, resource_type, resource_id)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { endpoint, resource_type, resource_id } = req.query;
    const conditions = [];
    const params = [];
    if (endpoint) { params.push(endpoint); conditions.push(`endpoint = $${params.length}`); }
    if (resource_type) { params.push(resource_type); conditions.push(`resource_type = $${params.length}`); }
    if (resource_id) { params.push(resource_id); conditions.push(`resource_id = $${params.length}`); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM ai_results ${whereClause}`;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].total);

    const dataParams = [...params, limit, offset];
    const dataSql = `SELECT * FROM ai_results ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const result = await db.query(dataSql, dataParams);

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
