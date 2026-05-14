// External integrations for the dental PM.
// Each route checks for required env vars and returns HTTP 503 with
// {error, missing} when any are absent. Real API calls are stubbed —
// real production calls would go to the documented vendor endpoints.
//
// Required env vars by integration:
//   Dentrix: DENTRIX_API_KEY, DENTRIX_PRACTICE_ID
//   Open Dental: OPENDENTAL_API_KEY, OPENDENTAL_BASE_URL
//   Eaglesoft: EAGLESOFT_API_KEY, EAGLESOFT_PRACTICE_ID
//   PACS DICOM: PACS_BASE_URL, PACS_AE_TITLE
//   Eligible: ELIGIBLE_API_KEY
//   Change Healthcare: CHC_API_KEY, CHC_TRADING_PARTNER_ID
//   Twilio SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function require503(envVars) {
  const missing = envVars.filter((v) => !process.env[v]);
  return missing.length > 0 ? missing : null;
}

router.post('/dentrix/sync', authenticateToken, async (req, res) => {
  const missing = require503(['DENTRIX_API_KEY', 'DENTRIX_PRACTICE_ID']);
  if (missing) {
    return res.status(503).json({
      error: 'Dentrix not configured',
      missing: missing.join(', '),
      configure: 'Set Dentrix env vars to enable PMS sync.',
    });
  }
  return res.json({ ok: true, provider: 'dentrix', simulated: true, payload: req.body || {} });
});

router.post('/opendental/sync', authenticateToken, async (req, res) => {
  const missing = require503(['OPENDENTAL_API_KEY', 'OPENDENTAL_BASE_URL']);
  if (missing) {
    return res.status(503).json({
      error: 'Open Dental not configured',
      missing: missing.join(', '),
      configure: 'Set Open Dental env vars to enable PMS sync.',
    });
  }
  return res.json({ ok: true, provider: 'opendental', simulated: true, payload: req.body || {} });
});

router.post('/eaglesoft/sync', authenticateToken, async (req, res) => {
  const missing = require503(['EAGLESOFT_API_KEY', 'EAGLESOFT_PRACTICE_ID']);
  if (missing) {
    return res.status(503).json({
      error: 'Eaglesoft not configured',
      missing: missing.join(', '),
      configure: 'Set Eaglesoft env vars to enable PMS sync.',
    });
  }
  return res.json({ ok: true, provider: 'eaglesoft', simulated: true, payload: req.body || {} });
});

router.post('/pacs/study', authenticateToken, async (req, res) => {
  const missing = require503(['PACS_BASE_URL', 'PACS_AE_TITLE']);
  if (missing) {
    return res.status(503).json({
      error: 'PACS not configured',
      missing: missing.join(', '),
      configure: 'Set PACS env vars to enable DICOM study fetch.',
    });
  }
  const { study_uid } = req.body || {};
  if (!study_uid) return res.status(400).json({ error: 'study_uid required' });
  return res.json({ ok: true, provider: 'pacs', study_uid, instances: [], simulated: true });
});

router.post('/eligibility/eligible', authenticateToken, async (req, res) => {
  const missing = require503(['ELIGIBLE_API_KEY']);
  if (missing) {
    return res.status(503).json({
      error: 'Eligible not configured',
      missing: missing.join(', '),
      configure: 'Set ELIGIBLE_API_KEY to enable eligibility checks.',
    });
  }
  const { member_id } = req.body || {};
  if (!member_id) return res.status(400).json({ error: 'member_id required' });
  return res.json({ ok: true, provider: 'eligible', member_id, eligible: true, simulated: true });
});

router.post('/eligibility/change-healthcare', authenticateToken, async (req, res) => {
  const missing = require503(['CHC_API_KEY', 'CHC_TRADING_PARTNER_ID']);
  if (missing) {
    return res.status(503).json({
      error: 'Change Healthcare not configured',
      missing: missing.join(', '),
      configure: 'Set CHC env vars to enable eligibility checks.',
    });
  }
  const { member_id } = req.body || {};
  if (!member_id) return res.status(400).json({ error: 'member_id required' });
  return res.json({ ok: true, provider: 'change-healthcare', member_id, eligible: true, simulated: true });
});

router.post('/sms/twilio', authenticateToken, async (req, res) => {
  const missing = require503(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER']);
  if (missing) {
    return res.status(503).json({
      error: 'Twilio not configured',
      missing: missing.join(', '),
      configure: 'Set Twilio env vars to enable SMS.',
    });
  }
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });
  return res.json({ ok: true, provider: 'twilio', to, simulated: true });
});

module.exports = router;
