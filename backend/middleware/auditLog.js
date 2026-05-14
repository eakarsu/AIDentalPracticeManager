const db = require('../db');

// Ensure patient_access_log table exists
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_access_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        patient_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL DEFAULT 'view',
        ip_address VARCHAR(45),
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('patient_access_log table init error:', e.message);
  }
})();

// Middleware to log patient record access (HIPAA requirement)
function logPatientAccess(req, res, next) {
  const patientId = req.params.id;
  const userId = req.user ? req.user.id : null;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // Fire-and-forget log insert — do not block the request
  db.query(
    'INSERT INTO patient_access_log (user_id, patient_id, action, ip_address) VALUES ($1, $2, $3, $4)',
    [userId, patientId, 'view', ip]
  ).catch(err => console.error('Audit log insert error:', err.message));

  next();
}

module.exports = { logPatientAccess };
