import { Router } from 'express';
import {
  createCheckout,
  handleWebhook,
  cancelSubscription,
  getBillingPortal,
  listWebhookEvents,
} from '../controllers/billingController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Webhook público (não precisa de autenticação)
router.post('/webhook', handleWebhook);

// Rotas protegidas
router.use(authenticate);
router.post('/checkout', authorize('admin', 'manager'), createCheckout);
router.post('/cancel', authorize('admin', 'manager'), cancelSubscription);
router.get('/portal', authorize('admin', 'manager'), getBillingPortal);
router.get('/webhook-events', authorize('admin', 'manager'), listWebhookEvents);

export default router;
