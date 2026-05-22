import React, { useState } from 'react';
import api from '../services/api';

function TreatmentPlanPdfView() {
  const [planId, setPlanId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const generate = async () => {
    setLoading(true); setErr(null);
    try {
      const q = planId ? `?plan_id=${encodeURIComponent(planId)}` : '';
      const r = await api.get(`/custom-views/treatment-plan-pdf${q}`);
      setData(r.data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const download = () => {
    if (!data) return;
    const blob = new Blob([data.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = data.filename || 'treatment_plan.html';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    if (!data) return;
    const w = window.open('', '_blank');
    if (w) { w.document.write(data.html); w.document.close(); w.focus(); w.print(); }
  };

  return (
    <div data-testid="treatment-plan-pdf-view" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#1e3a8a' }}>📄 Treatment Plan PDF Export</h3>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="text" placeholder="Plan ID (optional)" value={planId} onChange={(e) => setPlanId(e.target.value)} style={{ flex: 1, padding: 6, border: '1px solid #d1d5db', borderRadius: 4 }} />
        <button onClick={generate} disabled={loading} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>
          {loading ? 'Generating…' : 'Generate PDF Doc'}
        </button>
      </div>
      {err && <div style={{ color: '#b91c1c' }}>Error: {err}</div>}
      {data && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={download} style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>⬇ Download</button>
            <button onClick={print} style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>🖨 Print</button>
            <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>Patient: <b>{data.patient?.name}</b>  ·  Subtotal: ${data.subtotal?.toFixed(2)}</span>
          </div>
          <iframe title="treatment-plan-preview" srcDoc={data.html} style={{ width: '100%', height: 480, border: '1px solid #e5e7eb', borderRadius: 4 }} />
        </div>
      )}
    </div>
  );
}

export default TreatmentPlanPdfView;
