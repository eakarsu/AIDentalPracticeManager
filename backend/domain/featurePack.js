
function hasProviderKey(env=process.env){return Boolean(env.OPENROUTER_API_KEY||env.OPENAI_API_KEY);}
function esc(v){if(v===null||v===undefined)return '';const s=String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function toCSV(rows,columns){const cols=columns&&columns.length?columns:Object.keys(rows[0]||{});return [cols.join(','),...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n')+(rows.length?'\n':'');}
function filterRows(rows,{q='',status,priority,...rest}={}){const needle=String(q||'').toLowerCase();return rows.filter(r=>{if(needle&&!Object.values(r).some(v=>v!==null&&v!==undefined&&String(v).toLowerCase().includes(needle)))return false;if(status!==undefined&&status!==''&&String(r.status??'')!==String(status))return false;if(priority!==undefined&&priority!==''&&String(r.priority??'')!==String(priority))return false;for(const[k,v]of Object.entries(rest)){if(v!==undefined&&v!==''&&String(r[k]??'')!==String(v))return false;}return true;});}
function validateTask(b={}){if(!b.title||!String(b.title).trim())return 'title is required';if(b.status&&!['pending','in_progress','completed','cancelled'].includes(b.status))return 'invalid status';return null;}
function section(label,value){return {label,value:value===undefined?null:value};}

function recallRisk(rows=[]){const withAllergy=rows.filter(r=>r.allergies).length;return {aiGenerated:false,provider:'deterministic-fallback',feature:'recall-risk',sections:[section('Total patients',rows.length),section('Patients with allergies recorded',withAllergy),section('Summary',withAllergy+' patient(s) need allergy-aware recall')],total:rows.length,withAllergy};}
function noshowRisk(rows=[]){return {aiGenerated:false,provider:'deterministic-fallback',feature:'no-show-risk',sections:[section('Total patients',rows.length),section('Summary','Deterministic count only; no provider prediction without a key')],total:rows.length,score:0};}
function caseloadSummary(rows=[]){const byIns={};rows.forEach(r=>{const k=r.insurance_provider||'uninsured/unknown';byIns[k]=(byIns[k]||0)+1;});return {aiGenerated:false,provider:'deterministic-fallback',feature:'caseload-summary',sections:[section('Total patients',rows.length),section('By insurance provider',byIns),section('Summary','Caseload grouped by insurance provider')],byIns,total:rows.length};}

module.exports={hasProviderKey,toCSV,filterRows,validateTask,section,recallRisk,noshowRisk,caseloadSummary};
