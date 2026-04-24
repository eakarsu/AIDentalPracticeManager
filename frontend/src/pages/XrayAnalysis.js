import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResponse from '../components/AIResponse';

function XrayAnalysis() {
  const [xrays, setXrays] = useState([]);
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
    patient_id: '', image_description: '', tooth_number: '', analysis_type: 'Periapical', severity: 'moderate', dentist_notes: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [xRes, pRes] = await Promise.all([api.get('/xrays'), api.get('/patients')]);
      setXrays(xRes.data);
      setPatients(pRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/xrays/${id}`);
      setSelected(res.data);
      setAiResult(null);
      setShowDetail(true);
    } catch (err) {
      toast.error('Failed to load details');
    }
  };

  const handleNew = () => {
    setForm({ patient_id: '', image_description: '', tooth_number: '', analysis_type: 'Periapical', severity: 'moderate', dentist_notes: '' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      patient_id: selected.patient_id, image_description: selected.image_description || '',
      tooth_number: selected.tooth_number || '', analysis_type: selected.analysis_type || 'Periapical',
      severity: selected.severity || 'moderate', dentist_notes: selected.dentist_notes || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/xrays/${selected.id}`, { ...form, status: selected.status });
        toast.success('X-ray updated');
      } else {
        await api.post('/xrays', form);
        toast.success('X-ray created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this X-ray analysis?')) return;
    try {
      await api.delete(`/xrays/${selected.id}`);
      toast.success('X-ray deleted');
      setShowDetail(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleAIAnalyze = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post(`/xrays/${selected.id}/analyze`);
      setAiResult(res.data);
      toast.success('AI analysis complete');
    } catch (err) {
      toast.error('AI analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = xrays.filter(x =>
    `${x.first_name} ${x.last_name} ${x.tooth_number} ${x.analysis_type} ${x.image_description}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading X-ray analyses...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>X-Ray Analysis</h2>
          <p>AI-powered dental radiograph analysis with annotations</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ New X-Ray</button>
      </div>

      <div className="search-bar">
        <input placeholder="Search by patient, tooth number, or type..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Tooth #</th>
              <th>Type</th>
              <th>Description</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(x => (
              <tr key={x.id} onClick={() => handleRowClick(x.id)}>
                <td style={{ fontWeight: 600 }}>{x.first_name} {x.last_name}</td>
                <td>{x.tooth_number}</td>
                <td>{x.analysis_type}</td>
                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.image_description}</td>
                <td><span className={`badge badge-${x.severity}`}>{x.severity}</span></td>
                <td><span className={`badge badge-${x.status}`}>{x.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><div className="icon">🔬</div><h3>No X-ray analyses found</h3></div>}
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>X-Ray Analysis - {selected.first_name} {selected.last_name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Patient</div><div className="value">{selected.first_name} {selected.last_name}</div></div>
                <div className="detail-item"><div className="label">Tooth Number</div><div className="value">{selected.tooth_number}</div></div>
                <div className="detail-item"><div className="label">Analysis Type</div><div className="value">{selected.analysis_type}</div></div>
                <div className="detail-item"><div className="label">Severity</div><div className="value"><span className={`badge badge-${selected.severity}`}>{selected.severity}</span></div></div>
                <div className="detail-item"><div className="label">Status</div><div className="value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></div></div>
                <div className="detail-item detail-full"><div className="label">Image Description</div><div className="value">{selected.image_description}</div></div>
                <div className="detail-item detail-full"><div className="label">Medical History</div><div className="value">{selected.medical_history || 'None'}</div></div>
                <div className="detail-item detail-full"><div className="label">Dentist Notes</div><div className="value">{selected.dentist_notes || '-'}</div></div>
              </div>

              {selected.ai_findings && !aiResult && (
                <AIResponse content={selected.ai_findings} title="Previous AI Analysis" />
              )}

              {aiResult && (
                <AIResponse content={aiResult.analysis} model={aiResult.model} usage={aiResult.usage} title="AI X-Ray Analysis" />
              )}

              {aiLoading && (
                <div className="ai-response" style={{ textAlign: 'center' }}>
                  <div className="loading-spinner"><div className="spinner"></div> AI is analyzing the X-ray...</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-ai btn-sm" onClick={handleAIAnalyze} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : '🤖 AI Analyze'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit X-Ray Analysis' : 'New X-Ray Analysis'}</h3>
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
                    <label>Tooth Number</label>
                    <input value={form.tooth_number} onChange={(e) => setForm({...form, tooth_number: e.target.value})} placeholder="e.g., 14, 18-19, Full" />
                  </div>
                  <div className="form-group">
                    <label>Analysis Type</label>
                    <select value={form.analysis_type} onChange={(e) => setForm({...form, analysis_type: e.target.value})}>
                      <option>Periapical</option>
                      <option>Bitewing</option>
                      <option>Panoramic</option>
                      <option>CBCT</option>
                      <option>Cephalometric</option>
                      <option>Occlusal</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Image Description *</label>
                  <textarea required value={form.image_description} onChange={(e) => setForm({...form, image_description: e.target.value})} placeholder="Describe the radiograph..." />
                </div>
                <div className="form-group">
                  <label>Severity</label>
                  <select value={form.severity} onChange={(e) => setForm({...form, severity: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Dentist Notes</label>
                  <textarea value={form.dentist_notes} onChange={(e) => setForm({...form, dentist_notes: e.target.value})} />
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

export default XrayAnalysis;
