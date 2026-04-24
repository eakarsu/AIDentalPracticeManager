import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResponse from '../components/AIResponse';

function Scheduling() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [form, setForm] = useState({
    patient_id: '', appointment_date: '', duration_minutes: '30', appointment_type: '',
    provider: '', operatory: '', status: 'scheduled', notes: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [aRes, pRes] = await Promise.all([api.get('/scheduling'), api.get('/patients')]);
      setAppointments(aRes.data);
      setPatients(pRes.data);
    } catch (err) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/scheduling/${id}`);
      setSelected(res.data);
      setShowDetail(true);
    } catch (err) { toast.error('Failed to load details'); }
  };

  const handleNew = () => {
    setForm({ patient_id: '', appointment_date: '', duration_minutes: '30', appointment_type: '', provider: '', operatory: '', status: 'scheduled', notes: '' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    const dt = selected.appointment_date ? new Date(selected.appointment_date) : null;
    const dateStr = dt ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : '';
    setForm({
      patient_id: selected.patient_id, appointment_date: dateStr,
      duration_minutes: selected.duration_minutes || '30', appointment_type: selected.appointment_type || '',
      provider: selected.provider || '', operatory: selected.operatory || '',
      status: selected.status || 'scheduled', notes: selected.notes || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/scheduling/${selected.id}`, form);
        toast.success('Appointment updated');
      } else {
        await api.post('/scheduling', form);
        toast.success('Appointment created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await api.delete(`/scheduling/${selected.id}`);
      toast.success('Appointment deleted');
      setShowDetail(false);
      fetchData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleAIOptimize = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/scheduling/ai-optimize');
      setAiResult(res.data);
      toast.success('AI optimization complete');
    } catch (err) { toast.error('AI optimization failed'); } finally { setAiLoading(false); }
  };

  const filtered = appointments.filter(a =>
    `${a.first_name} ${a.last_name} ${a.appointment_type} ${a.provider}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading appointments...</div>;

  return (
    <div>
      <div className="page-header">
        <div><h2>Patient Scheduling</h2><p>Manage appointments and AI-optimized scheduling</p></div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ai" onClick={handleAIOptimize} disabled={aiLoading}>{aiLoading ? 'Optimizing...' : '🤖 AI Optimize Schedule'}</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Appointment</button>
        </div>
      </div>

      {aiResult && <div style={{ marginBottom: '20px' }}><AIResponse content={aiResult.optimization} model={aiResult.model} usage={aiResult.usage} title="AI Schedule Optimization" /></div>}
      {aiLoading && <div className="ai-response" style={{ textAlign: 'center', marginBottom: '20px' }}><div className="loading-spinner"><div className="spinner"></div> AI is analyzing your schedule...</div></div>}

      <div className="search-bar">
        <input placeholder="Search by patient, type, or provider..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Patient</th><th>Date & Time</th><th>Duration</th><th>Type</th><th>Provider</th><th>Room</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} onClick={() => handleRowClick(a.id)}>
                <td style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</td>
                <td>{new Date(a.appointment_date).toLocaleString()}</td>
                <td>{a.duration_minutes} min</td>
                <td>{a.appointment_type}</td>
                <td>{a.provider}</td>
                <td>{a.operatory}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><div className="icon">📅</div><h3>No appointments found</h3></div>}
      </div>

      {showDetail && selected && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Appointment - {selected.first_name} {selected.last_name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Patient</div><div className="value">{selected.first_name} {selected.last_name}</div></div>
                <div className="detail-item"><div className="label">Phone</div><div className="value">{selected.phone || '-'}</div></div>
                <div className="detail-item"><div className="label">Date & Time</div><div className="value">{new Date(selected.appointment_date).toLocaleString()}</div></div>
                <div className="detail-item"><div className="label">Duration</div><div className="value">{selected.duration_minutes} minutes</div></div>
                <div className="detail-item"><div className="label">Type</div><div className="value">{selected.appointment_type}</div></div>
                <div className="detail-item"><div className="label">Provider</div><div className="value">{selected.provider}</div></div>
                <div className="detail-item"><div className="label">Operatory</div><div className="value">{selected.operatory}</div></div>
                <div className="detail-item"><div className="label">Status</div><div className="value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></div></div>
                <div className="detail-item detail-full"><div className="label">Medical History</div><div className="value">{selected.medical_history || 'None'}</div></div>
                <div className="detail-item detail-full"><div className="label">Allergies</div><div className="value">{selected.allergies || 'None'}</div></div>
                <div className="detail-item detail-full"><div className="label">Notes</div><div className="value">{selected.notes || '-'}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Appointment' : 'New Appointment'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Patient *</label>
                  <select required value={form.patient_id} onChange={(e) => setForm({...form, patient_id: e.target.value})}>
                    <option value="">Select Patient</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date & Time *</label>
                    <input type="datetime-local" required value={form.appointment_date} onChange={(e) => setForm({...form, appointment_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <select value={form.duration_minutes} onChange={(e) => setForm({...form, duration_minutes: e.target.value})}>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                      <option value="120">120 min</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Appointment Type *</label>
                  <select required value={form.appointment_type} onChange={(e) => setForm({...form, appointment_type: e.target.value})}>
                    <option value="">Select Type</option>
                    <option>Periodic Exam & Prophylaxis</option>
                    <option>New Patient Exam</option>
                    <option>Emergency Visit</option>
                    <option>Root Canal Therapy</option>
                    <option>Crown Preparation</option>
                    <option>Extraction</option>
                    <option>Consultation</option>
                    <option>SRP - Scaling & Root Planing</option>
                    <option>Restoration / Filling</option>
                    <option>Whitening</option>
                    <option>Implant Placement</option>
                    <option>Follow-up</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Provider</label>
                    <select value={form.provider} onChange={(e) => setForm({...form, provider: e.target.value})}>
                      <option value="">Select Provider</option>
                      <option>Dr. Sarah Smith</option>
                      <option>Dr. Michael Jones</option>
                      <option>Lisa Chen</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Operatory</label>
                    <select value={form.operatory} onChange={(e) => setForm({...form, operatory: e.target.value})}>
                      <option value="">Select Room</option>
                      <option>Op 1</option>
                      <option>Op 2</option>
                      <option>Op 3</option>
                      <option>Op 4</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scheduling;
