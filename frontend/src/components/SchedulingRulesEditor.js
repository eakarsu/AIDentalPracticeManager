import React, { useEffect, useState } from 'react';
import api from '../services/api';

const blank = { slot_type: '', duration_minutes: 30, color: '#3b82f6', buffer_minutes: 5, notes: '', active: true };

function SchedulingRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await api.get('/custom-views/scheduling-rules');
      setRules(r.data.rules || []);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/custom-views/scheduling-rules/${editId}`, form);
      } else {
        await api.post('/custom-views/scheduling-rules', form);
      }
      setForm(blank); setEditId(null);
      await load();
    } catch (e2) { setErr(e2.response?.data?.error || e2.message); }
  };

  const edit = (r) => { setEditId(r.id); setForm({ slot_type: r.slot_type, duration_minutes: r.duration_minutes, color: r.color, buffer_minutes: r.buffer_minutes, notes: r.notes || '', active: r.active }); };
  const remove = async (id) => {
    if (!window.confirm('Delete this slot rule?')) return;
    try { await api.delete(`/custom-views/scheduling-rules/${id}`); await load(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  };
  const cancel = () => { setForm(blank); setEditId(null); };

  return (
    <div data-testid="scheduling-rules-editor" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 12px 0', color: '#1e3a8a' }}>⚙️ Scheduling Rules Editor</h3>
      {err && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {err}</div>}

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 3fr auto', gap: 8, alignItems: 'end', padding: 10, background: '#f9fafb', borderRadius: 6, marginBottom: 12 }}>
        <label style={{ fontSize: 12 }}>Slot Type
          <input required value={form.slot_type} onChange={(e) => setForm({ ...form, slot_type: e.target.value })} style={{ width: '100%', padding: 6, border: '1px solid #d1d5db', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12 }}>Duration (min)
          <input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })} style={{ width: '100%', padding: 6, border: '1px solid #d1d5db', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12 }}>Buffer (min)
          <input type="number" min={0} step={5} value={form.buffer_minutes} onChange={(e) => setForm({ ...form, buffer_minutes: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: 6, border: '1px solid #d1d5db', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12 }}>Color
          <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12 }}>Notes
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: 6, border: '1px solid #d1d5db', borderRadius: 4 }} />
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="submit" style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>{editId ? 'Update' : 'Add'}</button>
          {editId && <button type="button" onClick={cancel} style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>Cancel</button>}
        </div>
      </form>

      {loading ? <div>Loading rules…</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Slot Type</th>
              <th style={{ padding: 8 }}>Duration</th>
              <th style={{ padding: 8 }}>Buffer</th>
              <th style={{ padding: 8 }}>Color</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Notes</th>
              <th style={{ padding: 8 }}>Active</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{r.slot_type}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{r.duration_minutes} min</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{r.buffer_minutes} min</td>
                <td style={{ padding: 8, textAlign: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, background: r.color, border: '1px solid #d1d5db', borderRadius: 4 }} /></td>
                <td style={{ padding: 8, color: '#6b7280' }}>{r.notes || '-'}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{r.active ? '✅' : '⏸'}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <button onClick={() => edit(r)} style={{ padding: '4px 8px', marginRight: 4, background: '#0ea5e9', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>Del</button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && <tr><td colSpan={7} style={{ padding: 12, textAlign: 'center', color: '#9ca3af' }}>No rules yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SchedulingRulesEditor;
