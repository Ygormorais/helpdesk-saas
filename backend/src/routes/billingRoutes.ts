import { Router } from 'express';
import {
  createCheckout,
  listAddOns,
  createAddOnCheckout,
  handleWebhook,
  cancelSubscription,
  getBillingPortal,
  listWebhookEvents,
  changePlan,
  syncSubscription,
} from '../controllers/billingController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { billingWebhookLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

// Webhook público (não precisa de autenticação)
router.post('/webhook', billingWebhookLimiter, handleWebhook);

// Rotas protegidas
router.use(authenticate);
router.post('/checkout', authorize('admin', 'manager'), createCheckout);
router.get('/addons', authorize('admin', 'manager'), listAddOns);
router.post('/addons/checkout', authorize('admin', 'manager'), createAddOnCheckout);
router.post('/change-plan', authorize('admin', 'manager'), changePlan);
router.post('/cancel', authorize('admin', 'manager'), cancelSubscription);
router.post('/sync', authorize('admin', 'manager'), syncSubscription);
router.get('/portal', authorize('admin', 'manager'), getBillingPortal);
router.get('/webhook-events', authorize('admin', 'manager'), listWebhookEvents);

export default router;
