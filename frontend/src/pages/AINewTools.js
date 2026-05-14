import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResponse from '../components/AIResponse';

const SAMPLE_PATIENT_PROFILE = `{
  "patient_id": 12,
  "age": 34,
  "no_show_history_12mo": 2,
  "last_visit_days_ago": 380,
  "insurance_status": "active",
  "preferred_contact": "sms"
}`;

const SAMPLE_APPOINTMENT_DETAILS = `{
  "appointment_id": 4521,
  "type": "Cleaning",
  "scheduled_for": "2026-05-15T09:00:00Z",
  "weather_forecast": "rain",
  "lead_time_days": 21
}`;

const SAMPLE_PATIENT_LIST = `[
  { "patient_id": 1, "name": "Jane Doe", "last_visit": "2024-09-01", "treatment_history": ["cleaning"] },
  { "patient_id": 2, "name": "Bob Smith", "last_visit": "2025-02-12", "treatment_history": ["root canal", "crown"] },
  { "patient_id": 3, "name": "Carla Reed", "last_visit": "2023-08-22", "treatment_history": ["cleaning", "perio"] }
]`;

const NEW_AI_FEATURES = [
  {
    id: 'predict-no-show',
    title: 'Predict No-Show',
    description: 'Estimate appointment no-show probability from patient and appointment data.',
    icon: '📅',
    endpoint: '/ai/predict-no-show',
    fields: [
      { key: 'patient_profile', label: 'Patient Profile (JSON or text)', type: 'textarea', required: true, placeholder: SAMPLE_PATIENT_PROFILE, parseJson: true },
      { key: 'appointment_details', label: 'Appointment Details (JSON or text)', type: 'textarea', required: true, placeholder: SAMPLE_APPOINTMENT_DETAILS, parseJson: true },
    ],
    resultKey: 'prediction',
    buttonText: 'Predict No-Show',
  },
  {
    id: 'identify-recall-candidates',
    title: 'Identify Recall Candidates',
    description: 'Rank a patient list for a recall campaign with reasons and exclusions.',
    icon: '📧',
    endpoint: '/ai/identify-recall-candidates',
    fields: [
      { key: 'patient_list', label: 'Patient List (JSON array)', type: 'textarea', required: true, placeholder: SAMPLE_PATIENT_LIST, parseJsonArray: true },
      { key: 'recall_criteria', label: 'Recall Criteria (optional, text or JSON)', type: 'textarea', placeholder: 'Patients overdue for 6-month cleaning' },
    ],
    resultKey: 'recall_candidates',
    buttonText: 'Identify Candidates',
  },
  {
    id: 'predict-treatment-outcome',
    title: 'Predict Treatment Outcome',
    description: 'Estimate clinical outcome probability and recovery for a planned treatment.',
    icon: '🧪',
    endpoint: '/ai/predict-treatment-outcome',
    fields: [
      { key: 'patient_profile', label: 'Patient Profile (JSON or text)', type: 'textarea', required: true, placeholder: SAMPLE_PATIENT_PROFILE, parseJson: true },
      { key: 'treatment_plan', label: 'Treatment Plan (JSON or text)', type: 'textarea', required: true, placeholder: '{ "diagnosis": "Caries on #19", "procedure": "Composite filling", "estimated_cost": 250 }', parseJson: true },
    ],
    resultKey: 'prediction',
    buttonText: 'Predict Outcome',
  },
  {
    id: 'patient-risk-scoring',
    title: 'Patient Risk Scoring',
    description: 'Stratify caries, perio, and adherence risk for a patient.',
    icon: '⚠️',
    endpoint: '/ai/patient-risk-scoring',
    fields: [
      { key: 'patient_profile', label: 'Patient Profile (JSON or text)', type: 'textarea', required: true, placeholder: SAMPLE_PATIENT_PROFILE, parseJson: true },
      { key: 'history', label: 'Treatment / Medical History (optional)', type: 'textarea', placeholder: '{ "perio_history": "stage I", "smoker": false }', parseJson: true },
    ],
    resultKey: 'risk_assessment',
    buttonText: 'Score Risk',
  },
  {
    id: 'optimize-scheduling',
    title: 'Optimize Scheduling',
    description: 'Suggest schedule optimizations for the next day or week.',
    icon: '🗓️',
    endpoint: '/ai/optimize-scheduling',
    fields: [
      { key: 'current_schedule', label: 'Current Schedule (JSON)', type: 'textarea', required: true, placeholder: '[{ "time":"09:00","provider":"Dr. Lee","type":"Cleaning","duration":60 }]', parseJson: true },
      { key: 'constraints', label: 'Constraints (optional, JSON or text)', type: 'textarea', placeholder: '{ "max_per_provider": 8, "lunch_block": "12:00-12:30" }', parseJson: true },
    ],
    resultKey: 'optimization',
    buttonText: 'Optimize',
  },
  {
    id: 'insurance-claim-optimization',
    title: 'Insurance Claim Optimization',
    description: 'Review a claim and recommend codes, narrative, and attachments.',
    icon: '🏥',
    endpoint: '/ai/insurance-claim-optimization',
    fields: [
      { key: 'claim', label: 'Claim (JSON or text)', type: 'textarea', required: true, placeholder: '{ "patient_id": 12, "procedures": ["D2391"], "narrative": "..." }', parseJson: true },
      { key: 'patient_context', label: 'Patient Context (optional, JSON or text)', type: 'textarea', placeholder: '{ "insurance_provider": "Aetna" }', parseJson: true },
    ],
    resultKey: 'optimization',
    buttonText: 'Optimize Claim',
  },
];

function AINewTools() {
  const [activeId, setActiveId] = useState(NEW_AI_FEATURES[0].id);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  const setFieldValue = (featureId, key, value) => {
    setForms((prev) => ({ ...prev, [featureId]: { ...(prev[featureId] || {}), [key]: value } }));
  };

  const handleSubmit = async (feature) => {
    const form = forms[feature.id] || {};
    const missing = feature.fields.find((f) => f.required && !String(form[f.key] || '').trim());
    if (missing) {
      toast.warning(`${missing.label} is required`);
      return;
    }

    const payload = {};
    for (const f of feature.fields) {
      const raw = form[f.key];
      if (raw === undefined || raw === '') continue;
      if (f.parseJson || f.parseJsonArray) {
        try {
          const parsed = JSON.parse(raw);
          if (f.parseJsonArray && !Array.isArray(parsed)) {
            toast.warning(`${f.label} must be a JSON array`);
            return;
          }
          payload[f.key] = parsed;
        } catch {
          payload[f.key] = raw;
        }
      } else {
        payload[f.key] = raw;
      }
    }

    setLoading((prev) => ({ ...prev, [feature.id]: true }));
    setResults((prev) => ({ ...prev, [feature.id]: null }));
    setErrors((prev) => ({ ...prev, [feature.id]: null }));

    try {
      const res = await api.post(feature.endpoint, payload);
      const data = res.data;
      setResults((prev) => ({ ...prev, [feature.id]: { data, model: data.model, usage: data.usage } }));
      toast.success(`${feature.title} completed`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setErrors((prev) => ({ ...prev, [feature.id]: msg }));
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading((prev) => ({ ...prev, [feature.id]: false }));
    }
  };

  const formatResult = (feature, data) => {
    if (!data) return '';
    const main = data[feature.resultKey];
    if (!main) return JSON.stringify(data, null, 2);
    if (typeof main === 'string') return main;
    if (main.raw) return main.raw;
    return '```json\n' + JSON.stringify(main, null, 2) + '\n```';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>AI New Tools</h2>
          <p>No-show prediction and recall candidate identification</p>
        </div>
      </div>

      <div className="ai-tools-tabs" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {NEW_AI_FEATURES.map((f) => (
          <button
            key={f.id}
            className={`btn ${activeId === f.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveId(f.id)}
          >
            <span style={{ marginRight: 6 }}>{f.icon}</span>
            {f.title}
          </button>
        ))}
      </div>

      {NEW_AI_FEATURES.filter((f) => f.id === activeId).map((feature) => {
        const isLoading = loading[feature.id];
        const result = results[feature.id];
        const error = errors[feature.id];
        const form = forms[feature.id] || {};

        return (
          <div key={feature.id} className="table-container" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>{feature.icon} {feature.title}</h3>
            <p style={{ color: '#64748b', marginTop: 0 }}>{feature.description}</p>

            {feature.fields.map((f) => (
              <div className="form-group" key={f.key}>
                <label>
                  {f.label}{f.required ? ' *' : ''}
                </label>
                <textarea
                  rows={8}
                  placeholder={f.placeholder}
                  value={form[f.key] || ''}
                  onChange={(e) => setFieldValue(feature.id, f.key, e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 13, width: '100%' }}
                />
              </div>
            ))}

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ai"
                onClick={() => handleSubmit(feature)}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : `🤖 ${feature.buttonText}`}
              </button>
            </div>

            {isLoading && (
              <div className="ai-response" style={{ marginTop: 16, textAlign: 'center' }}>
                <div className="loading-spinner"><div className="spinner"></div> AI is analyzing...</div>
              </div>
            )}

            {error && !isLoading && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: 8,
                fontSize: 13,
              }}>
                Error: {error}
              </div>
            )}

            {result && !isLoading && (
              <AIResponse
                content={formatResult(feature, result.data)}
                model={result.model}
                usage={result.usage}
                title={feature.title}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default AINewTools;
