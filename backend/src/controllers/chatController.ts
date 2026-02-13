import { Response } from 'express';
import { Chat, Message } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { chatService } from '../services/chatService.js';
import { z } from 'zod';

const createChatSchema = z.object({
  participantId: z.string(),
  ticketId: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

export const createChat = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = createChatSchema.parse(req.body);
    const user = req.user!;

    const chat = await chatService.createChat(
      user.tenant._id.toString(),
      [user._id.toString(), data.participantId],
      data.ticketId
    );

    await chat.populate('participants', 'name email avatar role');

    res.status(201).json({ chat });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const getMyChats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;

  const chats = await chatService.getUserChats(
    user._id.toString(),
    user.tenant._id.toString()
  );

  const chatsWithUnread = chats.map((chat) => {
    const unreadCount = chat.unreadCount.get(user._id.toString()) || 0;
    return {
      ...chat.toObject(),
      unreadCount,
    };
  });

  res.json({ chats: chatsWithUnread });
};

export const getChatMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const user = req.user!;

  const chat = await Chat.findOne({
    _id: id,
    participants: user._id,
  });

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  const result = await chatService.getChatMessages(
    id,
    parseInt(page as string),
    parseInt(limit as string)
  );

  res.json(result);
};

export const sendMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const data = sendMessageSchema.parse(req.body);
    const user = req.user!;

    const chat = await Chat.findOne({
      _id: id,
      participants: user._id,
      status: 'active',
    });

    if (!chat) {
      throw new AppError('Chat not found or closed', 404);
    }

    const message = await Message.create({
      chat: id,
      sender: user._id,
      content: data.content,
      readBy: [user._id],
    });

    await message.populate('sender', 'name email avatar');

    chat.lastMessage = message;
    const otherParticipant = chat.participants.find(
      (p) => p.toString() !== user._id.toString()
    );
    if (otherParticipant) {
      chat.unreadCount.set(
        otherParticipant.toString(),
        (chat.unreadCount.get(otherParticipant.toString()) || 0) + 1
      );
    }
    await chat.save();

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const closeChat = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  const chat = await Chat.findOne({
    _id: id,
    participants: user._id,
  });

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  chat.status = 'closed';
  await chat.save();

  res.json({ message: 'Chat closed', chat });
};

export const getOnlineUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;

  const onlineUsers = chatService.getOnlineUsers(user.tenant._id.toString());

  res.json({ users: onlineUsers });
};
