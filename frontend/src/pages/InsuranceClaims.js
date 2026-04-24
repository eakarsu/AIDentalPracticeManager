import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResponse from '../components/AIResponse';

function InsuranceClaims() {
  const [claims, setClaims] = useState([]);
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
    patient_id: '', treatment_plan_id: '', insurance_provider: '', policy_number: '',
    claim_amount: '', procedure_codes: '', status: 'pending', submission_date: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([api.get('/insurance'), api.get('/patients')]);
      setClaims(cRes.data);
      setPatients(pRes.data);
    } catch (err) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/insurance/${id}`);
      setSelected(res.data);
      setAiResult(null);
      setShowDetail(true);
    } catch (err) { toast.error('Failed to load details'); }
  };

  const handleNew = () => {
    setForm({ patient_id: '', treatment_plan_id: '', insurance_provider: '', policy_number: '', claim_amount: '', procedure_codes: '', status: 'pending', submission_date: new Date().toISOString().split('T')[0] });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      patient_id: selected.patient_id, treatment_plan_id: selected.treatment_plan_id || '',
      insurance_provider: selected.insurance_provider || '', policy_number: selected.policy_number || '',
      claim_amount: selected.claim_amount || '', approved_amount: selected.approved_amount || '',
      procedure_codes: selected.procedure_codes || '', status: selected.status || 'pending',
      submission_date: selected.submission_date?.split('T')[0] || '', response_date: selected.response_date?.split('T')[0] || '',
      denial_reason: selected.denial_reason || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/insurance/${selected.id}`, form);
        toast.success('Claim updated');
      } else {
        await api.post('/insurance', form);
        toast.success('Claim created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this insurance claim?')) return;
    try {
      await api.delete(`/insurance/${selected.id}`);
      toast.success('Claim deleted');
      setShowDetail(false);
      fetchData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleAIPreAuth = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post(`/insurance/${selected.id}/ai-preauth`);
      setAiResult(res.data);
      toast.success('AI pre-authorization generated');
    } catch (err) { toast.error('AI pre-auth failed'); } finally { setAiLoading(false); }
  };

  const filtered = claims.filter(c =>
    `${c.first_name} ${c.last_name} ${c.insurance_provider} ${c.policy_number} ${c.procedure_codes}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading insurance claims...</div>;

  return (
    <div>
      <div className="page-header">
        <div><h2>Insurance Pre-Authorization</h2><p>AI-automated insurance claim processing and pre-authorization</p></div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Claim</button>
      </div>

      <div className="search-bar">
        <input placeholder="Search by patient, provider, or procedure code..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Patient</th><th>Provider</th><th>Policy #</th><th>Claim Amount</th><th>Approved</th><th>Procedures</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => handleRowClick(c.id)}>
                <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                <td>{c.insurance_provider}</td>
                <td>{c.policy_number}</td>
                <td>${parseFloat(c.claim_amount || 0).toLocaleString()}</td>
                <td>{c.approved_amount ? `$${parseFloat(c.approved_amount).toLocaleString()}` : '-'}</td>
                <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.procedure_codes}</td>
                <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><div className="icon">🏥</div><h3>No insurance claims found</h3></div>}
      </div>

      {showDetail && selected && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Insurance Claim - {selected.first_name} {selected.last_name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Patient</div><div className="value">{selected.first_name} {selected.last_name}</div></div>
                <div className="detail-item"><div className="label">Insurance Provider</div><div className="value">{selected.insurance_provider}</div></div>
                <div className="detail-item"><div className="label">Policy Number</div><div className="value">{selected.policy_number}</div></div>
                <div className="detail-item"><div className="label">Status</div><div className="value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></div></div>
                <div className="detail-item"><div className="label">Claim Amount</div><div className="value" style={{ fontWeight: 700 }}>${parseFloat(selected.claim_amount || 0).toLocaleString()}</div></div>
                <div className="detail-item"><div className="label">Approved Amount</div><div className="value" style={{ fontWeight: 700, color: selected.approved_amount ? '#059669' : '#94a3b8' }}>{selected.approved_amount ? `$${parseFloat(selected.approved_amount).toLocaleString()}` : 'Pending'}</div></div>
                <div className="detail-item detail-full"><div className="label">Procedure Codes</div><div className="value">{selected.procedure_codes}</div></div>
                <div className="detail-item"><div className="label">Submission Date</div><div className="value">{selected.submission_date ? new Date(selected.submission_date).toLocaleDateString() : '-'}</div></div>
                <div className="detail-item"><div className="label">Response Date</div><div className="value">{selected.response_date ? new Date(selected.response_date).toLocaleDateString() : 'Awaiting'}</div></div>
                {selected.denial_reason && <div className="detail-item detail-full"><div className="label">Denial Reason</div><div className="value" style={{ color: '#dc2626' }}>{selected.denial_reason}</div></div>}
              </div>

              {selected.ai_pre_auth_notes && !aiResult && <AIResponse content={selected.ai_pre_auth_notes} title="Previous AI Pre-Authorization" />}
              {aiResult && <AIResponse content={aiResult.preauth} model={aiResult.model} usage={aiResult.usage} title="AI Pre-Authorization Analysis" />}
              {aiLoading && <div className="ai-response" style={{ textAlign: 'center' }}><div className="loading-spinner"><div className="spinner"></div> AI is generating pre-authorization...</div></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-ai btn-sm" onClick={handleAIPreAuth} disabled={aiLoading}>{aiLoading ? 'Generating...' : '🤖 AI Pre-Auth'}</button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Claim' : 'New Insurance Claim'}</h3>
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
                    <label>Insurance Provider *</label>
                    <input required value={form.insurance_provider} onChange={(e) => setForm({...form, insurance_provider: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Policy Number</label>
                    <input value={form.policy_number} onChange={(e) => setForm({...form, policy_number: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Claim Amount</label>
                    <input type="number" step="0.01" value={form.claim_amount} onChange={(e) => setForm({...form, claim_amount: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="partial">Partial</option>
                      <option value="denied">Denied</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Procedure Codes</label>
                  <input value={form.procedure_codes} onChange={(e) => setForm({...form, procedure_codes: e.target.value})} placeholder="e.g., D3330, D2740" />
                </div>
                <div className="form-group">
                  <label>Submission Date</label>
                  <input type="date" value={form.submission_date} onChange={(e) => setForm({...form, submission_date: e.target.value})} />
                </div>
                {editMode && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Approved Amount</label>
                        <input type="number" step="0.01" value={form.approved_amount} onChange={(e) => setForm({...form, approved_amount: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Response Date</label>
                        <input type="date" value={form.response_date} onChange={(e) => setForm({...form, response_date: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Denial Reason</label>
                      <textarea value={form.denial_reason} onChange={(e) => setForm({...form, denial_reason: e.target.value})} />
                    </div>
                  </>
                )}
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

export default InsuranceClaims;
