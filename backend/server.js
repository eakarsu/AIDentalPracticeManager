const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // disabled for dev API
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — allowlist from env (comma-separated). Defaults to localhost:3000.
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin requests (curl, server-to-server)
    if (!origin) return cb(null, true);
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/xrays', require('./routes/xrays'));
app.use('/api/treatments', require('./routes/treatments'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/scheduling', require('./routes/scheduling'));
app.use('/api/recalls', require('./routes/recalls'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/ai', require('./routes/aiNew'));





app.use('/api/ai', require('./routes/claimAutomation'));
app.use('/api/ai', require('./routes/noshowPredict'));
app.use('/api/ai', require('./routes/outcomePredict'));
app.use('/api/ai', require('./routes/riskStratify'));
app.use('/api/ai', require('./routes/xrayDiagnostics'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/xray-cv', require('./routes/xrayCv'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-xraycv-lacks-ai-diagnosis-endpoint-diagnose-from-xray', require('./routes/gap_xraycv_lacks_ai_diagnosis_endpoint_diagnose_from_xray'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-missing-predict-treatment-outcome-identify-recall-candidates', require('./routes/gap_missing_predict_treatment_outcome_identify_recall_candidates'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-pacs-integration-only-integrations-js-stub', require('./routes/gap_limited_pacs_integration_only_integrations_js_stub'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-intraoral-camera-integration', require('./routes/gap_no_intraoral_camera_integration'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-electronic-health-records-ehr-compliance-layer', require('./routes/gap_no_electronic_health_records_ehr_compliance_layer'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-patient-portal-is-scaffolded-but-reminder-system-incomplete', require('./routes/gap_patient_portal_is_scaffolded_but_reminder_system_incomplete'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-insurance-eligibility-verification-adapter', require('./routes/gap_no_insurance_eligibility_verification_adapter'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-webhooks', require('./routes/gap_no_webhooks'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-calendar-integration-despite-scheduling', require('./routes/gap_no_calendar_integration_despite_scheduling'));

// === Custom Practice Views (mounted before 404 fallthrough) ===
app.use('/api/custom-views', require('./routes/customViews'));

// 404 fallback for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

app.listen(PORT, () => {
  console.log(`🦷 Dental Practice API running on port ${PORT}`);
  console.log(`   CORS allowlist: ${corsOrigins.join(', ')}`);
});
