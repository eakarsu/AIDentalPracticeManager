const express=require('express');
const {filterRows,toCSV,validateTask,recallRisk,noshowRisk,caseloadSummary}=require('../domain/featurePack');
function createFeaturePackRouter({queryFn,authenticate,table}){const router=express.Router();router.use(authenticate);
 const getRows=async(req)=>{if(Array.isArray(req.body?.records))return req.body.records;const r=await queryFn(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 500`);return r.rows||r;};

 let ready; const ensure=()=>{ if(!ready) ready=queryFn(`CREATE TABLE IF NOT EXISTS fp_tasks (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium', assignee TEXT, record_id INTEGER, due_date DATE, created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`); return ready; };
 router.get('/tasks',async(req,res)=>{try{await ensure();const r=await queryFn(`SELECT * FROM fp_tasks ORDER BY id DESC LIMIT 500`);res.json(filterRows(r.rows||r,req.query));}catch(e){res.status(500).json({error:e.message});}});
 router.post('/tasks',async(req,res)=>{const err=validateTask(req.body);if(err)return res.status(400).json({error:err});try{await ensure();const b=req.body;const r=await queryFn(`INSERT INTO fp_tasks (title,description,status,priority,assignee,record_id,due_date,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[String(b.title).trim(),b.description||null,b.status||'pending',b.priority||'medium',b.assignee||null,b.record_id||null,b.due_date||null,req.user?.id||req.user?.userId||null]);res.status(201).json((r.rows||r)[0]);}catch(e){res.status(500).json({error:e.message});}});
 const upd=async(req,res)=>{try{await ensure();const b=req.body;const r=await queryFn(`UPDATE fp_tasks SET title=COALESCE($1,title),description=COALESCE($2,description),status=COALESCE($3,status),priority=COALESCE($4,priority),assignee=COALESCE($5,assignee),due_date=COALESCE($6,due_date),updated_at=NOW() WHERE id=$7 RETURNING *`,[b.title||null,b.description||null,b.status||null,b.priority||null,b.assignee||null,b.due_date||null,req.params.id]);const row=(r.rows||r)[0];if(!row)return res.status(404).json({error:'Not found'});res.json(row);}catch(e){res.status(500).json({error:e.message});}};
 router.put('/tasks/:id',upd); router.patch('/tasks/:id',upd);

 router.get('/search',async(req,res)=>{try{const r=await queryFn(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 500`);const rows=filterRows(r.rows||r,req.query);res.json({data:rows,total:rows.length});}catch(e){res.status(500).json({error:e.message});}});
 router.get('/export',async(req,res)=>{try{const r=await queryFn(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 500`);const rows=filterRows(r.rows||r,req.query);if(String(req.query.format||'json').toLowerCase()==='csv'){res.setHeader('Content-Type','text/csv');res.setHeader('Content-Disposition','attachment; filename="export.csv"');return res.send(toCSV(rows));}res.json({data:rows,total:rows.length});}catch(e){res.status(500).json({error:e.message});}});
 router.post('/ai/recall-risk',async(req,res)=>{try{const rows=await getRows(req);res.json(recallRisk(rows));}catch(e){res.status(500).json({error:e.message});}});
 router.post('/ai/no-show-risk',async(req,res)=>{try{const rows=await getRows(req);res.json(noshowRisk(rows));}catch(e){res.status(500).json({error:e.message});}});
 router.post('/ai/caseload-summary',async(req,res)=>{try{const rows=await getRows(req);res.json(caseloadSummary(rows));}catch(e){res.status(500).json({error:e.message});}});
 return router;}
module.exports={createFeaturePackRouter};
