import { Router } from 'express';
import {
  getCurrentPlan,
  checkLimits,
  upgradePlanRequest,
} from '../controllers/planController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getCurrentPlan);
router.get('/limits', checkLimits);
router.post('/upgrade', upgradePlanRequest);

export default router;
