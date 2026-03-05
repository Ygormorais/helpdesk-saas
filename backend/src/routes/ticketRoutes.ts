import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getSimilarTickets,
  getTicketById,
  updateTicket,
  bulkUpdateTickets,
  reopenTicket,
  addComment,
  exportTicketsCsv,
} from '../controllers/ticketController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';
import { commentLimiter } from '../middlewares/rateLimiters.js';
import { checkPlanLimit } from '../services/planService.js';

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

router.get('/export/csv', authorize('admin', 'manager', 'agent'), exportTicketsCsv);

/**
 * @swagger
 * /tickets/similar:
 *   get:
 *     summary: Sugerir tickets parecidos (evitar duplicados)
 *     tags: [Tickets]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 8
 *           maxLength: 500
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *       - in: query
 *         name: excludeId
 *         schema:
 *           type: string
 *         description: ID do ticket para excluir da busca (opcional)
 *     responses:
 *       200:
 *         description: Lista de tickets parecidos
 *       400:
 *         description: Erro de validacao
 */
router.get('/similar', getSimilarTickets);

/**
 * @swagger
 * /tickets/bulk:
 *   post:
 *     summary: Atualizar tickets em massa
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, updates]
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 200
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *                 description: Pelo menos um campo deve ser enviado.
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [open, in_progress, waiting_customer, resolved, closed]
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high, urgent]
 *                   assignedTo:
 *                     type: string
 *                     nullable: true
 *                     description: ID do agente (ou null para desatribuir)
 *     responses:
 *       200:
 *         description: Resultado do bulk update
 *       400:
 *         description: Erro de validacao
 */
router.post('/bulk', authorize('admin', 'manager', 'agent'), bulkUpdateTickets);

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
router.post('/', checkPlanLimit('ticket'), createTicket);

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

// Cliente pode reabrir o proprio ticket resolvido/fechado
router.post('/:id/reopen', reopenTicket);

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
router.post('/:id/comments', commentLimiter, addComment);

export default router;
