const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Perio Recall Readiness',
    summary: { patientsDue: 42, highPriority: 11, hygieneSlotsNeeded: 18, claimPrechecks: 29 },
    cohorts: [
      { label: 'Stage III/IV perio maintenance', patients: 11, targetWindow: '14 days', priority: 'high' },
      { label: 'Bleeding score above 20%', patients: 9, targetWindow: '21 days', priority: 'high' },
      { label: 'Overdue scaling and root planing follow-up', patients: 7, targetWindow: '10 days', priority: 'urgent' },
      { label: 'Insurance frequency reset this month', patients: 15, targetWindow: '30 days', priority: 'medium' }
    ],
    outreach: [
      { patient: 'Nora Ellis', lastVisit: '2026-02-18', risk: 'Stage IV, missed 3-month recall', nextStep: 'Call and reserve 90-minute hygiene slot' },
      { patient: 'Calvin Reed', lastVisit: '2026-01-09', risk: 'Bleeding score 32%', nextStep: 'Send perio maintenance reminder with benefits check' },
      { patient: 'Imani Brooks', lastVisit: '2025-12-14', risk: 'SRP follow-up incomplete', nextStep: 'Route chart to hygienist before scheduling' }
    ]
  });
});

module.exports = router;
