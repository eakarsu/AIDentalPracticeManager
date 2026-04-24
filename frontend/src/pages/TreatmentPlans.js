import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResponse from '../components/AIResponse';

function TreatmentPlans() {
  const [plans, setPlans] = useState([]);
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
    patient_id: '', diagnosis: '', treatment_description: '', procedures: '',
    estimated_cost: '', priority: 'medium', status: 'proposed', start_date: '', end_date: '', notes: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([api.get('/treatments'), api.get('/patients')]);
      setPlans(tRes.data);
      setPatients(pRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/treatments/${id}`);
      setSelected(res.data);
      setAiResult(null);
      setShowDetail(true);
    } catch (err) { toast.error('Failed to load details'); }
  };

  const handleNew = () => {
    setForm({ patient_id: '', diagnosis: '', treatment_description: '', procedures: '', estimated_cost: '', priority: 'medium', status: 'proposed', start_date: '', end_date: '', notes: '' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      patient_id: selected.patient_id, diagnosis: selected.diagnosis || '', treatment_description: selected.treatment_description || '',
      procedures: selected.procedures || '', estimated_cost: selected.estimated_cost || '', priority: selected.priority || 'medium',
      status: selected.status || 'proposed', start_date: selected.start_date?.split('T')[0] || '', end_date: selected.end_date?.split('T')[0] || '', notes: selected.notes || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/treatments/${selected.id}`, form);
        toast.success('Treatment plan updated');
      } else {
        await api.post('/treatments', form);
        toast.success('Treatment plan created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this treatment plan?')) return;
    try {
      await api.delete(`/treatments/${selected.id}`);
      toast.success('Treatment plan deleted');
      setShowDetail(false);
      fetchData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleAIRecommend = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post(`/treatments/${selected.id}/ai-recommend`);
      setAiResult(res.data);
      toast.success('AI recommendation generated');
    } catch (err) { toast.error('AI recommendation failed'); } finally { setAiLoading(false); }
  };

  const filtered = plans.filter(p =>
    `${p.first_name} ${p.last_name} ${p.diagnosis} ${p.procedures}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading treatment plans...</div>;

  return (
    <div>
      <div className="page-header">
        <div><h2>Treatment Plans</h2><p>AI-powered treatment planning and recommendations</p></div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Treatment Plan</button>
      </div>

      <div className="search-bar">
        <input placeholder="Search by patient, diagnosis, or procedure..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Patient</th><th>Diagnosis</th><th>Procedures</th><th>Cost</th><th>Priority</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => handleRowClick(p.id)}>
                <td style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.diagnosis}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.procedures}</td>
                <td>${parseFloat(p.estimated_cost || 0).toLocaleString()}</td>
                <td><span className={`badge badge-${p.priority}`}>{p.priority}</span></td>
                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><div className="icon">📋</div><h3>No treatment plans found</h3></div>}
      </div>

      {showDetail && selected && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Treatment Plan - {selected.first_name} {selected.last_name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Patient</div><div className="value">{selected.first_name} {selected.last_name}</div></div>
                <div className="detail-item"><div className="label">Priority</div><div className="value"><span className={`badge badge-${selected.priority}`}>{selected.priority}</span></div></div>
                <div className="detail-item"><div className="label">Status</div><div className="value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></div></div>
                <div className="detail-item"><div className="label">Estimated Cost</div><div className="value" style={{ fontWeight: 700, color: '#059669' }}>${parseFloat(selected.estimated_cost || 0).toLocaleString()}</div></div>
                <div className="detail-item detail-full"><div className="label">Diagnosis</div><div className="value">{selected.diagnosis}</div></div>
                <div className="detail-item detail-full"><div className="label">Treatment Description</div><div className="value">{selected.treatment_description || '-'}</div></div>
                <div className="detail-item detail-full"><div className="label">Procedures</div><div className="value">{selected.procedures || '-'}</div></div>
                <div className="detail-item"><div className="label">Start Date</div><div className="value">{selected.start_date ? new Date(selected.start_date).toLocaleDateString() : '-'}</div></div>
                <div className="detail-item"><div className="label">End Date</div><div className="value">{selected.end_date ? new Date(selected.end_date).toLocaleDateString() : '-'}</div></div>
                <div className="detail-item detail-full"><div className="label">Notes</div><div className="value">{selected.notes || '-'}</div></div>
              </div>

              {selected.ai_recommendation && !aiResult && (
                <AIResponse content={selected.ai_recommendation} title="Previous AI Recommendation" />
              )}
              {aiResult && <AIResponse content={aiResult.recommendation} model={aiResult.model} usage={aiResult.usage} title="AI Treatment Recommendation" />}
              {aiLoading && <div className="ai-response" style={{ textAlign: 'center' }}><div className="loading-spinner"><div className="spinner"></div> AI is generating recommendation...</div></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-ai btn-sm" onClick={handleAIRecommend} disabled={aiLoading}>{aiLoading ? 'Generating...' : '🤖 AI Recommend'}</button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Treatment Plan' : 'New Treatment Plan'}</h3>
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
                <div className="form-group">
                  <label>Diagnosis *</label>
                  <textarea required value={form.diagnosis} onChange={(e) => setForm({...form, diagnosis: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Treatment Description</label>
                  <textarea value={form.treatment_description} onChange={(e) => setForm({...form, treatment_description: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Procedures</label>
                  <textarea value={form.procedures} onChange={(e) => setForm({...form, procedures: e.target.value})} placeholder="e.g., D3330 - Root Canal, D2740 - Crown" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Estimated Cost</label>
                    <input type="number" step="0.01" value={form.estimated_cost} onChange={(e) => setForm({...form, estimated_cost: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                      <option value="proposed">Proposed</option>
                      <option value="approved">Approved</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} />
                  </div>
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

export default TreatmentPlans;
