import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', items: [{ description: '', quantity: 1, unit_price: 0 }], tax_rate: 0, notes: ''
  });
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'credit_card', reference_number: '', notes: '' });

  useEffect(() => { fetchInvoices(); fetchPatients(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/billing');
      setInvoices(res.data);
    } catch (err) { toast.error('Failed to load invoices'); }
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
      const res = await api.get(`/billing/${id}`);
      setSelected(res.data);
      setShowDetail(true);
    } catch (err) { toast.error('Failed to load invoice details'); }
  };

  const handleNew = () => {
    setForm({ patient_id: '', items: [{ description: '', quantity: 1, unit_price: 0 }], tax_rate: 0, notes: '' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      patient_id: selected.patient_id || '',
      items: typeof selected.items === 'string' ? JSON.parse(selected.items) : (selected.items || [{ description: '', quantity: 1, unit_price: 0 }]),
      tax_rate: selected.tax_rate || 0,
      status: selected.status || 'unpaid',
      notes: selected.notes || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/billing/${selected.id}`, form);
        toast.success('Invoice updated');
      } else {
        await api.post('/billing', form);
        toast.success('Invoice created');
      }
      setShowModal(false);
      fetchInvoices();
    } catch (err) { toast.error('Failed to save invoice'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/billing/${selected.id}`);
      toast.success('Invoice deleted');
      setShowDetail(false);
      fetchInvoices();
    } catch (err) { toast.error('Failed to delete invoice'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/billing/${selected.id}/payments`, paymentForm);
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      const res = await api.get(`/billing/${selected.id}`);
      setSelected(res.data);
      fetchInvoices();
    } catch (err) { toast.error('Failed to record payment'); }
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0 }] });
  };

  const removeItem = (index) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: field === 'description' ? value : Number(value) };
    setForm({ ...form, items });
  };

  const subtotal = form.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const filtered = invoices.filter(inv =>
    `${inv.first_name} ${inv.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    inv.status?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) => {
    const map = { paid: 'badge-completed', partial: 'badge-partial', unpaid: 'badge-pending', overdue: 'badge-denied' };
    return map[s] || 'badge-pending';
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading billing...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Billing & Payments</h2>
          <p>Manage invoices and track payments</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Invoice</button>
      </div>

      <div className="search-bar">
        <input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">💰</div><h3>No invoices found</h3><p>Create your first invoice to get started</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Invoice #</th><th>Patient</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} onClick={() => handleRowClick(inv.id)}>
                  <td><strong>INV-{String(inv.id).padStart(4, '0')}</strong></td>
                  <td>{inv.first_name} {inv.last_name}</td>
                  <td>${Number(inv.total_amount).toFixed(2)}</td>
                  <td>${Number(inv.paid_amount || 0).toFixed(2)}</td>
                  <td style={{ color: (inv.total_amount - (inv.paid_amount || 0)) > 0 ? '#ef4444' : '#10b981' }}>
                    ${(Number(inv.total_amount) - Number(inv.paid_amount || 0)).toFixed(2)}
                  </td>
                  <td><span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span></td>
                  <td>{new Date(inv.created_at).toLocaleDateString()}</td>
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
              <h3>Invoice INV-{String(selected.id).padStart(4, '0')}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Patient</div><div className="value">{selected.first_name} {selected.last_name}</div></div>
                <div className="detail-item"><div className="label">Status</div><div className="value"><span className={`badge ${statusColor(selected.status)}`}>{selected.status}</span></div></div>
                <div className="detail-item"><div className="label">Total</div><div className="value">${Number(selected.total_amount).toFixed(2)}</div></div>
                <div className="detail-item"><div className="label">Paid</div><div className="value">${Number(selected.paid_amount || 0).toFixed(2)}</div></div>
                <div className="detail-item"><div className="label">Balance</div><div className="value" style={{ color: '#ef4444' }}>${(Number(selected.total_amount) - Number(selected.paid_amount || 0)).toFixed(2)}</div></div>
                <div className="detail-item"><div className="label">Created</div><div className="value">{new Date(selected.created_at).toLocaleDateString()}</div></div>
              </div>

              <h4 style={{ margin: '20px 0 10px', fontSize: '15px', fontWeight: 600 }}>Line Items</h4>
              <div className="table-container" style={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <table>
                  <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {(typeof selected.items === 'string' ? JSON.parse(selected.items) : (selected.items || [])).map((item, i) => (
                      <tr key={i} style={{ cursor: 'default' }}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>${Number(item.unit_price).toFixed(2)}</td>
                        <td>${(item.quantity * item.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.payments && selected.payments.length > 0 && (
                <>
                  <h4 style={{ margin: '20px 0 10px', fontSize: '15px', fontWeight: 600 }}>Payment History</h4>
                  <div className="table-container" style={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                    <table>
                      <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
                      <tbody>
                        {selected.payments.map((p, i) => (
                          <tr key={i} style={{ cursor: 'default' }}>
                            <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                            <td>${Number(p.amount).toFixed(2)}</td>
                            <td style={{ textTransform: 'capitalize' }}>{p.payment_method?.replace('_', ' ')}</td>
                            <td>{p.reference_number || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selected.notes && (
                <div style={{ marginTop: '16px' }}>
                  <div className="detail-item"><div className="label">Notes</div><div className="value">{selected.notes}</div></div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-secondary btn-sm" onClick={handleEdit}>Edit</button>
              {selected.status !== 'paid' && (
                <button className="btn btn-success btn-sm" onClick={() => {
                  setPaymentForm({ amount: (Number(selected.total_amount) - Number(selected.paid_amount || 0)).toFixed(2), payment_method: 'credit_card', reference_number: '', notes: '' });
                  setShowPaymentModal(true);
                }}>Record Payment</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Invoice' : 'New Invoice'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Patient</label>
                  <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} required>
                    <option value="">Select Patient</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '10px', display: 'block' }}>Line Items</label>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                    <input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="1" required />
                    <input type="number" placeholder="Price" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} step="0.01" min="0" required />
                    {form.items.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>×</button>}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem} style={{ marginBottom: '16px' }}>+ Add Item</button>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tax Rate (%)</label>
                    <input type="number" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: Number(e.target.value) })} step="0.01" min="0" />
                  </div>
                  <div className="form-group">
                    <label>Subtotal</label>
                    <input value={`$${subtotal.toFixed(2)}`} disabled />
                  </div>
                </div>

                {editMode && (
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create'} Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Amount</label>
                  <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} step="0.01" min="0.01" required />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Reference Number</label>
                  <input value={paymentForm.reference_number} onChange={e => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows="2" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;
