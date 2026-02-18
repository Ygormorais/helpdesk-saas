import { Response } from 'express';
import { Chat, Message, Ticket, User } from '../models/index.js';
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

    const participant = await User.findOne({
      _id: data.participantId,
      tenant: (user.tenant as any)?._id || user.tenant,
      isActive: true,
    }).select('_id role');

    if (!participant) {
      throw new AppError('Participante nao encontrado', 404);
    }

    if (!data.ticketId) {
      if (user.role === 'client') {
        throw new AppError('Acesso negado', 403);
      }
      if (participant.role === 'client') {
        throw new AppError('Chat interno so pode ser criado com equipe', 400);
      }
    }

    if (data.ticketId) {
      const ticketQuery: any = {
        _id: data.ticketId,
        tenant: (user.tenant as any)?._id || user.tenant,
      };
      if (user.role === 'client') {
        ticketQuery.createdBy = user._id;
      }

      const ticket = await Ticket.findOne(ticketQuery)
        .select('_id createdBy assignedTo');

      if (!ticket) {
        throw new AppError('Ticket nao encontrado', 404);
      }

      const createdById = ticket.createdBy?.toString();
      const assignedToId = ticket.assignedTo?.toString();
      const pid = participant._id.toString();

      const allowed = pid === createdById || (assignedToId && pid === assignedToId);
      if (!allowed) {
        throw new AppError('Participant must belong to the ticket', 400);
      }
    }

    const chat = await chatService.createChat(
      user.tenant._id.toString(),
      [user._id.toString(), data.participantId],
      data.ticketId
    );

    await chat.populate('participants', 'name email avatar role');

    res.status(201).json({ chat });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
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

  const scopeRaw = String((req.query as any).scope || 'all');
  const scope = (scopeRaw === 'internal' || scopeRaw === 'ticket') ? scopeRaw : 'all';

  if (scope === 'internal') {
    if (user.role === 'client') {
      throw new AppError('Acesso negado', 403);
    }
    await chatService.ensureDefaultInternalChannels(user.tenant._id.toString());
  }

  const chats = await chatService.getUserChats(
    user._id.toString(),
    user.tenant._id.toString(),
    scope
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
    tenant: user.tenant._id,
    participants: user._id,
  });

  if (!chat) {
    throw new AppError('Chat nao encontrado', 404);
  }

  const result = await chatService.getChatMessages(
    id,
    Math.max(1, parseInt(page as string, 10) || 1),
    Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50))
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
      tenant: user.tenant._id,
      participants: user._id,
      status: 'active',
    });

    if (!chat) {
      throw new AppError('Chat nao encontrado ou fechado', 404);
    }

    const message = await Message.create({
      chat: id,
      sender: user._id,
      content: data.content,
      readBy: [user._id],
    });

    await message.populate('sender', 'name email avatar');

    chat.lastMessage = message;

    for (const p of chat.participants) {
      const pid = p.toString();
      if (pid === user._id.toString()) continue;
      chat.unreadCount.set(pid, (chat.unreadCount.get(pid) || 0) + 1);
    }
    await chat.save();

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
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
    tenant: user.tenant._id,
    participants: user._id,
  });

  if (!chat) {
    throw new AppError('Chat nao encontrado', 404);
  }

  chat.status = 'closed';
  await chat.save();

  res.json({ message: 'Chat fechado', chat });
};

export const getOnlineUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;

  const onlineUsers = chatService.getOnlineUsers(user.tenant._id.toString());

  res.json({ users: onlineUsers });
};
