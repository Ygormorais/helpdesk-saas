import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface ChatMessage {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  attachments: any[];
  readBy: string[];
  createdAt: string;
}

interface Chat {
  _id: string;
  participants: any[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface ChatContextType {
  socket: Socket | null;
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  onlineUsers: string[];
  isTyping: { userId: string; chatId: string } | null;
  setCurrentChat: (chat: Chat | null) => void;
  sendMessage: (content: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  markAsRead: () => void;
  refreshChats: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState<{ userId: string; chatId: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('authenticate', { token, tenantId: user?.tenant?._id });
      });

      newSocket.on('authenticated', (data: { success: boolean }) => {
        if (data.success) {
          console.log('Socket authenticated');
        }
      });

      newSocket.on('new-message', (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
        refreshChats();
      });

      newSocket.on('user-typing', (data: { userId: string; chatId: string }) => {
        if (data.chatId === currentChat?._id) {
          setIsTyping(data);
        }
      });

      newSocket.on('user-stopped-typing', () => {
        setIsTyping(null);
      });

      newSocket.on('messages-read', ({ chatId, userId }: { chatId: string; userId: string }) => {
        if (chatId === currentChat?._id) {
          setMessages((prev) =>
            prev.map((msg) => ({
              ...msg,
              readBy: msg.readBy.includes(userId) ? msg.readBy : [...msg.readBy, userId],
            }))
          );
        }
      });

      newSocket.on('notification', (data: { type: string; chatId: string }) => {
        if (data.type === 'new-message') {
          refreshChats();
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  const refreshChats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/chat`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshChats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentChat && socket) {
      socket.emit('join-chat', currentChat._id);
      fetchMessages();
    }
  }, [currentChat, socket]);

  const fetchMessages = async () => {
    if (!currentChat) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/chat/${currentChat._id}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = (content: string) => {
    if (!currentChat || !socket) return;
    socket.emit('send-message', {
      chatId: currentChat._id,
      content,
      senderId: user?.id,
    });
  };

  const startTyping = () => {
    if (!currentChat || !socket) return;
    socket.emit('typing-start', {
      chatId: currentChat._id,
      userId: user?.id,
    });
  };

  const stopTyping = () => {
    if (!currentChat || !socket) return;
    socket.emit('typing-stop', {
      chatId: currentChat._id,
      userId: user?.id,
    });
  };

  const markAsRead = () => {
    if (!currentChat || !socket) return;
    socket.emit('mark-read', {
      chatId: currentChat._id,
      userId: user?.id,
    });
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        chats,
        currentChat,
        messages,
        onlineUsers,
        isTyping,
        setCurrentChat,
        sendMessage,
        startTyping,
        stopTyping,
        markAsRead,
        refreshChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
