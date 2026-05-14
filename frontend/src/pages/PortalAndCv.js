import React, { useState } from 'react';
import api from '../services/api';

export default function PortalAndCv() {
  const [tab, setTab] = useState('portal');
  return (
    <div style={{ padding: 24 }}>
      <h2>Portal & X-ray CV</h2>
      <div style={{ marginBottom: 12 }}>
        {['portal', 'messages', 'xrayCv'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 12px',
              marginRight: 6,
              background: tab === t ? '#1976d2' : '#fff',
              color: tab === t ? 'white' : '#1976d2',
              border: '1px solid #1976d2',
              borderRadius: 4,
            }}
          >
            {t === 'portal' ? 'Patient Summary' : t === 'messages' ? 'Secure Messaging' : 'X-ray CV (heuristic)'}
          </button>
        ))}
      </div>
      {tab === 'portal' && <PortalTab />}
      {tab === 'messages' && <MessagesTab />}
      {tab === 'xrayCv' && <XrayCvTab />}
    </div>
  );
}

function PortalTab() {
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const r = await api.get('/portal/my-summary');
      setOut(r.data);
    } catch (e) {
      setOut({ error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <button onClick={fetchSummary} disabled={loading} style={{ padding: '6px 12px' }}>
        {loading ? 'Loading…' : 'Load My Summary'}
      </button>
      {out && <pre style={{ background: '#f5f5f5', padding: 12, marginTop: 12, borderRadius: 4 }}>{JSON.stringify(out, null, 2)}</pre>}
    </div>
  );
}

function MessagesTab() {
  const [body, setBody] = useState('Hello from the portal.');
  const [subject, setSubject] = useState('Welcome');
  const [patientId, setPatientId] = useState('1');
  const [out, setOut] = useState(null);
  const [list, setList] = useState([]);

  const send = async () => {
    try {
      const r = await api.post('/portal/messages', { patient_id: Number(patientId), subject, body });
      setOut(r.data);
    } catch (e) {
      setOut({ error: e.response?.data?.error || e.message });
    }
  };
  const load = async () => {
    try {
      const r = await api.get(`/portal/messages?patient_id=${patientId}`);
      setList(r.data.messages || []);
    } catch (e) {
      setList([]);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
        <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="patient id" />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="subject" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        <div>
          <button onClick={send} style={{ padding: '6px 12px' }}>Send</button>
          <button onClick={load} style={{ padding: '6px 12px', marginLeft: 8 }}>Load thread</button>
        </div>
      </div>
      {out && <pre style={{ background: '#f5f5f5', padding: 8, marginTop: 12, borderRadius: 4 }}>{JSON.stringify(out, null, 2)}</pre>}
      {list.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h4>Messages</h4>
          {list.map((m) => (
            <div key={m.id} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{m.author_role} — {new Date(m.created_at).toLocaleString()}</div>
              <div><strong>{m.subject}</strong></div>
              <div>{m.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function XrayCvTab() {
  const [studyUid, setStudyUid] = useState('1.2.840.113619.2.55.999');
  const [teeth, setTeeth] = useState('3,14,19,30');
  const [out, setOut] = useState(null);
  const run = async () => {
    try {
      const r = await api.post('/xray-cv/analyze', {
        study_uid: studyUid,
        tooth_numbers: teeth.split(',').map((x) => Number(x.trim())).filter(Boolean),
      });
      setOut(r.data);
    } catch (e) {
      setOut({ error: e.response?.data?.error || e.message });
    }
  };
  return (
    <div>
      <p style={{ fontSize: 12, color: '#666' }}>
        Heuristic stub — NOT a clinical diagnostic. Configure XRAY_CV_PROVIDER for a real CV pipeline.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
        <input value={studyUid} onChange={(e) => setStudyUid(e.target.value)} placeholder="study UID" />
        <input value={teeth} onChange={(e) => setTeeth(e.target.value)} placeholder="tooth numbers (comma)" />
        <div>
          <button onClick={run} style={{ padding: '6px 12px' }}>Analyze</button>
        </div>
      </div>
      {out && <pre style={{ background: '#f5f5f5', padding: 8, marginTop: 12, borderRadius: 4 }}>{JSON.stringify(out, null, 2)}</pre>}
    </div>
  );
}
