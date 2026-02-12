import { Server, Socket } from 'socket.io';
import { Chat, Message, IChat } from '../models/index.js';

interface ConnectedUser {
  socketId: string;
  userId: string;
  tenantId: string;
  onlineAt: Date;
}

class ChatService {
  private io: Server | null = null;
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  initialize(io: Server) {
    this.io = io;

    io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('authenticate', async (data: { token: string; tenantId: string }) => {
        await this.handleAuthentication(socket, data);
      });

      socket.on('join-chat', (chatId: string) => {
        socket.join(`chat:${chatId}`);
        console.log(`Socket ${socket.id} joined chat:${chatId}`);
      });

      socket.on('leave-chat', (chatId: string) => {
        socket.leave(`chat:${chatId}`);
      });

      socket.on('send-message', async (data: { chatId: string; content: string; senderId: string }) => {
        await this.handleNewMessage(socket, data);
      });

      socket.on('typing-start', (data: { chatId: string; userId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('user-typing', data);
      });

      socket.on('typing-stop', (data: { chatId: string; userId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('user-stopped-typing', data);
      });

      socket.on('mark-read', async (data: { chatId: string; userId: string }) => {
        await this.markMessagesAsRead(data.chatId, data.userId);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleAuthentication(socket: Socket, data: { token: string; tenantId: string }) {
    try {
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../config/index.js');
      
      const decoded = jwt.default.verify(data.token, config.jwt.secret) as {
        userId: string;
        tenantId: string;
      };

      this.connectedUsers.set(socket.id, {
        socketId: socket.id,
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        onlineAt: new Date(),
      });

      socket.emit('authenticated', { success: true });

      socket.join(`tenant:${decoded.tenantId}`);
      console.log(`User ${decoded.userId} authenticated on socket ${socket.id}`);
    } catch (error) {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  }

  private async handleNewMessage(socket: Socket, data: { chatId: string; content: string; senderId: string }) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const message = await Message.create({
        chat: data.chatId,
        sender: data.senderId,
        content: data.content,
        readBy: [data.senderId],
      });

      await message.populate('sender', 'name email avatar');

      const chat = await Chat.findById(data.chatId);
      if (chat) {
        chat.lastMessage = message;
        chat.unreadCount.set(
          chat.participants.find(p => p.toString() !== data.senderId)?.toString() || '',
          (chat.unreadCount.get(chat.participants.find(p => p.toString() !== data.senderId)?.toString() || '') || 0) + 1
        );
        await chat.save();
      }

      this.io?.to(`chat:${data.chatId}`).emit('new-message', message);

      socket.to(`tenant:${user.tenantId}`).emit('notification', {
        type: 'new-message',
        chatId: data.chatId,
        message,
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async markMessagesAsRead(chatId: string, userId: string) {
    try {
      await Message.updateMany(
        { chat: chatId, sender: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );

      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.unreadCount.set(userId, 0);
        await chat.save();
      }

      this.io?.to(`chat:${chatId}`).emit('messages-read', { chatId, userId });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  private handleDisconnect(socket: Socket) {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      console.log(`User ${user.userId} disconnected`);
      this.connectedUsers.delete(socket.id);
    }
  }

  async createChat(tenantId: string, participantIds: string[], ticketId?: string) {
    const existingChat = await Chat.findOne({
      tenant: tenantId,
      participants: { $all: participantIds, $size: participantIds.length },
      ticket: ticketId || { $exists: false },
      status: 'active',
    });

    if (existingChat) {
      return existingChat;
    }

    return Chat.create({
      tenant: tenantId,
      participants: participantIds,
      ticket: ticketId,
    });
  }

  async getUserChats(userId: string, tenantId: string) {
    return Chat.find({ tenant: tenantId, participants: userId, status: 'active' })
      .populate('participants', 'name email avatar role')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
  }

  async getChatMessages(chatId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chat: chatId });

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  getOnlineUsers(tenantId?: string) {
    const users: ConnectedUser[] = [];
    this.connectedUsers.forEach((user) => {
      if (!tenantId || user.tenantId === tenantId) {
        users.push(user);
      }
    });
    return users;
  }
}

export const chatService = new ChatService();
