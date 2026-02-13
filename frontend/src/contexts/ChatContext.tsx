import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback, useRef } from 'react';
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

  const currentChatIdRef = useRef<string | null>(null);
  const prevChatIdRef = useRef<string | null>(null);

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_URL || '/api', []);

  useEffect(() => {
    currentChatIdRef.current = currentChat?._id || null;
  }, [currentChat]);

  const refreshChats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch chats (${response.status})`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  }, [apiBaseUrl, token]);

  const fetchMessages = useCallback(async (chatId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch messages (${response.status})`);
      const data = await response.json();
      if (currentChatIdRef.current === chatId) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('authenticate', { token, tenantId: user?.tenant?.id || '' });
      });

      newSocket.on('authenticated', (data: { success: boolean }) => {
        if (data.success) {
          console.log('Socket authenticated');
        }
      });

      newSocket.on('new-message', (message: ChatMessage) => {
        if (message.chat === currentChatIdRef.current) {
          setMessages((prev) => [...prev, message]);
        }
        refreshChats();
      });

      newSocket.on('user-typing', (data: { userId: string; chatId: string }) => {
        if (data.chatId === currentChatIdRef.current) {
          setIsTyping(data);
        }
      });

      newSocket.on('user-stopped-typing', () => {
        setIsTyping(null);
      });

      newSocket.on('messages-read', ({ chatId, userId }: { chatId: string; userId: string }) => {
        if (chatId === currentChatIdRef.current) {
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

      newSocket.on('online-users', (users: string[]) => {
        setOnlineUsers(users);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, token, user?.tenant?.id, refreshChats]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshChats();
    }
  }, [isAuthenticated, refreshChats]);

  useEffect(() => {
    if (currentChat && socket) {
      if (prevChatIdRef.current && prevChatIdRef.current !== currentChat._id) {
        socket.emit('leave-chat', prevChatIdRef.current);
      }
      prevChatIdRef.current = currentChat._id;
      socket.emit('join-chat', currentChat._id);
      fetchMessages(currentChat._id);
    }
  }, [currentChat, socket, fetchMessages]);

  const sendMessage = (content: string) => {
    if (!currentChat || !socket) return;
    socket.emit('send-message', {
      chatId: currentChat._id,
      content,
    });
  };

  const startTyping = () => {
    if (!currentChat || !socket) return;
    socket.emit('typing-start', {
      chatId: currentChat._id,
    });
  };

  const stopTyping = () => {
    if (!currentChat || !socket) return;
    socket.emit('typing-stop', {
      chatId: currentChat._id,
    });
  };

  const markAsRead = () => {
    if (!currentChat || !socket) return;
    socket.emit('mark-read', {
      chatId: currentChat._id,
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
