import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading dashboard...</div>;

  const cards = [
    { icon: '👥', label: 'Total Patients', value: stats?.totalPatients || 0, path: '/patients', color: '#3b82f6' },
    { icon: '📅', label: 'Upcoming Appointments', value: stats?.upcomingAppointments || 0, path: '/scheduling', color: '#10b981' },
    { icon: '🏥', label: 'Pending Claims', value: stats?.pendingClaims || 0, path: '/insurance', color: '#f59e0b' },
    { icon: '📋', label: 'Active Treatments', value: stats?.activeTreatments || 0, path: '/treatments', color: '#8b5cf6' },
    { icon: '💰', label: 'Unpaid Invoices', value: stats?.unpaidInvoices || 0, path: '/billing', color: '#ef4444' },
    { icon: '⚠️', label: 'Low Stock Items', value: stats?.lowStockItems || 0, path: '/inventory', color: '#06b6d4' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back! Here's your practice overview.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {cards.map((card, i) => (
          <div key={i} className="stat-card" onClick={() => navigate(card.path)}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Quick Stats</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Today's Appointments</span>
              <strong>{stats?.todayAppointments || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Total Revenue (Approved)</span>
              <strong style={{ color: '#10b981' }}>${stats?.totalRevenue?.toLocaleString() || '0'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Pending X-Ray Reviews</span>
              <strong style={{ color: '#f59e0b' }}>{stats?.pendingXrays || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ color: '#64748b' }}>Recall Campaigns Pending</span>
              <strong style={{ color: '#8b5cf6' }}>{stats?.pendingRecalls || 0}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>AI Features</h3>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: '16px', padding: '14px', background: '#f5f3ff', borderRadius: '12px' }}>
              <div style={{ fontWeight: 600, color: '#5b21b6', fontSize: '14px', marginBottom: '4px' }}>X-Ray AI Analysis</div>
              <div style={{ color: '#7c3aed', fontSize: '13px' }}>Automated pathology detection and annotations</div>
            </div>
            <div style={{ marginBottom: '16px', padding: '14px', background: '#f0fdf4', borderRadius: '12px' }}>
              <div style={{ fontWeight: 600, color: '#166534', fontSize: '14px', marginBottom: '4px' }}>Treatment Plan AI</div>
              <div style={{ color: '#16a34a', fontSize: '13px' }}>Evidence-based treatment recommendations</div>
            </div>
            <div style={{ marginBottom: '16px', padding: '14px', background: '#fffbeb', borderRadius: '12px' }}>
              <div style={{ fontWeight: 600, color: '#92400e', fontSize: '14px', marginBottom: '4px' }}>Insurance Pre-Auth AI</div>
              <div style={{ color: '#b45309', fontSize: '13px' }}>Automated pre-authorization letters</div>
            </div>
            <div style={{ padding: '14px', background: '#f0f9ff', borderRadius: '12px' }}>
              <div style={{ fontWeight: 600, color: '#075985', fontSize: '14px', marginBottom: '4px' }}>Recall Campaign AI</div>
              <div style={{ color: '#0284c7', fontSize: '13px' }}>Personalized patient outreach messages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
