import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { requireFeature } from '../services/planService.js';
import { listMacros, createMacro, updateMacro, deleteMacro } from '../controllers/macroController.js';

const router = Router();

router.use(authenticate);
router.use(requireFeature('macros'));

// Staff can list/apply macros
/**
 * @swagger
 * /macros:
 *   get:
 *     summary: Listar macros
 *     tags: [Macros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Quando true, retorna apenas macros ativas.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filtra por nome.
 *     responses:
 *       200:
 *         description: Lista de macros + uso do plano
 */
router.get('/', authorize('admin', 'manager', 'agent'), listMacros);

// Admin/manager manage
/**
 * @swagger
 * /macros:
 *   post:
 *     summary: Criar macro
 *     tags: [Macros]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, content]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 120
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Macro criada
 *       400:
 *         description: Erro de validacao
 *       403:
 *         description: Limite do plano
 */
router.post('/', authorize('admin', 'manager'), createMacro);

/**
 * @swagger
 * /macros/{id}:
 *   put:
 *     summary: Atualizar macro
 *     tags: [Macros]
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
 *               name:
 *                 type: string
 *               content:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Macro atualizada
 *       400:
 *         description: Erro de validacao
 *       404:
 *         description: Macro nao encontrada
 */
router.put('/:id', authorize('admin', 'manager'), updateMacro);

/**
 * @swagger
 * /macros/{id}:
 *   delete:
 *     summary: Remover macro
 *     tags: [Macros]
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
 *       404:
 *         description: Macro nao encontrada
 */
router.delete('/:id', authorize('admin', 'manager'), deleteMacro);

export default router;
