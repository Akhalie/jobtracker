import { Router } from 'express';
import { getState, setState } from '../../lib/db.js';
import { profileSchema } from '../../lib/schemas.js';
import { toJsonResume } from '../../lib/json-resume.js';

export const profileRouter = Router();
profileRouter.get('/', async (req, res) => res.json(await getState('profile', profileSchema.parse({}))));
profileRouter.get('/export', async (req, res) =>
  res.attachment('resume.json').json(toJsonResume(await getState('profile', profileSchema.parse({}))))
);
profileRouter.put('/', async (req, res) => res.json(await setState('profile', profileSchema.parse(req.body))));
