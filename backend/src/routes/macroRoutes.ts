import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { requireFeature } from '../services/planService.js';
import { listMacros, createMacro, updateMacro, deleteMacro } from '../controllers/macroController.js';

const router = Router();

router.use(authenticate);
router.use(requireFeature('macros'));

// Staff can list/apply macros
router.get('/', authorize('admin', 'manager', 'agent'), listMacros);

// Admin/manager manage
router.post('/', authorize('admin', 'manager'), createMacro);
router.put('/:id', authorize('admin', 'manager'), updateMacro);
router.delete('/:id', authorize('admin', 'manager'), deleteMacro);

export default router;
