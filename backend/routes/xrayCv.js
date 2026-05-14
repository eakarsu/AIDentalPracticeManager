// X-ray CV diagnostic stub.
// TOO-RISKY: real CV models for dental x-ray pathology detection require
// trained models, model weights, GPU inference, and FDA/CE consideration.
// We provide a deterministic *heuristic* response based on a simple metadata
// hash — clearly labelled as not a clinical diagnostic. To enable a real
// pipeline, set XRAY_CV_PROVIDER (e.g. "vrad" or self-hosted) and replace
// the stub.
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}

router.post('/analyze', authenticateToken, async (req, res) => {
  const { study_uid, tooth_numbers, image_id } = req.body || {};
  if (!study_uid && !image_id) {
    return res.status(400).json({ error: 'study_uid or image_id required' });
  }

  const provider = process.env.XRAY_CV_PROVIDER;
  if (!provider) {
    // Heuristic stub: deterministic findings based on input hash.
    const h = hashString(String(study_uid || image_id));
    const teeth = Array.isArray(tooth_numbers) && tooth_numbers.length ? tooth_numbers : [3, 14, 19, 30];
    const findings = teeth.map((t, idx) => {
      const score = ((h >> (idx * 3)) & 0xff) / 255;
      let label = 'no_finding';
      if (score > 0.85) label = 'caries_suspected';
      else if (score > 0.65) label = 'restoration_present';
      else if (score > 0.45) label = 'periapical_lucency';
      return { tooth: t, label, confidence: Math.round(score * 1000) / 1000 };
    });
    return res.json({
      provider: 'heuristic_stub',
      disclaimer: 'NOT a clinical diagnostic. Configure XRAY_CV_PROVIDER for a real CV backend.',
      findings,
    });
  }

  // Real provider routing would happen here.
  return res.json({ provider, findings: [], note: 'real_provider_invocation_not_implemented' });
});

module.exports = router;
