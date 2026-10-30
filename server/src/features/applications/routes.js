import { Router } from 'express';
import { getRecord, listRecords } from '../../lib/db.js';
import { idSchema, fail } from '../../lib/schemas.js';
import { saveApplication, deleteApplication } from './service.js';
export const applicationsRouter = Router();
applicationsRouter.get('/',async (req,res) => res.json(await listRecords('applications')));
applicationsRouter.post('/',async (req,res) => res.status(201).json(await saveApplication(req.body)));
applicationsRouter.get('/:id',async (req,res) => {
  const value = await getRecord('applications',idSchema.parse(req.params.id));
  if (!value) throw fail(404,'Application not found.');
  res.json(value);
});
applicationsRouter.patch('/:id',async (req,res) => {
  const value = await getRecord('applications',idSchema.parse(req.params.id));
  if (!value) throw fail(404,'Application not found.');
  res.json(await saveApplication(req.body,value));
});
applicationsRouter.delete('/:id',async (req,res) => {
  const id=idSchema.parse(req.params.id);
  if (!await getRecord('applications',id)) throw fail(404,'Application not found.');
  await deleteApplication(id);
  res.json({ok:true});
});
