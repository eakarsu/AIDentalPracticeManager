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
import AINewTools from './pages/AINewTools';
import Integrations from './pages/Integrations';
import PortalAndCv from './pages/PortalAndCv';
import CustomViewsPage from './pages/CustomViewsPage';
import PerioRecallReadiness from './pages/PerioRecallReadiness';
import './App.css';

// // === Batch 02 Gaps & Frontend Mounts ===
import CfPredictiveAiDiagnostics from './pages/CfPredictiveAiDiagnostics';
import CfPatientRiskStratification from './pages/CfPatientRiskStratification';
import CfTreatmentOutcomePrediction from './pages/CfTreatmentOutcomePrediction';
import CfAppointmentNoShowPrediction from './pages/CfAppointmentNoShowPrediction';
import CfInsuranceClaimAutomation from './pages/CfInsuranceClaimAutomation';
import GapXraycvLacksAiDiagnosisEndpointDiagnoseFromXray from './pages/GapXraycvLacksAiDiagnosisEndpointDiagnoseFromXray';
import GapMissingPredictTreatmentOutcomeIdentifyRecallCandidates from './pages/GapMissingPredictTreatmentOutcomeIdentifyRecallCandidates';
import GapLimitedPacsIntegrationOnlyIntegrationsJsStub from './pages/GapLimitedPacsIntegrationOnlyIntegrationsJsStub';
import GapNoIntraoralCameraIntegration from './pages/GapNoIntraoralCameraIntegration';
import GapNoElectronicHealthRecordsEhrComplianceLayer from './pages/GapNoElectronicHealthRecordsEhrComplianceLayer';
import GapPatientPortalIsScaffoldedButReminderSystemIncomplete from './pages/GapPatientPortalIsScaffoldedButReminderSystemIncomplete';
import GapNoInsuranceEligibilityVerificationAdapter from './pages/GapNoInsuranceEligibilityVerificationAdapter';
import GapNoWebhooks from './pages/GapNoWebhooks';
import GapNoCalendarIntegrationDespiteScheduling from './pages/GapNoCalendarIntegrationDespiteScheduling';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

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
    { path: '/perio-recall-readiness', label: 'Perio Recall', icon: '🪥' },
    { path: '/billing', label: 'Billing', icon: '💰' },
    { path: '/notes', label: 'Clinical Notes', icon: '📝' },
    { path: '/inventory', label: 'Inventory', icon: '📦' },
    { path: '/reports', label: 'Reports', icon: '📈' },
    { path: '/ai-new-tools', label: 'AI New Tools', icon: '🤖' },
    { path: '/integrations', label: 'Integrations', icon: '🔌' },
    { path: '/portal-cv', label: 'Portal & CV', icon: '🩻' },
    { path: '/custom-views', label: 'Practice Views', icon: '🦷' },
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
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/xrays" element={<XrayAnalysis />} />
          <Route path="/treatments" element={<TreatmentPlans />} />
          <Route path="/insurance" element={<InsuranceClaims />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/recalls" element={<RecallCampaigns />} />
          <Route path="/perio-recall-readiness" element={<PerioRecallReadiness />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/notes" element={<ClinicalNotes />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/ai-new-tools" element={<AINewTools />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/portal-cv" element={<PortalAndCv />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />

        {/* // === Batch 02 Gaps & Frontend Mounts === */}
        <Route path="/cf/predictive-ai-diagnostics" element={<CfPredictiveAiDiagnostics />} />
        <Route path="/cf/patient-risk-stratification" element={<CfPatientRiskStratification />} />
        <Route path="/cf/treatment-outcome-prediction" element={<CfTreatmentOutcomePrediction />} />
        <Route path="/cf/appointment-no-show-prediction" element={<CfAppointmentNoShowPrediction />} />
        <Route path="/cf/insurance-claim-automation" element={<CfInsuranceClaimAutomation />} />
        <Route path="/gap/xraycv-lacks-ai-diagnosis-endpoint-diagnose-from-xray" element={<GapXraycvLacksAiDiagnosisEndpointDiagnoseFromXray />} />
        <Route path="/gap/missing-predict-treatment-outcome-identify-recall-candidates" element={<GapMissingPredictTreatmentOutcomeIdentifyRecallCandidates />} />
        <Route path="/gap/limited-pacs-integration-only-integrations-js-stub" element={<GapLimitedPacsIntegrationOnlyIntegrationsJsStub />} />
        <Route path="/gap/no-intraoral-camera-integration" element={<GapNoIntraoralCameraIntegration />} />
        <Route path="/gap/no-electronic-health-records-ehr-compliance-layer" element={<GapNoElectronicHealthRecordsEhrComplianceLayer />} />
        <Route path="/gap/patient-portal-is-scaffolded-but-reminder-system-incomplete" element={<GapPatientPortalIsScaffoldedButReminderSystemIncomplete />} />
        <Route path="/gap/no-insurance-eligibility-verification-adapter" element={<GapNoInsuranceEligibilityVerificationAdapter />} />
        <Route path="/gap/no-webhooks" element={<GapNoWebhooks />} />
        <Route path="/gap/no-calendar-integration-despite-scheduling" element={<GapNoCalendarIntegrationDespiteScheduling />} />
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
