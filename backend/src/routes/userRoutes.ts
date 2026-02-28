import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { listUsers } from '../controllers/userController.js';

const router = Router();

router.use(authenticate);

// Staff-only directory for internal features (chat DM, assignments, etc.)
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Listar usuarios do tenant
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffOnly
 *         schema:
 *           type: boolean
 *         description: Quando true, retorna apenas usuarios nao-client.
 *       - in: query
 *         name: excludeSelf
 *         schema:
 *           type: boolean
 *         description: Quando true, exclui o usuario autenticado.
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       400:
 *         description: Consulta invalida
 */
router.get('/', authorize('admin', 'manager', 'agent'), listUsers);

export default router;
