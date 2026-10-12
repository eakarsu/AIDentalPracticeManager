import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import Login from '../pages/Login';
import AINewTools from '../pages/AINewTools';
import AIReport from './AIReport';
import AIWorkspace, { workspaceFields, workspacePresets } from './AIWorkspace';
import features from './aiWorkspaceFeatures.json';
import { DENTAL_NATIVE_TOOLS, dentalNativeExample, dentalNativePayload } from './dentalNativePresets';
import api from '../services/api';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('../services/api', () => ({ get: jest.fn(), post: jest.fn() }));

const sources = {
  patients: [{ id: 11, first_name: 'Ava', last_name: 'Rivera', medical_history: '', allergies: '' }, { id: 12, first_name: 'Noah', last_name: 'Patel' }],
  appointments: [{ id: 21, patient_id: 11, appointment_date: '2026-10-12', appointment_type: 'Cleaning' }],
  treatments: [{ id: 31, patient_id: 11, diagnosis: 'Documented caries', treatment_description: 'Crown consultation' }],
  claims: [{ id: 41, patient_id: 11, insurance_provider: 'Example insurer', claim_amount: 0 }],
  notes: [{ id: 51, patient_id: 11, chief_complaint: 'Tooth sensitivity', procedures_performed: 'Examination', tooth_numbers: '14' }],
  recalls: [{ id: 61, patient_id: 11, recall_reason: 'Six month hygiene review' }],
};

test('every native AI preset fills required and optional fields using saved references', () => {
  for (const tool of DENTAL_NATIVE_TOOLS) {
    for (let variant = 0; variant < 3; variant++) {
      const { values, selection } = dentalNativeExample(tool, variant, sources);
      for (const field of tool.fields) expect(String(values[field.key] ?? '').trim()).not.toBe('');
      expect(() => dentalNativePayload(tool, values)).not.toThrow();
      if (values.patient_id) expect(sources.patients.map(p => String(p.id))).toContain(values.patient_id);
      if (values.treatment_id) expect(sources.treatments.map(p => String(p.id))).toContain(values.treatment_id);
      if (values.recall_id) expect(sources.recalls.map(p => String(p.id))).toContain(values.recall_id);
      if (selection.appointmentId) expect(sources.appointments.map(p => String(p.id))).toContain(selection.appointmentId);
    }
  }
});

test('workspace presets fill every editable field across all AI report forms', () => {
  for (const feature of features) {
    const presets = workspacePresets(feature);
    expect(presets.length).toBeGreaterThan(1);
    for (const preset of presets) for (const field of workspaceFields) expect(String(preset.values[field.key] ?? '').trim()).not.toBe('');
  }
});

test('native preset button fills optional inputs and saved selections without a request', async () => {
  const endpointSources = { '/patients': sources.patients, '/scheduling': sources.appointments, '/treatments': sources.treatments, '/insurance': sources.claims, '/notes': sources.notes, '/recalls': sources.recalls };
  api.get.mockImplementation(async endpoint => ({ data: endpointSources[endpoint] }));
  api.post.mockClear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<AINewTools />); });
    const preset = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Demo AI · Concise review'));
    await act(async () => { preset.click(); });
    const form = host.querySelector('form');
    expect(form.querySelector('textarea[name=patient_profile]').value).toContain('patient_id');
    expect(form.querySelector('textarea[name=appointment_details]').value).toContain('appointment_id');
    expect(form.querySelector('select[aria-label="Saved patient"]').value).toBe('11');
    expect(form.querySelector('select[aria-label="Saved appointment"]').value).toBe('21');
    expect(api.post).not.toHaveBeenCalled();
    await act(async () => { [...host.querySelectorAll('nav button')].find(button => button.textContent === 'Patient Risk Scoring').click(); });
    await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent.includes('Demo AI · Team review')).click(); });
    expect(host.querySelector('textarea[name=history]').value).toContain('treatment_history');
    expect(api.post).not.toHaveBeenCalled();
  } finally {
    await act(async () => { root.unmount(); });
    host.remove();
  }
});

test('the report renders returned and saved structured JSON, including false, zero and empty strings', () => {
  const result = { summary: { approved: false, estimated_cost: 0, note: '' }, findings: [{ tooth: 14, urgent: false }, { tooth: 15, urgent: true }], next_steps: ['Review chart', 'Confirm consent'] };
  for (const response of [JSON.stringify(result), { id: 9, input: { goal: 'Review' }, result_json: result }]) {
    const markup = renderToStaticMarkup(<AIReport response={response} title="Fixture report" />);
    for (const expected of ['Summary', 'Approved', 'No', 'Estimated cost', '0', 'Note', 'Empty string', '<table', 'Next steps', 'Confirm consent']) expect(markup).toContain(expected);
    expect(markup).not.toContain('<pre>{');
  }
});

test('saved report history opens a structured detail view', async () => {
  const previousFetch = global.fetch;
  const item = { id: 9, model: 'fixture', created_at: '2026-10-10T00:00:00Z', input: { goal: 'Review' }, result_json: { summary: { approved: false, count: 0, note: '' }, findings: [{ label: 'Needs review' }] } };
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ items: [item] }) }));
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<AIWorkspace feature={{ id: 'fixture', title: 'Fixture', description: 'Local fixture' }} />); });
    await act(async () => { host.querySelector('.ai-preset-bar button').click(); });
    for (const field of workspaceFields) expect(host.querySelector(`[id="fixture-${field.key}"]`).value.trim()).not.toBe('');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Saved reports');
    await act(async () => { host.querySelector('.ai-history-row').click(); });
    const detail = document.body.querySelector('.ai-workspace-dialog');
    expect(detail.textContent).toContain('Approved');
    expect(detail.textContent).toContain('No');
    expect(detail.textContent).toContain('Empty string');
    expect(detail.querySelector('table')).not.toBeNull();
  } finally {
    await act(async () => { root.unmount(); });
    host.remove();
    global.fetch = previousFetch;
  }
});

test('demo button fills credentials without invoking login', () => {
  process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL = 'true';
  process.env.REACT_APP_DEMO_EMAIL = 'demo@example.test';
  process.env.REACT_APP_DEMO_PASSWORD = 'fixture-only';
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<Login onLogin={jest.fn()} />));
    const button = [...host.querySelectorAll('button')].find(item => item.textContent.includes('Fill demo credentials'));
    expect(button.type).toBe('button');
    act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(host.querySelector('input[type=email]').value).toBe('demo@example.test');
    expect(host.querySelector('input[type=password]').value).toBe('fixture-only');
    expect(api.post).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    host.remove();
    delete process.env.REACT_APP_DEMO_EMAIL;
    delete process.env.REACT_APP_DEMO_PASSWORD;
    delete process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL;
  }
});
