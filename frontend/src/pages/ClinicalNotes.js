import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

function ClinicalNotes() {
  const [notes, setNotes] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', visit_date: '', note_type: 'progress', chief_complaint: '',
    subjective: '', objective: '', assessment: '', plan: '',
    provider: '', tooth_numbers: '', procedures_performed: '', notes: ''
  });

  useEffect(() => { fetchNotes(); fetchPatients(); }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data);
    } catch (err) { toast.error('Failed to load clinical notes'); }
    finally { setLoading(false); }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch (err) { /* silent */ }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/notes/${id}`);
      setSelected(res.data);
      setShowDetail(true);
    } catch (err) { toast.error('Failed to load note details'); }
  };

  const handleNew = () => {
    setForm({
      patient_id: '', visit_date: new Date().toISOString().split('T')[0], note_type: 'progress',
      chief_complaint: '', subjective: '', objective: '', assessment: '', plan: '',
      provider: '', tooth_numbers: '', procedures_performed: '', notes: ''
    });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      patient_id: selected.patient_id || '', visit_date: selected.visit_date?.split('T')[0] || '',
      note_type: selected.note_type || 'progress', chief_complaint: selected.chief_complaint || '',
      subjective: selected.subjective || '', objective: selected.objective || '',
      assessment: selected.assessment || '', plan: selected.plan || '',
      provider: selected.provider || '', tooth_numbers: selected.tooth_numbers || '',
      procedures_performed: selected.procedures_performed || '', notes: selected.notes || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/notes/${selected.id}`, form);
        toast.success('Note updated');
      } else {
        await api.post('/notes', form);
        toast.success('Note created');
      }
      setShowModal(false);
      fetchNotes();
    } catch (err) { toast.error('Failed to save note'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this clinical note?')) return;
    try {
      await api.delete(`/notes/${selected.id}`);
      toast.success('Note deleted');
      setShowDetail(false);
      fetchNotes();
    } catch (err) { toast.error('Failed to delete note'); }
  };

  const filtered = notes.filter(n =>
    `${n.first_name} ${n.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    n.chief_complaint?.toLowerCase().includes(search.toLowerCase()) ||
    n.note_type?.toLowerCase().includes(search.toLowerCase()) ||
    n.provider?.toLowerCase().includes(search.toLowerCase())
  );

  const noteTypeLabel = (type) => {
    const map = { progress: 'Progress Note', treatment: 'Treatment Note', consultation: 'Consultation', exam: 'Examination', emergency: 'Emergency' };
    return map[type] || type;
  };

  const noteTypeBadge = (type) => {
    const map = { progress: 'badge-active', treatment: 'badge-completed', consultation: 'badge-proposed', exam: 'badge-sent', emergency: 'badge-denied' };
    return map[type] || 'badge-pending';
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading clinical notes...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clinical Notes</h2>
          <p>Patient visit documentation and SOAP notes</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Note</button>
      </div>

      <div className="search-bar">
        <input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">📝</div><h3>No clinical notes found</h3><p>Create your first clinical note</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Type</th><th>Chief Complaint</th><th>Provider</th><th>Teeth</th></tr></thead>
            <tbody>
              {filtered.map(note => (
                <tr key={note.id} onClick={() => handleRowClick(note.id)}>
                  <td>{new Date(note.visit_date).toLocaleDateString()}</td>
                  <td><strong>{note.first_name} {note.last_name}</strong></td>
                  <td><span className={`badge ${noteTypeBadge(note.note_type)}`}>{noteTypeLabel(note.note_type)}</span></td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.chief_complaint}</td>
                  <td>{note.provider}</td>
                  <td>{note.tooth_numbers || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Clinical Note - {selected.first_name} {selected.last_name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Visit Date</div><div className="value">{new Date(selected.visit_date).toLocaleDateString()}</div></div>
                <div className="detail-item"><div className="label">Note Type</div><div className="value"><span className={`badge ${noteTypeBadge(selected.note_type)}`}>{noteTypeLabel(selected.note_type)}</span></div></div>
                <div className="detail-item"><div className="label">Provider</div><div className="value">{selected.provider || '-'}</div></div>
                <div className="detail-item"><div className="label">Teeth</div><div className="value">{selected.tooth_numbers || '-'}</div></div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Chief Complaint</h4>
                  <p style={{ fontSize: '14px', color: '#1e293b' }}>{selected.chief_complaint || '-'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>S - Subjective</h4>
                    <p style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{selected.subjective || '-'}</p>
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>O - Objective</h4>
                    <p style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{selected.objective || '-'}</p>
                  </div>
                  <div style={{ background: '#fefce8', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>A - Assessment</h4>
                    <p style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{selected.assessment || '-'}</p>
                  </div>
                  <div style={{ background: '#fdf2f8', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>P - Plan</h4>
                    <p style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{selected.plan || '-'}</p>
                  </div>
                </div>

                {selected.procedures_performed && (
                  <div style={{ background: '#f5f3ff', borderRadius: '12px', padding: '20px', marginTop: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Procedures Performed</h4>
                    <p style={{ fontSize: '14px', color: '#1e293b' }}>{selected.procedures_performed}</p>
                  </div>
                )}

                {selected.notes && (
                  <div style={{ marginTop: '12px' }}>
                    <div className="detail-item"><div className="label">Additional Notes</div><div className="value">{selected.notes}</div></div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-secondary btn-sm" onClick={handleEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Clinical Note' : 'New Clinical Note'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Patient</label>
                    <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} required>
                      <option value="">Select Patient</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Visit Date</label>
                    <input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Note Type</label>
                    <select value={form.note_type} onChange={e => setForm({ ...form, note_type: e.target.value })}>
                      <option value="progress">Progress Note</option>
                      <option value="treatment">Treatment Note</option>
                      <option value="consultation">Consultation</option>
                      <option value="exam">Examination</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Provider</label>
                    <input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Dr. Sarah Smith" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Chief Complaint</label>
                    <input value={form.chief_complaint} onChange={e => setForm({ ...form, chief_complaint: e.target.value })} placeholder="Primary reason for visit" />
                  </div>
                  <div className="form-group">
                    <label>Tooth Numbers</label>
                    <input value={form.tooth_numbers} onChange={e => setForm({ ...form, tooth_numbers: e.target.value })} placeholder="e.g. #3, #14, #19" />
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '16px 0 12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>SOAP Notes</h4>

                <div className="form-group">
                  <label>Subjective (Patient's symptoms & history)</label>
                  <textarea value={form.subjective} onChange={e => setForm({ ...form, subjective: e.target.value })} rows="3" placeholder="Patient reports..." />
                </div>
                <div className="form-group">
                  <label>Objective (Clinical findings)</label>
                  <textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} rows="3" placeholder="Clinical examination reveals..." />
                </div>
                <div className="form-group">
                  <label>Assessment (Diagnosis)</label>
                  <textarea value={form.assessment} onChange={e => setForm({ ...form, assessment: e.target.value })} rows="2" placeholder="Diagnosis and clinical impression..." />
                </div>
                <div className="form-group">
                  <label>Plan (Treatment plan)</label>
                  <textarea value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} rows="2" placeholder="Recommended treatment and follow-up..." />
                </div>
                <div className="form-group">
                  <label>Procedures Performed</label>
                  <textarea value={form.procedures_performed} onChange={e => setForm({ ...form, procedures_performed: e.target.value })} rows="2" placeholder="e.g. Prophylaxis, Fluoride treatment" />
                </div>
                <div className="form-group">
                  <label>Additional Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create'} Note</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicalNotes;
