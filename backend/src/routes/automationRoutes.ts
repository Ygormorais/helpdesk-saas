import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { requireFeature } from '../services/planService.js';
import {
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
} from '../controllers/automationController.js';

const router = Router();

router.use(authenticate);
router.use(requireFeature('automations'));

router.get('/', authorize('admin', 'manager'), listAutomationRules);
router.post('/', authorize('admin', 'manager'), createAutomationRule);
router.put('/:id', authorize('admin', 'manager'), updateAutomationRule);
router.delete('/:id', authorize('admin', 'manager'), deleteAutomationRule);

export default router;
