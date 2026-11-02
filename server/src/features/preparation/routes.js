import { Router } from 'express';
import { getState, setState } from '../../lib/db.js';
import { preparationSchema } from '../../lib/schemas.js';

export const preparationRouter = Router();
preparationRouter.get('/', async (req, res) => res.json(await getState('preparation', preparationSchema.parse({}))));
preparationRouter.put('/', async (req, res) =>
  res.json(await setState('preparation', preparationSchema.parse(req.body)))
);
