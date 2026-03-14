import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} from '../controllers/serviceController.js';

const mutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' },
  },
});

const router = Router();

router.get('/', listServices);
router.get('/:id', getService);
router.post('/', mutationLimiter, createService);
router.patch('/:id', mutationLimiter, updateService);
router.delete('/:id', mutationLimiter, deleteService);

export default router;
