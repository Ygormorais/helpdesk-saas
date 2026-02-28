import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  archiveNotifications,
  unarchiveNotifications,
  unarchiveAllNotifications,
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
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Busca por texto em titulo/mensagem.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filtra por tipo (ou lista separada por virgula).
 *       - in: query
 *         name: archivedOnly
 *         schema:
 *           type: boolean
 *         description: Quando true, retorna apenas arquivadas pelo usuario atual.
 *     responses:
 *       200:
 *         description: Lista paginada de notificacoes
 */
router.get('/', listNotifications);

/**
 * @swagger
 * /notifications/archive:
 *   post:
 *     summary: Arquivar notificacoes (por usuario)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 500
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/archive', archiveNotifications);

/**
 * @swagger
 * /notifications/unarchive:
 *   post:
 *     summary: Desarquivar notificacoes (por usuario)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 500
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/unarchive', unarchiveNotifications);

/**
 * @swagger
 * /notifications/unarchive-all:
 *   post:
 *     summary: Desarquivar todas as notificacoes do usuario
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/unarchive-all', unarchiveAllNotifications);

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
 *         description: OK (retorna ids arquivados para desfazer)
 */
router.delete('/', clearMyNotifications);

export default router;
