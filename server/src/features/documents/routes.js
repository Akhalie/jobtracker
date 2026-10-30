import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool,getRecord,listRecords,putRecord } from '../../lib/db.js';
import { fail,idSchema,exportSchema } from '../../lib/schemas.js';
import { filePath,saveFile,removeStored } from '../../lib/files.js';
import { generatePdf } from '../../lib/pdf.js';
import { saveDocument,buildDocument,importDocument,publicDocument } from './service.js';
export const documentsRouter=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:4}});
async function findDocument(id) {
  const value=await getRecord('documents',idSchema.parse(id));
  if(!value)throw fail(404,'Document not found.');
  return value;
}
documentsRouter.get('/',async(req,res)=>res.json((await listRecords('documents')).map(publicDocument)));
documentsRouter.post('/',async(req,res)=>res.status(201).json(publicDocument(await saveDocument(req.body))));
documentsRouter.post('/upload',upload.single('file'),async(req,res)=>{
  if(!req.file)throw fail(400,'Choose a file to upload.');
  const type=z.enum(['resume','cover-letter']).parse(req.body.type||'resume');
  res.status(201).json(publicDocument(await importDocument(req.file,type,req.body.title)));
});
documentsRouter.get('/:id',async(req,res)=>res.json(publicDocument(await findDocument(req.params.id))));
documentsRouter.patch('/:id',async(req,res)=>{
  const original=await findDocument(req.params.id);
  res.status(201).json(publicDocument(await saveDocument({...original,...req.body},original)));
});
documentsRouter.get('/:id/file',async(req,res)=>{
  const document=await findDocument(req.params.id);
  if(!document.fileKey)throw fail(404,'Export this draft to PDF to create a downloadable file.');
  const filename=(document.originalName||`${document.title}.pdf`).replace(/[\r\n"\\/]/g,'_');
  res.set('Content-Disposition',`${req.query.download==='1'?'attachment':'inline'}; filename="${filename.replace(/[^\x20-\x7e]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.set('Cache-Control','private, no-store');
  res.sendFile(filePath(document.fileKey),{dotfiles:'allow'});
});
documentsRouter.post('/:id/export',async(req,res)=>{
  const original=await findDocument(req.params.id),options=exportSchema.parse(req.body);
  const buffer=await generatePdf(original,options);
  const document=await buildDocument({...original,...options},original);
  const fileKey=await saveFile(buffer,'pdf');
  const value={...document,...options,fileKey,hasFile:true,originalName:`${original.title.replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,100)||'Document'}.pdf`};
  try {await putRecord('documents',value);}catch(error){await removeStored(fileKey);throw error;}
  res.status(201).json(publicDocument(value));
});
documentsRouter.delete('/:id',async(req,res)=>{
  const document=await findDocument(req.params.id);
  const apps=await listRecords('applications');
  if(apps.some(app=>app.documentIds.includes(document.id)))throw fail(409,'This document is attached to an application. Remove the attachment before deleting it.');
  if((await listRecords('documents')).some(doc=>doc.sourceId===document.id))throw fail(409,'Other document versions depend on this version. Keep it for version history.');
  await pool.execute('DELETE FROM documents WHERE id=?',[document.id]);
  if(document.fileKey)await removeStored(document.fileKey);
  res.json({ok:true});
});
