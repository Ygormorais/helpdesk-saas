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
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, prom]
 *         description: Use "prom" for Prometheus text format
 *     responses:
 *       200:
 *         description: Snapshot de contadores e latência
 *       403:
 *         description: Forbidden
 */

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), async (_req, res) => {
  await metricsService.initialize();
  const format = String((_req.query as any)?.format || '').trim().toLowerCase();
  const accept = String(_req.headers.accept || '');
  const wantsProm = format === 'prom' || accept.includes('text/plain');

  if (wantsProm) {
    res.type('text/plain').send(metricsService.toPrometheus());
    return;
  }

  res.json(metricsService.snapshot());
});

export default router;
