import { Router } from 'express';
import { getReadiness } from '../services/healthService.js';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Readiness do backend (Mongo/Redis)
 *     tags: [Ops]
 *     responses:
 *       200:
 *         description: Ready
 *       503:
 *         description: Degraded
 */

router.get('/live', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness do backend
 *     tags: [Ops]
 *     responses:
 *       200:
 *         description: Alive
 */

router.get('/', async (_req, res) => {
  const out = await getReadiness();
  res.status(out.ready ? 200 : 503).json({
    status: out.ready ? 'ok' : 'degraded',
    ready: out.ready,
    timestamp: new Date().toISOString(),
    deps: out.deps,
  });
});

export default router;
