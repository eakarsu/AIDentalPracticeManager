import React, { useEffect, useState } from 'react';

function PerioRecallReadiness() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/perio-recall-readiness', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <div className="page"><h1>Perio Recall Readiness</h1><p>Loading recall readiness...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Perio Recall Readiness</h1>
        <p>Prioritize periodontal maintenance outreach by clinical urgency, benefits timing, and hygiene capacity.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><h3>{data.summary.patientsDue}</h3><p>Patients Due</p></div>
        <div className="stat-card"><h3>{data.summary.highPriority}</h3><p>High Priority</p></div>
        <div className="stat-card"><h3>{data.summary.hygieneSlotsNeeded}</h3><p>Hygiene Slots Needed</p></div>
        <div className="stat-card"><h3>{data.summary.claimPrechecks}</h3><p>Claim Prechecks</p></div>
      </div>
      <div className="content-grid">
        <section className="card">
          <h2>Recall Cohorts</h2>
          {data.cohorts.map((cohort) => (
            <div className="list-item" key={cohort.label}>
              <strong>{cohort.label}</strong>
              <span>{cohort.patients} patients - {cohort.targetWindow} - {cohort.priority}</span>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Outreach Queue</h2>
          {data.outreach.map((item) => (
            <div className="list-item" key={item.patient}>
              <strong>{item.patient}</strong>
              <span>{item.risk}</span>
              <small>{item.nextStep}</small>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default PerioRecallReadiness;
