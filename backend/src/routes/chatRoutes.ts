import { Router } from 'express';
import {
  createChat,
  getMyChats,
  getChatMessages,
  sendMessage,
  closeChat,
  getOnlineUsers,
} from '../controllers/chatController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getMyChats);
router.post('/', createChat);
router.get('/online', getOnlineUsers);
router.get('/:id/messages', getChatMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/close', closeChat);

export default router;
