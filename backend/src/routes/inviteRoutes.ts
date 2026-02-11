import { Router } from 'express';
import {
  createInvite,
  getInvites,
  cancelInvite,
  acceptInvite,
  getPendingInvites,
} from '../controllers/inviteController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';

const router = Router();

router.get('/pending', getPendingInvites);
router.post('/accept', acceptInvite);
router.get('/', authenticate, getInvites);
router.post('/', authenticate, authorize('admin', 'manager'), createInvite);
router.delete('/:id', authenticate, authorize('admin', 'manager'), cancelInvite);

export default router;
