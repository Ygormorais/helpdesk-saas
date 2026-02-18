import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, Ticket, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { notificationsApi, type NotificationDto } from '@/api/notifications';
import { getSocketUrl } from '@/config/socket';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  ticketId?: string;
  chatId?: string;
  userId?: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketUrl = getSocketUrl();
  // api is handled via axios instance

  // Calcular contagem de não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  const showNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));

    const icons = {
      TICKET_CREATED: <Ticket className="h-4 w-4" />,
      TICKET_UPDATED: <AlertCircle className="h-4 w-4" />,
      TICKET_ASSIGNED: <Bell className="h-4 w-4" />,
      TICKET_RESOLVED: <CheckCircle className="h-4 w-4" />,
      COMMENT_CREATED: <MessageSquare className="h-4 w-4" />,
      CHAT_MESSAGE: <MessageSquare className="h-4 w-4" />,
    };

    toast({
      title: (
        <div className="flex items-center gap-2">
          {icons[notification.type as keyof typeof icons] || <Bell className="h-4 w-4" />}
          <span>{notification.title}</span>
        </div>
      ),
      description: notification.message,
      duration: 5000,
    });
  }, [toast]);

  // Load persisted notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    (async () => {
      try {
        const res = await notificationsApi.list({ page: 1, limit: 50 });
        const list = res.data.notifications;
        setNotifications(
          list.map((n: NotificationDto) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            ticketId: n.ticketId,
            chatId: n.chatId,
            userId: n.createdBy,
            createdAt: new Date(n.createdAt),
            read: n.read,
          }))
        );
      } catch {
        // ignore
      }
    })();
  }, [isAuthenticated]);

  // Conectar ao socket quando autenticado
  useEffect(() => {
    if (!isAuthenticated || !user || !user.tenant || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);

      newSocket.emit('authenticate', { token, tenantId: user.tenant?.id || '' });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('notification:created', (n: any) => {
      showNotification({
        id: String(n.id),
        type: String(n.type),
        title: String(n.title),
        message: String(n.message),
        ticketId: n.ticketId ? String(n.ticketId) : undefined,
        chatId: n.chatId ? String(n.chatId) : undefined,
        userId: n.createdBy ? String(n.createdBy) : undefined,
        createdAt: new Date(n.createdAt),
        read: false,
      });
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      if (socketRef.current === newSocket) {
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, user, token, socketUrl, showNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    notificationsApi.markRead(id).catch(() => undefined);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    notificationsApi.markAllRead().catch(() => undefined);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    notificationsApi.clearMine().catch(() => undefined);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        isConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
