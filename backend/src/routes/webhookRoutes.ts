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

const router = Router();

router.use(authenticate);

router.get('/', getWebhooks);
router.post('/', authorize('admin', 'manager'), createWebhook);
router.put('/:id', authorize('admin', 'manager'), updateWebhook);
router.delete('/:id', authorize('admin'), deleteWebhook);
router.post('/:id/test', authorize('admin', 'manager'), testWebhook);

export default router;
