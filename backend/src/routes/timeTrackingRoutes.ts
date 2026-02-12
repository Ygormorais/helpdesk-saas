import { Router } from 'express';
import {
  startTimer,
  stopTimer,
  createManualEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTicketTimeEntries,
  getMyTimeEntries,
  getActiveTimer,
  getTimeStats,
} from '../controllers/timeTrackingController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/start', startTimer);
router.post('/stop/:id', stopTimer);
router.post('/manual', createManualEntry);
router.put('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);
router.get('/ticket/:ticketId', getTicketTimeEntries);
router.get('/my', getMyTimeEntries);
router.get('/active', getActiveTimer);
router.get('/stats', getTimeStats);

export default router;
