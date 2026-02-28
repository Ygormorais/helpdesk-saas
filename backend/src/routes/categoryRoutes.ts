import { Router } from 'express';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Listar categorias
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias ativas
 */
router.get('/', getCategories);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Criar categoria
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *               icon:
 *                 type: string
 *               parent:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoria criada
 *       400:
 *         description: Erro de validacao
 */
router.post('/', authorize('admin', 'manager'), createCategory);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Atualizar categoria
 *     tags: [Categories]
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
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *               icon:
 *                 type: string
 *               parent:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Categoria atualizada
 *       404:
 *         description: Categoria nao encontrada
 */
router.put('/:id', authorize('admin', 'manager'), updateCategory);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Remover categoria
 *     tags: [Categories]
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
 *         description: Categoria removida
 *       404:
 *         description: Categoria nao encontrada
 */
router.delete('/:id', authorize('admin'), deleteCategory);

export default router;
