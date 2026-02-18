import { Router } from 'express';
import { metricsService } from '../services/metricsService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(metricsService.snapshot());
});

export default router;
