import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ adjustment: 0, reason: '' });
  const [form, setForm] = useState({
    name: '', category: '', sku: '', quantity: 0, unit: 'units', unit_cost: 0, reorder_level: 10, supplier: '', notes: ''
  });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/inventory');
      setItems(res.data);
    } catch (err) { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await api.get(`/inventory/${id}`);
      setSelected(res.data);
      setShowDetail(true);
    } catch (err) { toast.error('Failed to load item details'); }
  };

  const handleNew = () => {
    setForm({ name: '', category: '', sku: '', quantity: 0, unit: 'units', unit_cost: 0, reorder_level: 10, supplier: '', notes: '' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    setForm({
      name: selected.name || '', category: selected.category || '', sku: selected.sku || '',
      quantity: selected.quantity || 0, unit: selected.unit || 'units', unit_cost: selected.unit_cost || 0,
      reorder_level: selected.reorder_level || 10, supplier: selected.supplier || '', notes: selected.notes || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/inventory/${selected.id}`, form);
        toast.success('Item updated');
      } else {
        await api.post('/inventory', form);
        toast.success('Item added');
      }
      setShowModal(false);
      fetchItems();
    } catch (err) { toast.error('Failed to save item'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/inventory/${selected.id}`);
      toast.success('Item deleted');
      setShowDetail(false);
      fetchItems();
    } catch (err) { toast.error('Failed to delete item'); }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/inventory/${selected.id}/adjust`, adjustForm);
      toast.success('Stock adjusted');
      setShowAdjust(false);
      const res = await api.get(`/inventory/${selected.id}`);
      setSelected(res.data);
      fetchItems();
    } catch (err) { toast.error('Failed to adjust stock'); }
  };

  const filtered = items.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter(i => i.quantity <= i.reorder_level).length;
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * Number(i.unit_cost)), 0);
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading inventory...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Inventory Management</h2>
          <p>Track dental supplies and equipment</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ Add Item</button>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value" style={{ color: lowStockCount > 0 ? '#ef4444' : '#10b981' }}>{lowStockCount}</div>
          <div className="stat-label">Low Stock Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📂</div>
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-value">${totalValue.toFixed(0)}</div>
          <div className="stat-label">Total Value</div>
        </div>
      </div>

      <div className="search-bar">
        <input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">📦</div><h3>No items found</h3><p>Add your first inventory item</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>SKU</th><th>Quantity</th><th>Unit Cost</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} onClick={() => handleRowClick(item.id)}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.sku}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>${Number(item.unit_cost).toFixed(2)}</td>
                  <td>${(item.quantity * Number(item.unit_cost)).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${item.quantity <= item.reorder_level ? 'badge-denied' : item.quantity <= item.reorder_level * 2 ? 'badge-partial' : 'badge-completed'}`}>
                      {item.quantity <= item.reorder_level ? 'Low Stock' : item.quantity <= item.reorder_level * 2 ? 'Moderate' : 'In Stock'}
                    </span>
                  </td>
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
              <h3>{selected.name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="label">Category</div><div className="value">{selected.category || '-'}</div></div>
                <div className="detail-item"><div className="label">SKU</div><div className="value">{selected.sku || '-'}</div></div>
                <div className="detail-item"><div className="label">Quantity</div><div className="value">{selected.quantity} {selected.unit}</div></div>
                <div className="detail-item"><div className="label">Unit Cost</div><div className="value">${Number(selected.unit_cost).toFixed(2)}</div></div>
                <div className="detail-item"><div className="label">Total Value</div><div className="value">${(selected.quantity * Number(selected.unit_cost)).toFixed(2)}</div></div>
                <div className="detail-item"><div className="label">Reorder Level</div><div className="value">{selected.reorder_level} {selected.unit}</div></div>
                <div className="detail-item"><div className="label">Supplier</div><div className="value">{selected.supplier || '-'}</div></div>
                <div className="detail-item"><div className="label">Status</div><div className="value">
                  <span className={`badge ${selected.quantity <= selected.reorder_level ? 'badge-denied' : 'badge-completed'}`}>
                    {selected.quantity <= selected.reorder_level ? 'Low Stock - Reorder Now' : 'In Stock'}
                  </span>
                </div></div>
                {selected.notes && <div className="detail-item detail-full"><div className="label">Notes</div><div className="value">{selected.notes}</div></div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-secondary btn-sm" onClick={handleEdit}>Edit</button>
              <button className="btn btn-success btn-sm" onClick={() => { setAdjustForm({ adjustment: 0, reason: '' }); setShowAdjust(true); }}>Adjust Stock</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Item' : 'Add Item'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. PPE, Restorative, Anesthesia" />
                  </div>
                  <div className="form-group">
                    <label>SKU</label>
                    <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      <option value="units">Units</option>
                      <option value="pairs">Pairs</option>
                      <option value="boxes">Boxes</option>
                      <option value="packs">Packs</option>
                      <option value="syringes">Syringes</option>
                      <option value="tubes">Tubes</option>
                      <option value="cartridges">Cartridges</option>
                      <option value="carpules">Carpules</option>
                      <option value="jars">Jars</option>
                      <option value="kits">Kits</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Unit Cost ($)</label>
                    <input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: Number(e.target.value) })} step="0.01" min="0" />
                  </div>
                  <div className="form-group">
                    <label>Reorder Level</label>
                    <input type="number" value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: Number(e.target.value) })} min="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Supplier</label>
                  <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Add'} Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {showAdjust && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adjust Stock</h3>
              <button className="modal-close" onClick={() => setShowAdjust(false)}>×</button>
            </div>
            <form onSubmit={handleAdjust}>
              <div className="modal-body">
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
                  Current: <strong>{selected?.quantity} {selected?.unit}</strong>. Use positive numbers to add, negative to remove.
                </p>
                <div className="form-group">
                  <label>Adjustment</label>
                  <input type="number" value={adjustForm.adjustment} onChange={e => setAdjustForm({ ...adjustForm, adjustment: Number(e.target.value) })} required />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="e.g. Received shipment, Used in procedure" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
