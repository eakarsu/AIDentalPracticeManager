import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

function Reports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [demographicsData, setDemographicsData] = useState(null);
  const [proceduresData, setProceduresData] = useState(null);
  const [insuranceData, setInsuranceData] = useState(null);

  useEffect(() => { fetchAllReports(); }, []);

  const fetchAllReports = async () => {
    try {
      const [rev, demo, proc, ins] = await Promise.all([
        api.get('/reports/revenue'),
        api.get('/reports/demographics'),
        api.get('/reports/procedures'),
        api.get('/reports/insurance'),
      ]);
      setRevenueData(rev.data);
      setDemographicsData(demo.data);
      setProceduresData(proc.data);
      setInsuranceData(ins.data);
    } catch (err) { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: '💰' },
    { id: 'demographics', label: 'Patient Demographics', icon: '👥' },
    { id: 'procedures', label: 'Procedures', icon: '🦷' },
    { id: 'insurance', label: 'Insurance', icon: '🏥' },
  ];

  const BarChart = ({ data, labelKey, valueKey, color = '#3b82f6', prefix = '' }) => {
    if (!data || data.length === 0) return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No data available</p>;
    const max = Math.max(...data.map(d => Number(d[valueKey])));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '140px', fontSize: '13px', color: '#475569', textAlign: 'right', flexShrink: 0 }}>{d[labelKey]}</div>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: `${max > 0 ? (Number(d[valueKey]) / max * 100) : 0}%`,
                background: color, height: '100%', borderRadius: '6px',
                transition: 'width 0.5s ease', minWidth: Number(d[valueKey]) > 0 ? '2px' : '0'
              }} />
            </div>
            <div style={{ width: '80px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{prefix}{Number(d[valueKey]).toLocaleString()}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div> Loading reports...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Practice performance insights and statistics</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {tabs.map(tab => (
          <button key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab.id)}
          >{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && revenueData && (
        <div>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value">${Number(revenueData.totals?.total_billed || 0).toLocaleString()}</div>
              <div className="stat-label">Total Billed</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value" style={{ color: '#10b981' }}>${Number(revenueData.totals?.total_collected || 0).toLocaleString()}</div>
              <div className="stat-label">Total Collected</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-value" style={{ color: '#f59e0b' }}>${Number(revenueData.totals?.total_outstanding || 0).toLocaleString()}</div>
              <div className="stat-label">Outstanding</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📄</div>
              <div className="stat-value">{revenueData.totals?.total_invoices || 0}</div>
              <div className="stat-label">Total Invoices</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Monthly Revenue</h3></div>
              <div className="card-body">
                <BarChart data={revenueData.monthly} labelKey="month" valueKey="collected" color="#10b981" prefix="$" />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Payment Methods</h3></div>
              <div className="card-body">
                {revenueData.byMethod?.length > 0 ? revenueData.byMethod.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', textTransform: 'capitalize' }}>{m.payment_method?.replace('_', ' ')}</span>
                    <div>
                      <strong>${Number(m.total).toLocaleString()}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>({m.count} payments)</span>
                    </div>
                  </div>
                )) : <p style={{ color: '#94a3b8', textAlign: 'center' }}>No payment data</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demographics Tab */}
      {activeTab === 'demographics' && demographicsData && (
        <div>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{demographicsData.totalPatients}</div>
              <div className="stat-label">Total Patients</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🆕</div>
              <div className="stat-value" style={{ color: '#10b981' }}>{demographicsData.newThisMonth}</div>
              <div className="stat-label">New This Month</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Age Distribution</h3></div>
              <div className="card-body">
                <BarChart data={demographicsData.ageGroups} labelKey="age_group" valueKey="count" color="#8b5cf6" />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Insurance Providers</h3></div>
              <div className="card-body">
                <BarChart data={demographicsData.insuranceBreakdown} labelKey="provider" valueKey="count" color="#3b82f6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Procedures Tab */}
      {activeTab === 'procedures' && proceduresData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Appointment Types</h3></div>
            <div className="card-body">
              <BarChart data={proceduresData.byType} labelKey="procedure_type" valueKey="count" color="#06b6d4" />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>By Provider</h3></div>
            <div className="card-body">
              <BarChart data={proceduresData.byProvider} labelKey="provider" valueKey="count" color="#10b981" />
            </div>
          </div>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Treatment Plan Status</h3></div>
            <div className="card-body">
              <BarChart data={proceduresData.treatmentStatus} labelKey="status" valueKey="count" color="#f59e0b" />
            </div>
          </div>
        </div>
      )}

      {/* Insurance Tab */}
      {activeTab === 'insurance' && insuranceData && (
        <div>
          {insuranceData.approvalRate && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-value" style={{ color: '#10b981' }}>{insuranceData.approvalRate.approved || 0}</div>
                <div className="stat-label">Approved Claims</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">❌</div>
                <div className="stat-value" style={{ color: '#ef4444' }}>{insuranceData.approvalRate.denied || 0}</div>
                <div className="stat-label">Denied Claims</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">
                  {insuranceData.approvalRate.total > 0
                    ? Math.round((insuranceData.approvalRate.approved / insuranceData.approvalRate.total) * 100)
                    : 0}%
                </div>
                <div className="stat-label">Approval Rate</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Claims by Status</h3></div>
              <div className="card-body">
                {insuranceData.byStatus?.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span><span className={`badge badge-${s.status}`}>{s.status}</span></span>
                    <div>
                      <strong>{s.count} claims</strong>
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>(${Number(s.total_amount).toLocaleString()})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: '16px', fontWeight: 600 }}>By Insurance Provider</h3></div>
              <div className="card-body">
                {insuranceData.byProvider?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569' }}>{p.insurance_provider}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div><strong>{p.count} claims</strong></div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Claimed: ${Number(p.total_claimed).toLocaleString()} | Approved: ${Number(p.total_approved).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
