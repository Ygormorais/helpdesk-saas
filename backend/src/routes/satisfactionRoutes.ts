import { Router } from 'express';
import {
  submitSatisfactionSurvey,
  getSatisfactionStats,
  getTicketSatisfaction,
  getRecentSurveys,
} from '../controllers/satisfactionController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/tickets/:ticketId', submitSatisfactionSurvey);
router.get('/tickets/:ticketId', getTicketSatisfaction);
router.get('/stats', getSatisfactionStats);
router.get('/recent', getRecentSurveys);

export default router;
