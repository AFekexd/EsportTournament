
import { Router } from 'express';
import { IncidentController } from '../controllers/incident.js';
import { authenticate } from '../middleware/auth.js'; // Check import path

export const incidentsRouter: Router = Router();

// Public/User routes
incidentsRouter.post('/', authenticate, IncidentController.create);
incidentsRouter.get('/my', authenticate, IncidentController.getMy);

// Admin routes
incidentsRouter.get('/', authenticate, IncidentController.getAll);
incidentsRouter.put('/:id', authenticate, IncidentController.update);
incidentsRouter.delete('/:id', authenticate, IncidentController.delete);
