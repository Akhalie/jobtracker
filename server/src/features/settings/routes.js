import { Router } from 'express';
import { publicSettings, saveSettings } from './service.js';

export const settingsRouter = Router();
settingsRouter.get('/', async (req, res) => res.json(await publicSettings()));
settingsRouter.put('/', async (req, res) => res.json(await saveSettings(req.body)));
