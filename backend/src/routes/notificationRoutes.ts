import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  clearMyNotifications,
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Listar notificacoes
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Quando true, retorna apenas nao lidas.
 *     responses:
 *       200:
 *         description: Lista paginada de notificacoes
 */
router.get('/', listNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   post:
 *     summary: Marcar notificacao como lida
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/:id/read', markNotificationRead);

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: Marcar todas as notificacoes como lidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/read-all', markAllRead);

/**
 * @swagger
 * /notifications:
 *   delete:
 *     summary: Limpar minhas notificacoes
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Arquiva as notificacoes apenas para o usuario atual (nao remove globalmente).
 *     responses:
 *       200:
 *         description: OK
 */
router.delete('/', clearMyNotifications);

export default router;
