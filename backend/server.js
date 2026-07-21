const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

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
app.use('/api/perio-recall-readiness', require('./routes/perioRecallReadiness'));
app.use('/api/care-coordination', require('./routes/careCoordination'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generated gap routers are intentionally not mounted. Provider-specific adapters
// remain unavailable until real contracts, credentials, and conformance tests exist.

// === Custom Practice Views (mounted before 404 fallthrough) ===
app.use('/api/custom-views', require('./routes/customViews'));

// 404 fallback for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

app.listen(PORT, () => {
  console.log(`🦷 Dental Practice API running on port ${PORT}`);
  console.log(`   CORS allowlist: ${corsOrigins.join(', ')}`);
});
