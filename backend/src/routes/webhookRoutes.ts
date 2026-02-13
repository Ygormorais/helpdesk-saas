import { Router } from 'express';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from '../controllers/webhookController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';
import { requireFeature } from '../services/planService.js';

const router = Router();

router.use(authenticate);
router.use(requireFeature('webhooks'));

router.get('/', getWebhooks);
router.post('/', authorize('admin', 'manager'), createWebhook);
router.put('/:id', authorize('admin', 'manager'), updateWebhook);
router.delete('/:id', authorize('admin'), deleteWebhook);
router.post('/:id/test', authorize('admin', 'manager'), testWebhook);

export default router;
