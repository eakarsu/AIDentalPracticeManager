export const DENTAL_NATIVE_TOOLS = [
  { id: 'predict-no-show', title: 'Predict No-Show', source: 'appointment', resultKey: 'prediction', fields: [ ['patient_profile', 'Patient profile', true, true], ['appointment_details', 'Appointment details', true, true] ] },
  { id: 'identify-recall-candidates', title: 'Identify Recall Candidates', source: 'patients', resultKey: 'recall_candidates', fields: [ ['patient_list', 'Patient list', true, true, true], ['recall_criteria', 'Recall criteria (optional)', false] ] },
  { id: 'predict-treatment-outcome', title: 'Predict Treatment Outcome', source: 'treatment', resultKey: 'prediction', fields: [ ['patient_profile', 'Patient profile', true, true], ['treatment_plan', 'Treatment plan', true, true] ] },
  { id: 'patient-risk-scoring', title: 'Patient Risk Scoring', source: 'patient', resultKey: 'risk_assessment', fields: [ ['patient_profile', 'Patient profile', true, true], ['history', 'Medical / treatment history (optional)', false, true] ] },
  { id: 'optimize-scheduling', title: 'Optimize Scheduling', source: 'appointments', resultKey: 'optimization', fields: [ ['current_schedule', 'Current schedule', true, true], ['constraints', 'Constraints (optional)', false, true] ] },
  { id: 'insurance-claim-optimization', title: 'Insurance Claim Optimization', source: 'claim', resultKey: 'optimization', fields: [ ['claim', 'Insurance claim', true, true], ['patient_context', 'Patient context (optional)', false, true] ] },
  { id: 'insurance-preauth', title: 'Saved Treatment Pre-Authorization', source: 'treatment', resultKey: 'preauth_assessment', fields: [ ['treatment_id', 'Actual saved treatment ID', true, true, false, true], ['review_focus', 'Review focus (optional)', false] ] },
  { id: 'treatment-plan-summary', title: 'Complete Treatment Summary', source: 'patient_treatments', resultKey: 'patient_summary', fields: [ ['patient_id', 'Actual saved patient ID', true, true, false, true], ['review_focus', 'Review focus (optional)', false] ] },
  { id: 'practice-insights', title: 'Practice Performance Insights', source: 'practice', resultKey: 'insights', fields: [ ['date_range.start', 'Start date (optional)', false, false, false, false, 'date'], ['date_range.end', 'End date (optional, inclusive)', false, false, false, false, 'date'], ['review_focus', 'Review focus (optional)', false] ] },
  { id: 'soap-note-draft', title: 'Documented SOAP Note Draft', source: 'note', endpoint: '/notes/ai-draft', resultKey: 'draft', fields: [ ['patient_id', 'Actual saved patient ID', true, true, false, true], ['chief_complaint', 'Documented chief complaint', true], ['procedures_performed', 'Documented procedures (optional)', false], ['tooth_numbers', 'Documented tooth numbers (optional)', false], ['review_focus', 'Review focus (optional)', false] ] },
  { id: 'recall-message', title: 'Saved Recall Message Draft', source: 'recall', endpoint: '/recalls/ai-message', resultKey: 'generated_message', fields: [ ['recall_id', 'Actual saved recall ID', true, true, false, true], ['review_focus', 'Review focus (optional)', false] ] },
].map(tool => ({ ...tool, endpoint: tool.endpoint || '/ai/' + tool.id, fields: tool.fields.map(([key, label, required, json, array, readOnly, type]) => ({ key, label, required, json, array, readOnly, type })) }));
export const DENTAL_DEMO_CHOICES = [
  { label: 'Demo AI · Concise review', focus: 'Review the supplied saved records concisely. Identify undocumented facts and decisions requiring qualified human review.', count: 3 },
  { label: 'Demo AI · Team review', focus: 'Review handoffs and source gaps in the supplied saved records. Preserve documented facts and identify questions for qualified human review.', count: 5 },
  { label: 'Demo AI · Detailed review', focus: 'Provide a detailed evidence checklist for the supplied saved records. Distinguish documented facts, unknowns and recommendations requiring qualified human review.', count: Infinity },
];
const sameId = (a, b) => String(a) === String(b), byId = (rows, id) => rows.find(row => sameId(row.id, id));
const parse = value => { try { return JSON.parse(value); } catch { return value; } };
const json = value => JSON.stringify(value, null, 2);
const pick = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key] === undefined ? null : row[key]]));
const profile = p => ({ patient_id: p.id, ...pick(p, ['first_name', 'last_name', 'date_of_birth', 'insurance_provider', 'medical_history', 'allergies']) });
const appointment = r => ({ appointment_id: r.id, ...pick(r, ['patient_id', 'appointment_date', 'duration_minutes', 'appointment_type', 'provider', 'operatory', 'status']) });
const treatment = r => ({ treatment_plan_id: r.id, ...pick(r, ['patient_id', 'diagnosis', 'treatment_description', 'procedures', 'estimated_cost', 'priority', 'status', 'start_date', 'end_date', 'notes']) });
const claim = r => ({ claim_id: r.id, ...pick(r, ['patient_id', 'treatment_plan_id', 'insurance_provider', 'policy_number', 'claim_amount', 'procedure_codes', 'status', 'submission_date']) });
const sameSourceContext = (previous, derived) => ['patient_id', 'appointment_id', 'treatment_plan_id', 'claim_id'].every(key => previous[key] === undefined || derived[key] === undefined || sameId(previous[key], derived[key]));
function reviewed(raw, derived) { const previous = typeof raw === 'string' && raw.trim() ? parse(raw) : null; if (previous && typeof previous === 'object' && !Array.isArray(previous)) return sameSourceContext(previous, derived) ? { ...previous, ...derived } : derived; return typeof previous === 'string' && previous.trim() ? { ...derived, reviewed_manual_context: previous } : derived; }
function recordArray(raw, records, convert, identity) { const previous = parse(raw); return records.map(row => { const value = convert(row), old = Array.isArray(previous) && previous.find(item => item && typeof item === 'object' && sameId(item[identity], value[identity]) && sameSourceContext(item, value)); return old ? { ...old, ...value } : value; }); }
export function sourceRows(body, name) { const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : null; if (!rows || rows.some(row => !row || typeof row !== 'object' || !Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1)) throw new Error(`${name} returned an invalid saved-record list. Try loading it again.`); return rows; }
export async function loadDentalNativeSources(api, signal) {
  const endpoints = { patients: '/patients', appointments: '/scheduling', treatments: '/treatments', claims: '/insurance', notes: '/notes', recalls: '/recalls' }, keys = Object.keys(endpoints), sources = { patients: [], appointments: [], treatments: [], claims: [], notes: [], recalls: [] }, errors = {};
  const results = await Promise.allSettled(keys.map(async key => sourceRows((await api.get(endpoints[key], { signal })).data, key)));
  results.forEach((result, index) => { const key = keys[index]; if (result.status === 'fulfilled') sources[key] = result.value; else { const issue = result.reason?.response?.data?.error; errors[key] = (typeof issue === 'string' ? issue : issue?.message) || result.reason?.message || `Saved ${key} could not be loaded.`; } });
  return { sources, errors };
}
const collectionName = source => ({ appointment: 'appointments', treatment: 'treatments', claim: 'claims', note: 'notes', recall: 'recalls' })[source];
const linkedSources = ['appointment', 'treatment', 'claim', 'note', 'recall'];
export function dentalSourceRequestValues(tool, selection) {
  if (tool.id === 'insurance-preauth') return { treatment_id: selection.treatmentId || '' };
  if (tool.id === 'treatment-plan-summary' || tool.id === 'soap-note-draft') return { patient_id: selection.patientId || '' };
  if (tool.id === 'recall-message') return { recall_id: selection.recallId || '' };
  return {};
}
export function dentalSourceSelectionMissing(tool, sources, selected = {}) {
  if (selected.patientId && !byId(sources.patients, selected.patientId)) return true;
  if (selected.patientIds?.some(id => !byId(sources.patients, id)) || selected.appointmentIds?.some(id => !byId(sources.appointments, id))) return true;
  if (linkedSources.includes(tool.source) && selected[tool.source + 'Id']) {
    const record = byId(sources[collectionName(tool.source)], selected[tool.source + 'Id']);
    if (!record || (selected.patientId && !sameId(record.patient_id, selected.patientId))) return true;
  }
  return tool.source === 'patient_treatments' && selected.patientId && !sources.treatments.some(row => sameId(row.patient_id, selected.patientId));
}
export function dentalSourcePrerequisite(tool, sources, selected = {}, form = {}) {
  if (tool.source === 'practice') return '';
  if (tool.source === 'patients' && selected.patientIds?.some(id => !byId(sources.patients, id))) return 'A selected recall patient is unavailable. Choose accessible saved patients before filling an example.';
  if (tool.source === 'appointments' && selected.appointmentIds?.some(id => !byId(sources.appointments, id))) return 'A selected appointment is unavailable. Choose saved appointments before filling an example.';
  if (tool.source === 'appointments') return sources.appointments.length ? '' : 'Load at least one saved appointment to fill the complete schedule example.';
  if (!sources.patients.length) return 'Load at least one saved patient to fill a complete example.';
  const patient = selected.patientId ? byId(sources.patients, selected.patientId) : null;
  if (selected.patientId && !patient) return 'Choose an accessible saved patient; the previous selection is unavailable.';
  if (tool.source === 'patient_treatments') return sources.treatments.some(row => byId(sources.patients, row.patient_id) && (!patient || sameId(row.patient_id, patient.id))) ? '' : 'Load a saved treatment plan linked to the selected patient before summarizing actual treatment records.';
  if (linkedSources.includes(tool.source)) {
    const matching = sources[collectionName(tool.source)].filter(r => byId(sources.patients, r.patient_id) && (!patient || sameId(r.patient_id, patient.id)));
    if (selected[tool.source + 'Id'] && !byId(matching, selected[tool.source + 'Id'])) return `The selected ${tool.source} is unavailable or belongs to another patient. Choose a matching saved record.`;
    const selectedNote = tool.source === 'note' && selected.noteId ? byId(matching, selected.noteId) : null;
    if (tool.source === 'note' && matching.length && !String(form.chief_complaint || '').trim() && !(selectedNote ? String(selectedNote.chief_complaint || '').trim() : matching.some(row => typeof row.chief_complaint === 'string' && row.chief_complaint.trim()))) return 'The saved notes have no documented chief complaint. Enter a verified complaint manually; examples cannot invent a clinical observation.';
    return matching.length ? '' : `Load a saved ${tool.source} linked to ${patient ? 'the selected' : 'an accessible'} patient to fill a complete example.`;
  }
  return '';
}
export function dentalNativeExample(tool, variant, sources, selection = {}, form = {}) {
  const missing = dentalSourcePrerequisite(tool, sources, selection, form); if (missing) throw new Error(missing);
  const choice = DENTAL_DEMO_CHOICES[variant], focus = choice.focus, selected = { ...selection }, values = {};
  if (tool.source === 'practice') {
    const now = new Date(), end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), start = new Date(end);
    if (variant === 2) start.setUTCMonth(0, 1); else start.setUTCDate(start.getUTCDate() - (variant === 1 ? 90 : 30));
    values['date_range.start'] = start.toISOString().slice(0, 10); values['date_range.end'] = end.toISOString().slice(0, 10); values.review_focus = focus;
  } else if (['insurance-preauth', 'treatment-plan-summary', 'soap-note-draft', 'recall-message'].includes(tool.id)) {
    let patient = selection.patientId ? byId(sources.patients, selection.patientId) : null;
    if (tool.source === 'patient_treatments') { patient = patient || sources.patients.find(p => sources.treatments.some(row => sameId(row.patient_id, p.id))); selected.patientId = String(patient.id); values.patient_id = String(patient.id); }
    else {
      const rows = sources[collectionName(tool.source)].filter(r => byId(sources.patients, r.patient_id) && (!patient || sameId(r.patient_id, patient.id)));
      const record = rows.find(row => sameId(row.id, selection[tool.source + 'Id'])) || (tool.source === 'note' ? rows.find(row => String(row.chief_complaint || '').trim()) || rows[0] : rows[0]);
      selected.patientId = String(record.patient_id); selected[tool.source + 'Id'] = String(record.id);
      Object.assign(values, dentalSourceRequestValues(tool, selected));
      if (tool.id === 'soap-note-draft') {
        const sameContext = selection.patientId && sameId(selection.patientId, record.patient_id) && (!selection.noteId || sameId(selection.noteId, record.id));
        for (const key of ['chief_complaint', 'procedures_performed', 'tooth_numbers']) {
          const manual = sameContext && typeof form[key] === 'string' && form[key].trim() ? form[key] : '';
          values[key] = manual || (typeof record[key] === 'string' && record[key].trim() ? record[key] : key === 'chief_complaint' ? '' : 'Not documented; verify the original visit record before clinical use.');
        }
      }
    }
    values.review_focus = focus;
  } else if (tool.source === 'patients') {
    const previous = (selection.patientIds || []).map(id => byId(sources.patients, id)).filter(Boolean), patients = previous.length ? previous : sources.patients.slice(0, choice.count);
    selected.patientIds = patients.map(r => String(r.id)); values.patient_list = json(recordArray(form.patient_list, patients, profile, 'patient_id'));
    values.recall_criteria = `${focus} Verify actual visit dates, recall eligibility and communication consent before outreach. Missing clinical history or consent is undocumented; this request authorizes no messages.`;
  } else if (tool.source === 'appointments') {
    const previous = (selection.appointmentIds || []).map(id => byId(sources.appointments, id)).filter(Boolean), rows = previous.length ? previous : sources.appointments.slice(0, choice.count);
    selected.appointmentIds = rows.map(r => String(r.id)); values.current_schedule = json(recordArray(form.current_schedule, rows, appointment, 'appointment_id'));
    values.constraints = json(reviewed(form.constraints, { review_focus: focus, preserve_existing_appointments: true, authorized_schedule_changes: false, undocumented_capacity_limits: 'Verify actual provider capacity and availability; no operating hours or lunch policy is inferred.' }));
  } else {
    let patient = selection.patientId ? byId(sources.patients, selection.patientId) : null, record;
    if (['appointment', 'treatment', 'claim'].includes(tool.source)) { const rows = sources[collectionName(tool.source)].filter(r => byId(sources.patients, r.patient_id) && (!patient || sameId(r.patient_id, patient.id))); record = rows.find(r => sameId(r.id, selection[tool.source + 'Id'])) || rows[0]; patient = byId(sources.patients, record.patient_id); selected[tool.source + 'Id'] = String(record.id); }
    patient = patient || sources.patients[0]; selected.patientId = String(patient.id);
    if (tool.source === 'claim') {
      values.claim = json(reviewed(form.claim, { ...claim(record), review_focus: focus }));
      values.patient_context = json(reviewed(form.patient_context, { ...profile(patient), review_focus: focus, documentation_limits: 'Missing coverage, service, medical necessity and approval facts remain undocumented. Verify original records; no claim is submitted or approved.' }));
    } else {
      values.patient_profile = json(reviewed(form.patient_profile, { ...profile(patient), review_focus: focus }));
      if (tool.source === 'appointment') values.appointment_details = json(reviewed(form.appointment_details, { ...appointment(record), review_focus: focus, documentation_limits: 'Weather, attendance history and contact permissions are not inferred from this saved appointment.' }));
      if (tool.source === 'treatment') values.treatment_plan = json(reviewed(form.treatment_plan, { ...treatment(record), review_focus: focus, documentation_limits: 'This is the documented treatment plan and status. A proposed procedure is not an observed finding or completed service.' }));
      if (tool.source === 'patient') values.history = json(reviewed(form.history, { patient_id: patient.id, medical_history: patient.medical_history ?? null, allergies: patient.allergies ?? null, treatment_history: sources.treatments.filter(r => sameId(r.patient_id, patient.id)).map(treatment), review_focus: focus, documentation_limits: 'Only loaded saved records are included. Undocumented clinical findings, smoking status and completed procedures are not inferred.' }));
    }
  }
  return { values, selection: selected };
}
export function dentalNativePayload(tool, form) {
  const payload = {};
  for (const field of tool.fields) {
    const raw = form[field.key];
    if (!String(raw ?? '').trim()) { if (field.required) throw new Error(`${field.label} is required.`); continue; }
    const value = field.json ? parse(raw) : raw;
    if (field.array && (!Array.isArray(value) || !value.length)) throw new Error(`${field.label} must contain a nonempty JSON array.`);
    if (field.readOnly && (!Number.isSafeInteger(Number(value)) || Number(value) < 1)) throw new Error('Choose an actual saved source record before generating.');
    if (field.key.startsWith('date_range.')) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error('Enter valid native date filters.'); payload.date_range = { ...payload.date_range, [field.key.slice(11)]: value + (field.key.endsWith('start') ? 'T00:00:00.000Z' : 'T23:59:59.999Z') }; }
    else payload[field.key] = value;
  }
  if (payload.date_range?.start && payload.date_range?.end && payload.date_range.start > payload.date_range.end) throw new Error('The start date must be on or before the end date.');
  return payload;
}
