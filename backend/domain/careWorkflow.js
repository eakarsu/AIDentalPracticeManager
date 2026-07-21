const TRANSITIONS = Object.freeze({
  intake: ['consent_pending'],
  consent_pending: ['scheduled', 'closed'],
  scheduled: ['encounter_open', 'cancelled'],
  encounter_open: ['clinical_review'],
  clinical_review: ['treatment_approved', 'follow_up'],
  treatment_approved: ['claim_pending', 'follow_up'],
  claim_pending: ['payment_pending', 'follow_up'],
  payment_pending: ['follow_up', 'closed'],
  follow_up: ['scheduled', 'closed'],
  cancelled: ['scheduled', 'closed'],
  closed: []
});

const CLINICAL_STATES = new Set(['clinical_review', 'treatment_approved']);

function validateIntake(input) {
  if (!input || !input.patientId || !input.reason || !input.idempotencyKey) {
    throw new Error('patientId, reason, and idempotencyKey are required');
  }
  if (!/^[A-Za-z0-9:_-]{8,120}$/.test(input.idempotencyKey)) {
    throw new Error('idempotencyKey must be 8-120 safe characters');
  }
  return { patientId: Number(input.patientId), reason: String(input.reason).trim().slice(0, 2000) };
}

function assertTransition(from, to, context = {}) {
  if (!(TRANSITIONS[from] || []).includes(to)) throw new Error(`transition ${from} -> ${to} is not allowed`);
  if (to === 'scheduled' && !context.consentRecorded) throw new Error('recorded patient consent is required');
  if (CLINICAL_STATES.has(to) && !['dentist', 'clinical_admin'].includes(context.role)) {
    throw new Error('licensed clinical review role required');
  }
  if (to === 'treatment_approved' && !context.approvalNote) throw new Error('professional approval note required');
  return true;
}

module.exports = { TRANSITIONS, validateIntake, assertTransition };
