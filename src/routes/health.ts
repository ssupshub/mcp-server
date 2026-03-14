import { Router } from 'express';
import {
  healthCheck,
  livenessProbe,
  readinessProbe,
} from '../controllers/healthController.js';

const router = Router();

router.get('/', healthCheck);
router.get('/live', livenessProbe);
router.get('/ready', readinessProbe);

export default router;
