import { Router } from 'express';
import { metricsService } from '../services/metricsService.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Métricas simples do processo (in-memory)
 *     tags: [Ops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Snapshot de contadores e latência
 *       403:
 *         description: Forbidden
 */

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), (_req, res) => {
  res.json(metricsService.snapshot());
});

export default router;
