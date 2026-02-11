import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  addComment,
} from '../controllers/ticketController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Listar tickets
 *     tags: [Tickets]
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
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de tickets
 */
router.get('/', getTickets);

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Criar novo ticket
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket criado
 */
router.post('/', createTicket);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Obter detalhes do ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do ticket
 *       404:
 *         description: Ticket não encontrado
 */
router.get('/:id', getTicketById);

/**
 * @swagger
 * /tickets/{id}:
 *   put:
 *     summary: Atualizar ticket
 *     tags: [Tickets]
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
 *         description: Ticket atualizado
 */
router.put('/:id', authorize('admin', 'manager', 'agent'), updateTicket);

/**
 * @swagger
 * /tickets/{id}/comments:
 *   post:
 *     summary: Adicionar comentário
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               isInternal:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Comentário adicionado
 */
router.post('/:id/comments', addComment);

export default router;
