/**
 * Custom Feature: noshow-predict
 * Appointment no-show prediction
 *
 * POST /api/ai/noshow-predict
 * Auth required. Generated as part of Custom Feature Suggestions scaffold (batch_02).
 * Integration credentials: process.env.FEATURE_NOSHOW_PREDICT_KEY
 * TODO: configure credentials
 */
const express = require('express');
const router = express.Router();
let pool = null; try { pool = require('../db'); } catch (_) { pool = null; }
const { authenticateToken: auth } = require('../middleware/auth');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const FEATURE_KEY = process.env.FEATURE_NOSHOW_PREDICT_KEY;
const SYSTEM_PROMPT = `You are an expert assistant specialized in: Appointment no-show prediction.
Respond with clear, actionable analysis. Prefer JSON when structured output is requested.`;

async function callLLM(userPayload) {
  if (!OPENROUTER_API_KEY) {
    const err = new Error('OPENROUTER_API_KEY not configured');
    err.statusCode = 503;
    throw err;
  }
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  const response = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AIDentalPracticeManager - noshow-predict',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: typeof userPayload === 'string' ? userPayload : JSON.stringify(userPayload) },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter error');
  if (!data.choices || !data.choices[0]) throw new Error('Invalid AI response');
  const content = data.choices[0].message.content;
  let parsed;
  try { parsed = JSON.parse(content); } catch (_) {
    const m = content.match(/```json\n?([\s\S]*?)\n?```/);
    try { parsed = m ? JSON.parse(m[1]) : { analysis: content }; } catch (__) { parsed = { analysis: content }; }
  }
  return { result: parsed, model: data.model || OPENROUTER_MODEL, tokens: data.usage?.total_tokens || null };
}

router.post('/noshow-predict', auth, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Request body is required' });
    }
    if (!FEATURE_KEY) res.set('X-Feature-Credentials-Missing', 'FEATURE_NOSHOW_PREDICT_KEY');
    const ai = await callLLM({ feature: 'noshow-predict', goal: 'Appointment no-show prediction', input: payload });
    try {
      if (pool && pool.query) {
        await pool.query(
          `INSERT INTO ai_results
             (endpoint, resource_type, input_summary, result, model, tokens_used, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'noshow-predict',
            'appointment',
            'Authenticated appointment no-show prediction',
            ai.result,
            ai.model,
            ai.tokens,
            req.user?.id || null,
          ]
        );
      }
    } catch (persistErr) {
      console.warn('[noshow-predict] persistence skipped:', persistErr.message);
    }
    return res.json({
      ok: true,
      feature: 'noshow-predict',
      endpoint: '/api/ai/noshow-predict',
      ai_result: ai.result,
      model: ai.model,
      tokens: ai.tokens,
      user_id: req.user?.id || null,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[noshow-predict] error:', err.message);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Internal error' });
  }
});

router.get('/noshow-predict/health', (req, res) => {
  res.json({
    feature: 'noshow-predict',
    endpoint: '/api/ai/noshow-predict',
    openrouter_configured: !!OPENROUTER_API_KEY,
    feature_key_configured: !!FEATURE_KEY,
  });
});

module.exports = router;
