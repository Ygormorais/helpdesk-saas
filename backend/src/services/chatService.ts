import { Server, Socket } from 'socket.io';
import { Chat, Message, Notification, NotificationType, User } from '../models/index.js';

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

      socket.on('authenticate', async (data: { token: string; tenantId?: string }) => {
        await this.handleAuthentication(socket, data);
      });

      socket.on('join-chat', async (chatId: string) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return socket.emit('error', { message: 'Not authenticated' });

        const chat = await Chat.findOne({
          _id: chatId,
          tenant: user.tenantId,
          participants: user.userId,
          status: 'active',
        }).select('_id');

        if (!chat) return socket.emit('error', { message: 'Forbidden' });

        socket.join(`chat:${chatId}`);
      });

      socket.on('leave-chat', (chatId: string) => {
        socket.leave(`chat:${chatId}`);
      });

      socket.on('send-message', async (data: { chatId: string; content: string }) => {
        await this.handleNewMessage(socket, data);
      });

      socket.on('typing-start', (data: { chatId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;
        socket.to(`chat:${data.chatId}`).emit('user-typing', { chatId: data.chatId, userId: user.userId });
      });

      socket.on('typing-stop', (data: { chatId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;
        socket.to(`chat:${data.chatId}`).emit('user-stopped-typing', { chatId: data.chatId, userId: user.userId });
      });

      socket.on('mark-read', async (data: { chatId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return socket.emit('error', { message: 'Not authenticated' });
        await this.markMessagesAsRead(data.chatId, user.userId, user.tenantId);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleAuthentication(socket: Socket, data: { token: string; tenantId?: string }) {
    try {
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../config/index.js');
      
      const decoded = jwt.default.verify(data.token, config.jwt.secret) as {
        userId: string;
        tenantId: string;
      };

      const dbUser = await User.findById(decoded.userId).select('_id tenant isActive');
      if (!dbUser || !dbUser.isActive) {
        throw new Error('unauthorized');
      }

      if (String(dbUser.tenant) !== decoded.tenantId) {
        throw new Error('tenant-mismatch');
      }

      this.connectedUsers.set(socket.id, {
        socketId: socket.id,
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        onlineAt: new Date(),
      });

      socket.emit('authenticated', { success: true });

      socket.join(`tenant:${decoded.tenantId}`);
      console.log(`User ${decoded.userId} authenticated on socket ${socket.id}`);

      this.emitOnlineUsers(decoded.tenantId);
    } catch (error) {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  }

  private emitOnlineUsers(tenantId: string) {
    const users = this.getOnlineUsers(tenantId).map((u) => u.userId);
    this.io?.to(`tenant:${tenantId}`).emit('online-users', users);
  }

  private async handleNewMessage(socket: Socket, data: { chatId: string; content: string }) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const chat = await Chat.findOne({
        _id: data.chatId,
        tenant: user.tenantId,
        participants: user.userId,
        status: 'active',
      });

      if (!chat) {
        socket.emit('error', { message: 'Forbidden' });
        return;
      }

      const message = await Message.create({
        chat: data.chatId,
        sender: user.userId,
        content: data.content,
        readBy: [user.userId],
      });

      await message.populate('sender', 'name email avatar');

      chat.lastMessage = message;

      for (const p of chat.participants) {
        const pid = p.toString();
        if (pid === user.userId) continue;
        chat.unreadCount.set(pid, (chat.unreadCount.get(pid) || 0) + 1);
      }
      await chat.save();

      this.io?.to(`chat:${data.chatId}`).emit('new-message', message);

      socket.to(`tenant:${user.tenantId}`).emit('notification', {
        type: 'new-message',
        chatId: data.chatId,
        message,
      });

       // Persist notification (best-effort)
       try {
          const doc = await Notification.create({
            tenant: user.tenantId,
            type: NotificationType.CHAT_MESSAGE,
            title: 'Nova mensagem',
            message: 'Voce recebeu uma nova mensagem no chat',
            data: {
              chatId: data.chatId,
              messageId: message._id,
            },
            chat: data.chatId,
            createdBy: user.userId,
            readBy: [user.userId],
          });

         this.io?.to(`tenant:${user.tenantId}`).emit('notification:created', {
           id: doc._id,
           type: doc.type,
           title: doc.title,
           message: doc.message,
           data: doc.data,
           chatId: doc.chat,
           createdBy: doc.createdBy,
           createdAt: doc.createdAt,
           read: false,
         });
       } catch {
         // ignore
       }

    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async markMessagesAsRead(chatId: string, userId: string, tenantId: string) {
    try {
      const chat = await Chat.findOne({ _id: chatId, tenant: tenantId, participants: userId }).select('_id');
      if (!chat) return;

      await Message.updateMany(
        { chat: chatId, sender: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );

      await Chat.updateOne({ _id: chatId }, { $set: { [`unreadCount.${userId}`]: 0 } });

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

      this.emitOnlineUsers(user.tenantId);
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
      scope: ticketId ? 'ticket' : 'internal',
      type: 'dm',
    });
  }

  async ensureDefaultInternalChannels(tenantId: string) {
    const staff = await User.find({ tenant: tenantId, isActive: true, role: { $ne: 'client' } }).select('_id');
    const staffIds = staff.map((u) => u._id);

    const defaults = [
      { channelKey: 'sales', name: 'Vendas' },
      { channelKey: 'support', name: 'Suporte' },
      { channelKey: 'cs', name: 'CS' },
    ];

    await Promise.all(
      defaults.map(async (d) => {
        const existing = await Chat.findOne({
          tenant: tenantId,
          scope: 'internal',
          type: 'channel',
          channelKey: d.channelKey,
          status: 'active',
        }).select('_id participants');

        if (!existing) {
          await Chat.create({
            tenant: tenantId,
            participants: staffIds,
            scope: 'internal',
            type: 'channel',
            channelKey: d.channelKey,
            name: d.name,
            isDefault: true,
          });
          return;
        }

        if (staffIds.length > 0) {
          await Chat.updateOne(
            { _id: existing._id },
            { $addToSet: { participants: { $each: staffIds } } }
          );
        }
      })
    );
  }

  async getUserChats(userId: string, tenantId: string, scope: 'all' | 'internal' | 'ticket' = 'all') {
    const query: Record<string, any> = { tenant: tenantId, participants: userId, status: 'active' };

    if (scope === 'internal') {
      query.$or = [
        { scope: 'internal' },
        { scope: { $exists: false }, ticket: { $exists: false } },
      ];
    }

    if (scope === 'ticket') {
      query.$or = [
        { scope: 'ticket' },
        { ticket: { $exists: true } },
      ];
    }

    return Chat.find(query)
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
