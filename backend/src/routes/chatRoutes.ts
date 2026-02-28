import { Router } from 'express';
import {
  createChat,
  getMyChats,
  getChatMessages,
  sendMessage,
  closeChat,
  getOnlineUsers,
} from '../controllers/chatController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /chat:
 *   get:
 *     summary: Listar meus chats
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [all, internal, ticket]
 *           default: all
 *     responses:
 *       200:
 *         description: Lista de chats do usuario
 */
router.get('/', getMyChats);

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Criar chat (DM)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [participantId]
 *             properties:
 *               participantId:
 *                 type: string
 *               ticketId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Chat criado
 *       400:
 *         description: Erro de validacao
 *       403:
 *         description: Acesso negado
 */
router.post('/', createChat);

/**
 * @swagger
 * /chat/online:
 *   get:
 *     summary: Listar usuarios online (tenant)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios online
 */
router.get('/online', getOnlineUsers);

/**
 * @swagger
 * /chat/{id}/messages:
 *   get:
 *     summary: Listar mensagens do chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Mensagens do chat
 *       404:
 *         description: Chat nao encontrado
 */
router.get('/:id/messages', getChatMessages);

/**
 * @swagger
 * /chat/{id}/messages:
 *   post:
 *     summary: Enviar mensagem
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       201:
 *         description: Mensagem criada
 *       400:
 *         description: Erro de validacao
 *       404:
 *         description: Chat nao encontrado ou fechado
 */
router.post('/:id/messages', sendMessage);

/**
 * @swagger
 * /chat/{id}/close:
 *   post:
 *     summary: Fechar chat
 *     tags: [Chat]
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
 *         description: Chat fechado
 *       404:
 *         description: Chat nao encontrado
 */
router.post('/:id/close', closeChat);

export default router;
