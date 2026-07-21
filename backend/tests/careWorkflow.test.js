const test = require('node:test');
const assert = require('node:assert/strict');
const { validateIntake, assertTransition } = require('../domain/careWorkflow');

test('intake requires an idempotency boundary', () => {
  assert.throws(() => validateIntake({ patientId: 1, reason: 'exam' }), /idempotencyKey/);
  assert.equal(validateIntake({ patientId: 1, reason: 'exam', idempotencyKey: 'intake:0001' }).patientId, 1);
});

test('scheduling requires consent and treatment requires professional approval', () => {
  assert.throws(() => assertTransition('consent_pending', 'scheduled', {}), /consent/);
  assert.throws(() => assertTransition('clinical_review', 'treatment_approved', { role: 'assistant' }), /clinical/);
  assert.equal(assertTransition('clinical_review', 'treatment_approved', { role: 'dentist', approvalNote: 'Reviewed chart' }), true);
});
