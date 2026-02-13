import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, Ticket, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { notificationsApi, type NotificationDto } from '@/api/notifications';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  ticketId?: string;
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  // api is handled via axios instance

  // Calcular contagem de não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

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
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);

      newSocket.emit('authenticate', { token, tenantId: user.tenant?.id || '' });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('notification:created', (n: any) => {
      showNotification({
        id: String(n.id),
        type: String(n.type),
        title: String(n.title),
        message: String(n.message),
        ticketId: n.ticketId ? String(n.ticketId) : undefined,
        userId: n.createdBy ? String(n.createdBy) : undefined,
        createdAt: new Date(n.createdAt),
        read: false,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, token]);

  const showNotification = useCallback((notification: Notification) => {
    // Adicionar à lista
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Manter últimas 50

    // Mostrar toast
    const icons = {
      TICKET_CREATED: <Ticket className="h-4 w-4" />,
      TICKET_UPDATED: <AlertCircle className="h-4 w-4" />,
      TICKET_ASSIGNED: <Bell className="h-4 w-4" />,
      TICKET_RESOLVED: <CheckCircle className="h-4 w-4" />,
      COMMENT_CREATED: <MessageSquare className="h-4 w-4" />,
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
