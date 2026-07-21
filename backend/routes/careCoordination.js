const router = require('express').Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { validateIntake, assertTransition } = require('../domain/careWorkflow');

router.use(authenticateToken);

function tenant(req) {
  const value = req.user.tenantId || req.user.tenant_id;
  if (!value) { const error = new Error('tenant-bound identity required'); error.status = 403; throw error; }
  return String(value);
}

router.post('/cases', async (req, res) => {
  try {
    const input = validateIntake(req.body);
    const result = await db.query(
      `INSERT INTO care_workflows (tenant_id, patient_id, reason, idempotency_key, state, created_by)
       VALUES ($1,$2,$3,$4,'intake',$5)
       ON CONFLICT (tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
       RETURNING *`, [tenant(req), input.patientId, input.reason, req.body.idempotencyKey, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});

router.get('/cases/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT w.*, COALESCE(json_agg(e ORDER BY e.created_at) FILTER (WHERE e.id IS NOT NULL),'[]') events
       FROM care_workflows w LEFT JOIN care_workflow_events e ON e.workflow_id=w.id
       WHERE w.id=$1 AND w.tenant_id=$2 GROUP BY w.id`, [req.params.id, tenant(req)]);
    if (!result.rows[0]) return res.status(404).json({ error: 'care workflow not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.post('/cases/:id/transition', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM care_workflows WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
    if (!current.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'care workflow not found' }); }
    assertTransition(current.rows[0].state, req.body.to, { ...req.body, role: req.user.role });
    const updated = await client.query('UPDATE care_workflows SET state=$1, version=version+1, updated_at=NOW() WHERE id=$2 RETURNING *', [req.body.to, req.params.id]);
    await client.query(`INSERT INTO care_workflow_events (workflow_id,actor_id,event_type,from_state,to_state,reason,evidence)
      VALUES ($1,$2,'transition',$3,$4,$5,$6)`, [req.params.id, req.user.id, current.rows[0].state, req.body.to, req.body.reason || null, req.body.evidence || {}]);
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); res.status(error.status || 409).json({ error: error.message }); }
  finally { client.release(); }
});

module.exports = router;
