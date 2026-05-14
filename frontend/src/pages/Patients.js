import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Pagination from '../components/Pagination';

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
    address: '', insurance_provider: '', insurance_id: '', medical_history: '', allergies: '', notes: ''
  });

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get(`/patients?page=${page}&limit=20`);
      // Paginated response shape: { data, pagination }
      if (res.data && Array.isArray(res.data.data)) {
        setPatients(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotal(res.data.pagination?.total || res.data.data.length);
      } else {
        setPatients(Array.isArray(res.data) ? res.data : []);
        setTotalPages(1);
        setTotal(Array.isArray(res.data) ? res.data.length : 0);
      }
    } catch (err) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/patients/${id}`);
      setSelected(res.data);
      setShowDetail(true);
    } catch (err) {
      toast.error('Failed to load patient details');
    }
  };

  const handleNew = () => {
    setForm({ first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', address: '', insurance_provider: '', insurance_id: '', medical_history: '', allergies: '', notes: '' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      first_name: selected.first_name || '', last_name: selected.last_name || '', email: selected.email || '',
      phone: selected.phone || '', date_of_birth: selected.date_of_birth?.split('T')[0] || '', address: selected.address || '',
      insurance_provider: selected.insurance_provider || '', insurance_id: selected.insurance_id || '',
      medical_history: selected.medical_history || '', allergies: selected.allergies || '', notes: selected.notes || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/patients/${selected.id}`, form);
        toast.success('Patient updated');
      } else {
        await api.post('/patients', form);
        toast.success('Patient created');
      }
      setShowModal(false);
      fetchPatients();
    } catch (err) {
      toast.error('Failed to save patient');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;
    try {
      await api.delete(`/patients/${selected.id}`);
      toast.success('Patient deleted');
      setShowDetail(false);
      fetchPatients();
    } catch (err) {
      toast.error('Failed to delete patient');
    }
  };

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.email} ${p.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading patients...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Patient Management</h2>
          <p>{total || patients.length} patients registered</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Patient</button>
      </div>

      <div className="search-bar">
        <input placeholder="Search patients by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>DOB</th>
              <th>Insurance</th>
              <th>Allergies</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => handleRowClick(p.id)}>
                <td style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>{p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '-'}</td>
                <td>{p.insurance_provider || '-'}</td>
                <td>{p.allergies || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="icon">👥</div>
            <h3>No patients found</h3>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected.first_name} {selected.last_name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Email</div><div className="value">{selected.email || '-'}</div></div>
                <div className="detail-item"><div className="label">Phone</div><div className="value">{selected.phone || '-'}</div></div>
                <div className="detail-item"><div className="label">Date of Birth</div><div className="value">{selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString() : '-'}</div></div>
                <div className="detail-item"><div className="label">Insurance</div><div className="value">{selected.insurance_provider || '-'} ({selected.insurance_id || '-'})</div></div>
                <div className="detail-item detail-full"><div className="label">Address</div><div className="value">{selected.address || '-'}</div></div>
                <div className="detail-item detail-full"><div className="label">Medical History</div><div className="value">{selected.medical_history || 'None reported'}</div></div>
                <div className="detail-item"><div className="label">Allergies</div><div className="value">{selected.allergies || 'None'}</div></div>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Patient' : 'New Patient'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input required value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input required value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Insurance Provider</label>
                    <input value={form.insurance_provider} onChange={(e) => setForm({...form, insurance_provider: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Insurance ID</label>
                  <input value={form.insurance_id} onChange={(e) => setForm({...form, insurance_id: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Medical History</label>
                  <textarea value={form.medical_history} onChange={(e) => setForm({...form, medical_history: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Allergies</label>
                    <input value={form.allergies} onChange={(e) => setForm({...form, allergies: e.target.value})} />
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

export default Patients;
