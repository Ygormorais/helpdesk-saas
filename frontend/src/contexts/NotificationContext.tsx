import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, Ticket, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { notificationsApi, type NotificationDto } from '@/api/notifications';
import { getSocketUrl } from '@/config/socket';
import { ToastAction } from '@/components/ui/toast';

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
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  reloadNotifications: () => Promise<void>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const socketUrl = getSocketUrl();
  // api is handled via axios instance

  // Prefer server-provided total (covers > 50 records)
  const unreadCount = unreadTotal;

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

  const reloadNotifications = useCallback(async () => {
    const res = await notificationsApi.list({ page: 1, limit: 50 });
    const list = res.data.notifications;

    const nextUnreadTotal = typeof res.data?.unreadTotal === 'number'
      ? Number(res.data.unreadTotal)
      : list.filter((n: NotificationDto) => !n.read).length;

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

    setUnreadTotal(nextUnreadTotal);
  }, []);

  // Load persisted notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadTotal(0);
      return;
    }

    (async () => {
      try {
        await reloadNotifications();
      } catch {
        // ignore
      }
    })();
  }, [isAuthenticated, reloadNotifications]);

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
      const myId = user?.id ? String(user.id) : '';
      const createdById = n.createdBy ? String(n.createdBy) : '';
      const isRead = !!myId && !!createdById && myId === createdById;

      const incoming: Notification = {
        id: String(n.id),
        type: String(n.type),
        title: String(n.title),
        message: String(n.message),
        ticketId: n.ticketId ? String(n.ticketId) : undefined,
        chatId: n.chatId ? String(n.chatId) : undefined,
        userId: n.createdBy ? String(n.createdBy) : undefined,
        createdAt: new Date(n.createdAt),
        read: isRead,
      };

      if (isRead) {
        setNotifications((prev) => [incoming, ...prev].slice(0, 50));
        return;
      }

      setUnreadTotal((v) => v + 1);
      showNotification(incoming);
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
    setNotifications((prev) => {
      let decremented = false;
      const next = prev.map((n) => {
        if (n.id !== id) return n;
        if (!n.read) decremented = true;
        return { ...n, read: true };
      });
      if (decremented) setUnreadTotal((v) => Math.max(0, v - 1));
      return next;
    });
    notificationsApi.markRead(id).catch(() => undefined);
  }, []);

  const markAsUnread = useCallback((id: string) => {
    setNotifications((prev) => {
      let incremented = false;
      const next = prev.map((n) => {
        if (n.id !== id) return n;
        if (n.read) incremented = true;
        return { ...n, read: false };
      });
      if (incremented) setUnreadTotal((v) => v + 1);
      return next;
    });
    notificationsApi.markUnread(id).catch(() => undefined);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadTotal(0);
    notificationsApi.markAllRead().catch(() => undefined);
  }, []);

  const clearNotifications = useCallback(() => {
    if (notifications.length === 0) return;

    setNotifications([]);
    setUnreadTotal(0);
    notificationsApi
      .clearMine()
      .then((res) => {
        const archivedIds = Array.isArray(res.data?.archivedIds) ? res.data.archivedIds : [];
        const truncated = !!res.data?.truncated;

        toast({
          title: 'Notificacoes arquivadas',
          description: 'Voce pode desfazer agora.',
          duration: 6000,
          action: (
            <ToastAction
              altText="Desfazer"
              onClick={() => {
                const p = truncated || archivedIds.length === 0
                  ? notificationsApi.unarchiveAll()
                  : notificationsApi.unarchive(archivedIds);

                p.then(() => reloadNotifications()).catch(() => undefined);
              }}
            >
              Desfazer
            </ToastAction>
          ),
        });
      })
      .catch(() => undefined);
  }, [notifications.length, reloadNotifications, toast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        clearNotifications,
        reloadNotifications,
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
