import React, { useEffect, useState } from 'react';
import api from '../services/api';

function ScheduleTimelineView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async (d) => {
    setLoading(true); setErr(null);
    try {
      const r = await api.get(`/custom-views/schedule-timeline?date=${d}`);
      setData(r.data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(date); /* eslint-disable-next-line */ }, []);

  const hours = data?.hours || [];
  const chairs = data?.chairs || [];
  const appts = data?.appointments || [];
  const pxPerHour = 60;

  return (
    <div data-testid="schedule-timeline-view" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#1e3a8a' }}>📅 Appointment Schedule Timeline</h3>
        <div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 6, marginRight: 8, border: '1px solid #d1d5db', borderRadius: 4 }} />
          <button onClick={() => load(date)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>Load</button>
        </div>
      </div>
      {loading && <div>Loading timeline…</div>}
      {err && <div style={{ color: '#b91c1c' }}>Error: {err}</div>}
      {data && (
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            {appts.length} appointments across {chairs.length} chairs on {data.date}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${hours.length}, ${pxPerHour}px)`, border: '1px solid #e5e7eb', minWidth: 120 + hours.length * pxPerHour }}>
              <div style={{ padding: 6, background: '#f3f4f6', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Chair / Time</div>
              {hours.map(h => (
                <div key={h} style={{ padding: 6, background: '#f3f4f6', fontSize: 11, textAlign: 'center', borderBottom: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' }}>{h}</div>
              ))}
              {chairs.map(chair => (
                <React.Fragment key={chair}>
                  <div style={{ padding: 6, fontWeight: 600, background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>{chair}</div>
                  <div style={{ gridColumn: `2 / span ${hours.length}`, position: 'relative', height: 44, borderBottom: '1px solid #f1f5f9', background: 'repeating-linear-gradient(to right,#fff,#fff 59px,#f3f4f6 59px,#f3f4f6 60px)' }}>
                    {appts.filter(a => a.chair === chair).map(a => {
                      const left = Math.max(0, (a.startHour - 8) * pxPerHour);
                      const width = Math.max(20, (a.duration / 60) * pxPerHour);
                      return (
                        <div key={a.id} title={`${a.patient} – ${a.type}`} style={{ position: 'absolute', top: 4, left, width, height: 36, background: '#dbeafe', border: '1px solid #2563eb', borderRadius: 4, padding: '2px 4px', fontSize: 10, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600 }}>{a.patient}</div>
                          <div style={{ color: '#1e40af' }}>{a.type}</div>
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleTimelineView;
