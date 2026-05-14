import React, { useState } from 'react';
import api from '../services/api';

const INTEGRATIONS = [
  { key: 'dentrix', label: 'Dentrix PMS', endpoint: '/integrations/dentrix/sync', body: { practice_id: 1 } },
  { key: 'opendental', label: 'Open Dental PMS', endpoint: '/integrations/opendental/sync', body: { practice_id: 1 } },
  { key: 'eaglesoft', label: 'Eaglesoft PMS', endpoint: '/integrations/eaglesoft/sync', body: { practice_id: 1 } },
  { key: 'pacs', label: 'PACS DICOM Study', endpoint: '/integrations/pacs/study', body: { study_uid: '1.2.3.4' } },
  { key: 'eligible', label: 'Insurance — Eligible', endpoint: '/integrations/eligibility/eligible', body: { member_id: 'M0001' } },
  { key: 'chc', label: 'Insurance — Change Healthcare', endpoint: '/integrations/eligibility/change-healthcare', body: { member_id: 'M0001' } },
  { key: 'twilio', label: 'Twilio SMS Reminder', endpoint: '/integrations/sms/twilio', body: { to: '+15555550100', message: 'Reminder' } },
];

export default function Integrations() {
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState({});

  const test = async (i) => {
    setBusy({ ...busy, [i.key]: true });
    try {
      const r = await api.post(i.endpoint, i.body);
      setResults({ ...results, [i.key]: { ok: true, data: r.data } });
    } catch (e) {
      setResults({ ...results, [i.key]: { ok: false, status: e.response?.status, data: e.response?.data || { error: e.message } } });
    } finally {
      setBusy({ ...busy, [i.key]: false });
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Integrations</h2>
      <p style={{ color: '#666' }}>Each integration returns HTTP 503 with a "Configure" message until the relevant env vars are set.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {INTEGRATIONS.map((i) => {
          const r = results[i.key];
          return (
            <div key={i.key} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, background: 'white' }}>
              <div style={{ fontWeight: 600 }}>{i.label}</div>
              <button onClick={() => test(i)} disabled={busy[i.key]} style={{ marginTop: 8, padding: '6px 12px' }}>
                {busy[i.key] ? 'Testing…' : 'Test connection'}
              </button>
              {r && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  {r.status === 503 ? (
                    <div style={{ background: '#fff8e1', border: '1px solid #ffb74d', padding: 8, borderRadius: 4 }}>
                      <div style={{ fontWeight: 600 }}>Configure {i.label}</div>
                      <div>Missing: <code>{r.data?.missing}</code></div>
                      <div>{r.data?.configure}</div>
                    </div>
                  ) : (
                    <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, overflow: 'auto' }}>{JSON.stringify(r.data, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
