import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { requireFeature } from '../services/planService.js';
import {
  listReportSchedules,
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
} from '../controllers/reportScheduleController.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'manager'));
router.use(requireFeature('advancedReports'));
router.use(requireFeature('scheduledReports'));

router.get('/', listReportSchedules);
router.post('/', createReportSchedule);
router.put('/:id', updateReportSchedule);
router.delete('/:id', deleteReportSchedule);

export default router;
