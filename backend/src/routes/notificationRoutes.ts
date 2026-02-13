import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  clearMyNotifications,
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.post('/:id/read', markNotificationRead);
router.post('/read-all', markAllRead);
router.delete('/', clearMyNotifications);

export default router;
