import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import XrayAnalysis from './pages/XrayAnalysis';
import TreatmentPlans from './pages/TreatmentPlans';
import InsuranceClaims from './pages/InsuranceClaims';
import Scheduling from './pages/Scheduling';
import RecallCampaigns from './pages/RecallCampaigns';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import ClinicalNotes from './pages/ClinicalNotes';
import './App.css';

function AppContent() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" />;
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/patients', label: 'Patients', icon: '👥' },
    { path: '/xrays', label: 'X-Ray Analysis', icon: '🔬' },
    { path: '/treatments', label: 'Treatment Plans', icon: '📋' },
    { path: '/insurance', label: 'Insurance', icon: '🏥' },
    { path: '/scheduling', label: 'Scheduling', icon: '📅' },
    { path: '/recalls', label: 'Recall Campaigns', icon: '📧' },
    { path: '/billing', label: 'Billing', icon: '💰' },
    { path: '/notes', label: 'Clinical Notes', icon: '📝' },
    { path: '/inventory', label: 'Inventory', icon: '📦' },
    { path: '/reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <div className="app">
      {user && (
        <nav className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              <span className="logo-icon">🦷</span>
              <div>
                <h1>DentalAI</h1>
                <span className="logo-sub">Practice Manager</span>
              </div>
            </div>
          </div>
          <div className="nav-items">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">{user.name?.charAt(0)}</div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      )}
      <main className={user ? 'main-content' : 'main-content full'}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/xrays" element={<XrayAnalysis />} />
          <Route path="/treatments" element={<TreatmentPlans />} />
          <Route path="/insurance" element={<InsuranceClaims />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/recalls" element={<RecallCampaigns />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/notes" element={<ClinicalNotes />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
