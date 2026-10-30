import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ZodError } from 'zod';
import { pool } from './lib/db.js';
import { authRouter } from './features/auth/routes.js';
import { profileRouter } from './features/profile/routes.js';
import { applicationsRouter } from './features/applications/routes.js';
import { documentsRouter } from './features/documents/routes.js';
import { preparationRouter } from './features/preparation/routes.js';
import { settingsRouter } from './features/settings/routes.js';
import { requireAuth,checkOrigin } from './middleware/auth.js';
import { callAI } from './lib/ai.js';
import { exportBackup,restoreBackup } from './lib/backup.js';

export const app=express();
app.disable('x-powered-by');
if(process.env.TRUST_PROXY==='true')app.set('trust proxy',1);
app.use((req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'same-origin'});
  if(req.path.startsWith('/api'))res.set('Cache-Control','no-store');
  next();
});
app.use(checkOrigin);
app.use('/api/backup',express.json({limit:'80mb'}));
app.use(express.json({limit:'2mb'}));
app.get('/api/health',async(req,res)=>{
  try {
    const [rows]=await pool.query('SELECT COUNT(*) AS count FROM users');
    res.json({ok:true,database:true,setupRequired:rows[0].count===0});
  } catch {res.status(503).json({ok:false,database:false,setupRequired:false,error:'MySQL is unavailable or migrations have not run. Check server configuration and run npm run db:migrate.'});}
});
app.use('/api/auth',authRouter);
app.use('/api',requireAuth);
app.use('/api/profile',profileRouter);
app.use('/api/applications',applicationsRouter);
app.use('/api/documents',documentsRouter);
app.use('/api/preparation',preparationRouter);
app.use('/api/settings',settingsRouter);
let aiActive=false;
app.post('/api/ai',async(req,res)=>{
  if(aiActive)return res.status(429).json({error:'An AI request is already running. Wait for it to finish.'});
  aiActive=true;
  try {res.json({result:await callAI(req.body)});}finally {aiActive=false;}
});
app.get('/api/backup',async(req,res)=>res.attachment(`job-tracker-backup-${new Date().toISOString().slice(0,10)}.json`).json(await exportBackup()));
app.post('/api/backup',async(req,res)=>res.json(await restoreBackup(req.body.backup)));
app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found.'}));
const client=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..','client/dist');
if(existsSync(client)) {
  app.use(express.static(client));
  app.get('/{*path}',(req,res)=>res.sendFile(path.join(client,'index.html')));
}
app.use((error,req,res,next)=>{
  if(res.headersSent)return next(error);
  if(error instanceof ZodError)return res.status(400).json({error:error.issues.map(issue=>`${issue.path.join('.')||'Input'}: ${issue.message}`).join('; ')});
  if(error.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'Files must be 5 MB or smaller.'});
  if(error.code?.startsWith('LIMIT_'))return res.status(400).json({error:'Invalid file upload.'});
  if(error.type==='entity.too.large')return res.status(413).json({error:'This request is too large.'});
  if(error.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON request.'});
  if(error.status)return res.status(error.status).json({error:error.message});
  console.error('Request failed:',error.code||error.name,error.message);
  res.status(500).json({error:'The request could not be completed. Check that MySQL is available and retry.'});
});
