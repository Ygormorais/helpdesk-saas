import { Router } from 'express';
import {
  getDashboardStats,
  getTicketsByStatus,
  getTicketsByPriority,
  getTicketsByCategory,
  getTicketsTrend,
  getTopAgents,
  getSLACompliance,
  getSatisfactionStats,
  getRecentActivity,
} from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/tickets-by-status', getTicketsByStatus);
router.get('/tickets-by-priority', getTicketsByPriority);
router.get('/tickets-by-category', getTicketsByCategory);
router.get('/tickets-trend', getTicketsTrend);
router.get('/top-agents', getTopAgents);
router.get('/sla-compliance', getSLACompliance);
router.get('/satisfaction', getSatisfactionStats);
router.get('/recent-activity', getRecentActivity);

export default router;
