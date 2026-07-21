ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE TABLE IF NOT EXISTS care_workflows (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, patient_id BIGINT NOT NULL,
  reason TEXT NOT NULL, idempotency_key TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'intake',
  created_by BIGINT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,idempotency_key), CHECK (state IN ('intake','consent_pending','scheduled','encounter_open','clinical_review','treatment_approved','claim_pending','payment_pending','follow_up','cancelled','closed'))
);
CREATE TABLE IF NOT EXISTS care_workflow_events (
  id BIGSERIAL PRIMARY KEY, workflow_id BIGINT NOT NULL REFERENCES care_workflows(id) ON DELETE RESTRICT,
  actor_id BIGINT NOT NULL, event_type TEXT NOT NULL, from_state TEXT, to_state TEXT,
  reason TEXT, evidence JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS care_workflows_tenant_state_idx ON care_workflows(tenant_id,state);
