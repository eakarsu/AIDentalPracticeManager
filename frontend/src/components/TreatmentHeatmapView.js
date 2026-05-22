import React, { useEffect, useState } from 'react';
import api from '../services/api';

function TreatmentHeatmapView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await api.get('/custom-views/treatment-heatmap');
      setData(r.data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const colorFor = (v, max) => {
    if (!max || v === 0) return '#f3f4f6';
    const intensity = v / max;
    const r = Math.round(220 - intensity * 180);
    const g = Math.round(240 - intensity * 200);
    const b = 255;
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div data-testid="treatment-heatmap-view" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#1e3a8a' }}>🔥 Treatment Type Heatmap (90 days)</h3>
        <button onClick={load} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>Refresh</button>
      </div>
      {loading && <div>Loading heatmap…</div>}
      {err && <div style={{ color: '#b91c1c' }}>Error: {err}</div>}
      {data && (
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            {data.total_appointments} appointments  ·  max cell: {data.max}
          </div>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ padding: 6, textAlign: 'left', fontSize: 12, color: '#374151' }}>Treatment Type</th>
                {data.days.map(d => (
                  <th key={d} style={{ padding: 6, fontSize: 12, color: '#374151', textAlign: 'center' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.types.map(t => (
                <tr key={t}>
                  <td style={{ padding: 6, fontSize: 13, fontWeight: 500 }}>{t}</td>
                  {data.days.map((d, di) => {
                    const cell = data.cells.find(c => c.type === t && c.dayIndex === di) || { count: 0 };
                    return (
                      <td key={d} style={{ padding: 0, border: '1px solid #fff' }}>
                        <div title={`${t} on ${d}: ${cell.count}`} style={{ background: colorFor(cell.count, data.max), height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: cell.count > data.max * 0.5 ? '#fff' : '#1f2937', fontWeight: 600 }}>
                          {cell.count}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TreatmentHeatmapView;
