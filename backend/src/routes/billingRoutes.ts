import { Router } from 'express';
import {
  createCheckout,
  handleWebhook,
  cancelSubscription,
  getBillingPortal,
} from '../controllers/billingController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Webhook público (não precisa de autenticação)
router.post('/webhook', handleWebhook);

// Rotas protegidas
router.use(authenticate);
router.post('/checkout', createCheckout);
router.post('/cancel', cancelSubscription);
router.get('/portal', getBillingPortal);

export default router;
