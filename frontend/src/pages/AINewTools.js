import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import AIReport from '../components/AIReport';
import { DENTAL_NATIVE_TOOLS, DENTAL_DEMO_CHOICES, dentalNativeExample, dentalNativePayload, dentalSourcePrerequisite, dentalSourceSelectionMissing, dentalSourceRequestValues, loadDentalNativeSources } from '../components/dentalNativePresets';

const sameId = (a, b) => String(a) === String(b);
const patientName = p => `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Patient ${p.id}`;
const collection = source => ({ appointment: 'appointments', treatment: 'treatments', claim: 'claims', note: 'notes', recall: 'recalls' })[source];
const linkedSources = ['appointment', 'treatment', 'claim', 'note', 'recall'];
const recordLabel = (r, source) => source === 'appointment' ? `${r.appointment_date || 'Date undocumented'} · ${r.appointment_type || 'Type undocumented'} · #${r.id}` : source === 'treatment' ? `${r.diagnosis || r.treatment_description || 'Saved treatment plan'} · #${r.id}` : source === 'note' ? `Note #${r.id} · ${r.chief_complaint || 'Complaint undocumented'}` : source === 'recall' ? `Recall #${r.id} · ${r.recall_reason || r.campaign_type || 'Reason undocumented'}` : `Claim #${r.id} · ${r.insurance_provider || 'Insurer undocumented'}`;

export default function AINewTools() {
  const [activeId, setActiveId] = useState(DENTAL_NATIVE_TOOLS[0].id), [forms, setForms] = useState({}), [selections, setSelections] = useState({});
  const [sources, setSources] = useState({ patients: [], appointments: [], treatments: [], claims: [], notes: [], recalls: [] }), [sourceErrors, setSourceErrors] = useState({}), [loadingSources, setLoadingSources] = useState(true);
  const [result, setResult] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const request = useRef(null), sourceRequest = useRef(null);
  const loadSources = useCallback(async () => {
    if (request.current) return;
    sourceRequest.current?.abort(); const controller = new AbortController(); sourceRequest.current = controller; setLoadingSources(true);
    try { const loaded = await loadDentalNativeSources(api, controller.signal); if (sourceRequest.current === controller && !controller.signal.aborted) { setSources(loaded.sources); setSourceErrors(loaded.errors); } }
    finally { if (sourceRequest.current === controller && !controller.signal.aborted) { sourceRequest.current = null; setLoadingSources(false); } }
  }, []);
  useEffect(() => { void loadSources(); return () => { sourceRequest.current?.abort(); request.current?.abort(); sourceRequest.current = null; request.current = null; }; }, [loadSources]);
  const tool = DENTAL_NATIVE_TOOLS.find(t => t.id === activeId), form = forms[activeId] || {}, selection = selections[activeId] || {};
  const prerequisite = loadingSources ? 'Loading accessible saved source records…' : dentalSourcePrerequisite(tool, sources, selection, form);
  const changeField = (key, value) => { if (busy || loadingSources) return; setForms(current => ({ ...current, [activeId]: { ...(current[activeId] || {}), [key]: value } })); setResult(null); };
  const changeSource = (key, value) => {
    if (busy || loadingSources) return;
    setSelections(current => ({ ...current, [activeId]: key === 'patientId' ? { patientId: value } : { ...(current[activeId] || {}), [key]: value } }));
    const nextSelection = key === 'patientId' ? { patientId: value } : { ...selection, [key]: value };
    setForms(current => ({ ...current, [activeId]: dentalSourceRequestValues(tool, nextSelection) })); setResult(null); setNotice('Source selection changed. Choose a Demo AI button or enter verified request context.');
  };
  const fill = variant => {
    if (busy || loadingSources) return;
    try { const example = dentalNativeExample(tool, variant, sources, selection, form); setForms(current => ({ ...current, [activeId]: example.values })); setSelections(current => ({ ...current, [activeId]: example.selection })); setResult(null); setError(''); setNotice('All eligible request fields, including optional inputs, are filled. Saved references use actual records; review documented context and date filters before generating.'); }
    catch (failure) { setError(failure.message); }
  };
  const cancel = () => { request.current?.abort(); request.current = null; setBusy(false); setNotice('AI request cancelled. Your reviewed inputs are preserved.'); };
  async function generate(event) {
    event.preventDefault(); if (request.current || loadingSources || dentalSourceSelectionMissing(tool, sources, selection)) return;
    let payload; try { payload = dentalNativePayload(tool, form); } catch (failure) { setError(failure.message); return; }
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(''); setResult(null); setNotice('');
    try { const response = await api.post(tool.endpoint, payload, { signal: controller.signal }); if (request.current !== controller || controller.signal.aborted) return; const data = response.data; if (!data || data[tool.resultKey] === undefined) throw new Error('The provider returned an invalid tool response.'); setResult({ tool: tool.id, data, submitted: payload }); setNotice('AI response received. Qualified human review is required before any clinical, scheduling, claim or outreach decision.'); }
    catch (failure) { if (request.current === controller && !controller.signal.aborted) { const issue = failure.response?.data?.error; setError(typeof issue === 'string' ? issue : issue?.message || failure.message || 'AI request failed.'); } }
    finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  const requiredMissing = tool.fields.some(f => f.required && !String(form[f.key] ?? '').trim()), selectedSourceUnavailable = dentalSourceSelectionMissing(tool, sources, selection);
  const linked = linkedSources.includes(tool.source) ? sources[collection(tool.source)].filter(r => !selection.patientId || sameId(r.patient_id, selection.patientId)) : [];
  return <div className="page">
    <div className="page-header"><div><h2>AI New Tools</h2><p>Complete examples use real saved records. Unknown clinical facts stay undocumented; provider output requires qualified review.</p></div></div>
    <nav aria-label="Native AI tools" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{DENTAL_NATIVE_TOOLS.map(t => <button type="button" key={t.id} disabled={busy || loadingSources} className={`btn ${activeId === t.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveId(t.id); setResult(null); setError(''); setNotice(''); }}>{t.title}</button>)}</nav>
    <form onSubmit={generate} aria-label={`${tool.title} request`} className="table-container" style={{ padding: 24 }}>
      <h3>{tool.title}</h3><p>Fills all editable AI fields, including optional inputs. The selected references remain actual accessible records; examples create no clinical records or approvals.</p>
      <fieldset disabled={busy || loadingSources} style={{ border: '1px solid #cbd5e1', padding: 16, marginBottom: 16 }}><legend>Saved source records</legend>
        {['patient', 'patient_treatments', ...linkedSources].includes(tool.source) && <label className="form-group">Saved patient<select aria-label="Saved patient" value={selection.patientId || ''} onChange={e => changeSource('patientId', e.target.value)}><option value="">Choose a patient, or let Demo AI choose a matching saved record</option>{sources.patients.map(p => <option key={p.id} value={p.id}>{patientName(p)} · #{p.id}</option>)}</select></label>}
        {linkedSources.includes(tool.source) && <label className="form-group">Saved {tool.source}<select aria-label={`Saved ${tool.source}`} value={selection[tool.source + 'Id'] || ''} onChange={e => { if (busy || loadingSources) return; const r = linked.find(item => sameId(item.id, e.target.value)); const nextSelection = { patientId: r ? String(r.patient_id) : selection.patientId || '', [tool.source + 'Id']: e.target.value }; setSelections(current => ({ ...current, [activeId]: nextSelection })); setForms(current => ({ ...current, [activeId]: dentalSourceRequestValues(tool, nextSelection) })); setResult(null); }}><option value="">Choose a matching saved record</option>{linked.map(r => <option key={r.id} value={r.id}>{recordLabel(r, tool.source)}</option>)}</select></label>}
        {tool.source === 'patients' && <label className="form-group">Saved recall patients<select multiple aria-label="Saved recall patients" value={selection.patientIds || []} onChange={e => changeSource('patientIds', Array.from(e.target.selectedOptions, o => o.value))}>{sources.patients.map(p => <option key={p.id} value={p.id}>{patientName(p)} · #{p.id}</option>)}</select></label>}
        {tool.source === 'appointments' && <label className="form-group">Saved schedule appointments<select multiple aria-label="Saved schedule appointments" value={selection.appointmentIds || []} onChange={e => changeSource('appointmentIds', Array.from(e.target.selectedOptions, o => o.value))}>{sources.appointments.map(r => <option key={r.id} value={r.id}>{recordLabel(r, 'appointment')}</option>)}</select></label>}
        <button type="button" className="btn btn-secondary" onClick={() => void loadSources()}>Reload saved sources</button>
      </fieldset>
      {Object.entries(sourceErrors).map(([key, message]) => <p role="alert" key={key}>Saved {key}: {message}</p>)}
      {prerequisite && <p role="status">{prerequisite} Separately verified manual context can still use the existing native request fields.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{DENTAL_DEMO_CHOICES.map((choice, index) => <button type="button" key={choice.label} className="btn btn-secondary" disabled={busy || loadingSources || Boolean(prerequisite)} title={prerequisite || 'Fill every required and optional field from saved sources'} onClick={() => fill(index)}>{choice.label}</button>)}</div>
      {tool.fields.map(f => <label className="form-group" key={f.key} htmlFor={`native-${tool.id}-${f.key}`}>{f.label}{f.required ? ' *' : ''}{f.type === 'date' ? <input id={`native-${tool.id}-${f.key}`} type="date" name={f.key} disabled={busy || loadingSources} value={form[f.key] ?? ''} onChange={e => changeField(f.key, e.target.value)}/> : <textarea id={`native-${tool.id}-${f.key}`} name={f.key} required={f.required} readOnly={f.readOnly} maxLength={f.key === 'review_focus' ? 1200 : undefined} disabled={busy || loadingSources} rows={f.readOnly ? 1 : f.key === 'review_focus' ? 3 : 7} value={form[f.key] ?? ''} onChange={e => { if (!f.readOnly) changeField(f.key, e.target.value); }} placeholder={f.readOnly ? 'Choose an actual saved source record' : f.json ? 'Choose a complete example with saved sources, or enter separately verified JSON/context.' : 'Choose a complete example or enter your reviewed criteria.'} style={{ width: '100%', fontFamily: f.json ? 'monospace' : 'inherit' }}/>}</label>)}
      <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-ai" disabled={busy || loadingSources || requiredMissing || selectedSourceUnavailable}>{busy ? 'Generating…' : 'Generate with OpenRouter'}</button>{busy && <button type="button" className="btn btn-secondary" onClick={cancel}>Cancel</button>}</div>
    </form>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="ai-response">{error}</p>}
    {result?.tool === activeId && <AIReport response={result.data[tool.resultKey]} model={result.data.model} tokens={result.data.usage} title={tool.title}/>}
  </div>;
}
