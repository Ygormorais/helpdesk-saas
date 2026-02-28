import { Router } from 'express';
import {
  createArticle,
  getArticles,
  getArticleBySlug,
  updateArticle,
  deleteArticle,
  voteArticle,
  getPublicArticles,
  getPopularArticles,
  searchArticlesAi,
  submitArticleFeedback,
  listArticleFeedback,
  addRelatedTicket,
  removeRelatedTicket,
  getArticlesByTicket,
  getRelatedArticles,
} from '../controllers/articleController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';
import { aiSearchLimiter, articleFeedbackLimiter } from '../middlewares/rateLimiters.js';
import { requireFeature } from '../services/planService.js';

const router = Router();

router.use(authenticate);
router.use(requireFeature('knowledgeBase'));

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Listar artigos (admin)
 *     tags: [Articles]
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
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, draft]
 *     responses:
 *       200:
 *         description: Lista paginada de artigos
 */
router.get('/', getArticles);

/**
 * @swagger
 * /articles/public:
 *   get:
 *     summary: Listar artigos publicados (public)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de artigos publicados
 */
router.get('/public', getPublicArticles);

/**
 * @swagger
 * /articles/popular:
 *   get:
 *     summary: Listar artigos populares
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de artigos populares
 */
router.get('/popular', getPopularArticles);

/**
 * @swagger
 * /articles/search:
 *   get:
 *     summary: Buscar artigos com IA
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Resultado da busca
 *       400:
 *         description: Erro de validacao
 */
router.get('/search', aiSearchLimiter, searchArticlesAi);

/**
 * @swagger
 * /articles/by-ticket/{ticketId}:
 *   get:
 *     summary: Listar artigos relacionados a um ticket
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de artigos
 *       403:
 *         description: Acesso negado
 */
router.get('/by-ticket/:ticketId', authorize('admin', 'manager', 'agent'), getArticlesByTicket);

/**
 * @swagger
 * /articles/{slug}/related:
 *   get:
 *     summary: Listar artigos relacionados ao artigo (por slug)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de artigos relacionados
 */
router.get('/:slug/related', getRelatedArticles);

/**
 * @swagger
 * /articles/{slug}:
 *   get:
 *     summary: Obter artigo por slug
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artigo
 *       404:
 *         description: Artigo nao encontrado
 */
router.get('/:slug', getArticleBySlug);

/**
 * @swagger
 * /articles:
 *   post:
 *     summary: Criar artigo
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *               content:
 *                 type: string
 *                 minLength: 50
 *               excerpt:
 *                 type: string
 *                 maxLength: 300
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Artigo criado
 *       400:
 *         description: Erro de validacao
 */
router.post('/', authorize('admin', 'manager', 'agent'), createArticle);

/**
 * @swagger
 * /articles/{id}:
 *   put:
 *     summary: Atualizar artigo
 *     tags: [Articles]
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
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Artigo atualizado
 *       400:
 *         description: Erro de validacao
 */
router.put('/:id', authorize('admin', 'manager', 'agent'), updateArticle);

/**
 * @swagger
 * /articles/{id}:
 *   delete:
 *     summary: Remover artigo
 *     tags: [Articles]
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
 *         description: Artigo removido
 */
router.delete('/:id', authorize('admin', 'manager'), deleteArticle);

/**
 * @swagger
 * /articles/{id}/vote:
 *   post:
 *     summary: Votar em artigo (helpful)
 *     tags: [Articles]
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
 *             required: [helpful]
 *             properties:
 *               helpful:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Erro de validacao
 */
router.post('/:id/vote', articleFeedbackLimiter, voteArticle);

/**
 * @swagger
 * /articles/{id}/feedback:
 *   post:
 *     summary: Enviar feedback do artigo
 *     tags: [Articles]
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
 *             required: [helpful]
 *             properties:
 *               helpful:
 *                 type: boolean
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/:id/feedback', articleFeedbackLimiter, submitArticleFeedback);

/**
 * @swagger
 * /articles/{id}/feedback:
 *   get:
 *     summary: Listar feedback do artigo (staff)
 *     tags: [Articles]
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
 *       - in: query
 *         name: commentOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: helpful
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista paginada de feedback
 */
router.get('/:id/feedback', authorize('admin', 'manager', 'agent'), listArticleFeedback);

/**
 * @swagger
 * /articles/{id}/related-tickets:
 *   post:
 *     summary: Adicionar ticket relacionado ao artigo
 *     tags: [Articles]
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
 *             required: [ticketId]
 *             properties:
 *               ticketId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/:id/related-tickets', authorize('admin', 'manager', 'agent'), addRelatedTicket);

/**
 * @swagger
 * /articles/{id}/related-tickets/{ticketId}:
 *   delete:
 *     summary: Remover ticket relacionado do artigo
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.delete('/:id/related-tickets/:ticketId', authorize('admin', 'manager', 'agent'), removeRelatedTicket);

export default router;
