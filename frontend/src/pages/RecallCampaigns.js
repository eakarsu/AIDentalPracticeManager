import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResponse from '../components/AIResponse';

function RecallCampaigns() {
  const [recalls, setRecalls] = useState([]);
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
    patient_id: '', campaign_type: '', recall_reason: '', due_date: '',
    contact_method: 'email', message_template: '', status: 'pending'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [rRes, pRes] = await Promise.all([api.get('/recalls'), api.get('/patients')]);
      setRecalls(rRes.data);
      setPatients(pRes.data);
    } catch (err) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/recalls/${id}`);
      setSelected(res.data);
      setAiResult(null);
      setShowDetail(true);
    } catch (err) { toast.error('Failed to load details'); }
  };

  const handleNew = () => {
    setForm({ patient_id: '', campaign_type: '', recall_reason: '', due_date: '', contact_method: 'email', message_template: '', status: 'pending' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      patient_id: selected.patient_id, campaign_type: selected.campaign_type || '',
      recall_reason: selected.recall_reason || '', due_date: selected.due_date?.split('T')[0] || '',
      contact_method: selected.contact_method || 'email', message_template: selected.message_template || '',
      status: selected.status || 'pending'
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/recalls/${selected.id}`, form);
        toast.success('Recall updated');
      } else {
        await api.post('/recalls', form);
        toast.success('Recall created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this recall campaign?')) return;
    try {
      await api.delete(`/recalls/${selected.id}`);
      toast.success('Recall deleted');
      setShowDetail(false);
      fetchData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleAIPersonalize = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post(`/recalls/${selected.id}/ai-personalize`);
      setAiResult(res.data);
      toast.success('AI personalized message generated');
    } catch (err) { toast.error('AI personalization failed'); } finally { setAiLoading(false); }
  };

  const filtered = recalls.filter(r =>
    `${r.first_name} ${r.last_name} ${r.campaign_type} ${r.recall_reason}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading recall campaigns...</div>;

  return (
    <div>
      <div className="page-header">
        <div><h2>Recall Campaigns</h2><p>AI-personalized patient outreach and recall management</p></div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Recall</button>
      </div>

      <div className="search-bar">
        <input placeholder="Search by patient, campaign type, or reason..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Patient</th><th>Campaign Type</th><th>Reason</th><th>Due Date</th><th>Contact</th><th>Status</th><th>Response</th></tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} onClick={() => handleRowClick(r.id)}>
                <td style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</td>
                <td>{r.campaign_type}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.recall_reason}</td>
                <td>{r.due_date ? new Date(r.due_date).toLocaleDateString() : '-'}</td>
                <td style={{ textTransform: 'capitalize' }}>{r.contact_method}</td>
                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                <td>{r.response_received ? <span className="badge badge-completed">Yes</span> : <span style={{ color: '#94a3b8' }}>No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><div className="icon">📧</div><h3>No recall campaigns found</h3></div>}
      </div>

      {showDetail && selected && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Recall Campaign - {selected.first_name} {selected.last_name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Patient</div><div className="value">{selected.first_name} {selected.last_name}</div></div>
                <div className="detail-item"><div className="label">Contact Method</div><div className="value" style={{ textTransform: 'capitalize' }}>{selected.contact_method}</div></div>
                <div className="detail-item"><div className="label">Campaign Type</div><div className="value">{selected.campaign_type}</div></div>
                <div className="detail-item"><div className="label">Due Date</div><div className="value">{selected.due_date ? new Date(selected.due_date).toLocaleDateString() : '-'}</div></div>
                <div className="detail-item"><div className="label">Status</div><div className="value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></div></div>
                <div className="detail-item"><div className="label">Response Received</div><div className="value">{selected.response_received ? 'Yes' : 'No'}</div></div>
                <div className="detail-item detail-full"><div className="label">Recall Reason</div><div className="value">{selected.recall_reason || '-'}</div></div>
                <div className="detail-item detail-full"><div className="label">Email</div><div className="value">{selected.email || '-'}</div></div>
                <div className="detail-item detail-full"><div className="label">Phone</div><div className="value">{selected.phone || '-'}</div></div>
              </div>

              {selected.ai_personalized_message && !aiResult && <AIResponse content={selected.ai_personalized_message} title="Previous AI Personalized Message" />}
              {aiResult && <AIResponse content={aiResult.message} model={aiResult.model} usage={aiResult.usage} title="AI Personalized Campaign Message" />}
              {aiLoading && <div className="ai-response" style={{ textAlign: 'center' }}><div className="loading-spinner"><div className="spinner"></div> AI is generating personalized message...</div></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-ai btn-sm" onClick={handleAIPersonalize} disabled={aiLoading}>{aiLoading ? 'Generating...' : '🤖 AI Personalize'}</button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Recall Campaign' : 'New Recall Campaign'}</h3>
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
                    <label>Campaign Type *</label>
                    <select required value={form.campaign_type} onChange={(e) => setForm({...form, campaign_type: e.target.value})}>
                      <option value="">Select Type</option>
                      <option>6-Month Recall</option>
                      <option>3-Month Perio Maintenance</option>
                      <option>3-Month High Risk Recall</option>
                      <option>Follow-up</option>
                      <option>Treatment Pending</option>
                      <option>Post-Surgery Follow-up</option>
                      <option>Implant Follow-up</option>
                      <option>Postpartum Follow-up</option>
                      <option>Annual Monitoring</option>
                      <option>Urgent Follow-up</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contact Method</label>
                    <select value={form.contact_method} onChange={(e) => setForm({...form, contact_method: e.target.value})}>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Recall Reason</label>
                  <textarea value={form.recall_reason} onChange={(e) => setForm({...form, recall_reason: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Message Template</label>
                  <input value={form.message_template} onChange={(e) => setForm({...form, message_template: e.target.value})} placeholder="e.g., standard_recall, perio_maintenance" />
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

export default RecallCampaigns;
