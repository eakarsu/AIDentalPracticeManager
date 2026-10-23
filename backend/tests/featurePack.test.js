const test=require('node:test'); const assert=require('node:assert/strict');
const {filterRows,toCSV,validateTask,hasProviderKey,recallRisk, noshowRisk, caseloadSummary}=require('../domain/featurePack');
test('search/filter preserves false/0/empty',()=>{ assert.equal(filterRows([{title:'A',status:'pending',n:0,ok:false},{title:'B',status:'done',n:1}],{q:'a',status:'pending'}).length,1); });
test('CSV export preserves falsy',()=>{ const csv=toCSV([{a:0,b:false,c:''}]); assert.match(csv,/0/); assert.match(csv,/false/); });
test('task validation',()=>{ assert.match(validateTask({}),/title/); assert.equal(validateTask({title:'x'}),null); });
test('AI fallback labelled aiGenerated:false',()=>{ const r=recallRisk([{allergies:'penicillin'}]); assert.equal(r.aiGenerated,false); assert.equal(r.withAllergy,1); assert.ok(r.sections.length>=2); assert.equal(hasProviderKey({}),false); });
