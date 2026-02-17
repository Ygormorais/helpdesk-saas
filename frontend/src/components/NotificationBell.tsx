import { useState } from 'react';
import { Bell, Check, Trash2, Ticket, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/contexts/NotificationContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [open, setOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'TICKET_CREATED':
        return <Ticket className="h-4 w-4 text-blue-500" />;
      case 'TICKET_UPDATED':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'TICKET_ASSIGNED':
        return <Bell className="h-4 w-4 text-purple-500" />;
      case 'TICKET_RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'COMMENT_CREATED':
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case 'CHAT_MESSAGE':
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(id);
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
        <DialogContent className="max-w-sm max-h-[80vh] p-0">
        <DialogHeader className="px-4 py-3 border-b pr-12">
          <div className="flex items-center justify-between">
            <DialogTitle>Notificações</DialogTitle>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={markAllAsRead}
                  title="Marcar todas como lidas"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearNotifications}
                  title="Limpar todas"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-80 px-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex flex-col items-start p-3 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors ${
                    !notification.read ? 'bg-muted/50' : ''
                  }`}
                >
                   <Link
                     to={notification.ticketId
                       ? `/tickets/${notification.ticketId}`
                       : notification.chatId
                         ? `/chat?chatId=${encodeURIComponent(notification.chatId)}`
                         : '#'}
                     onClick={() => handleNotificationClick(notification)}
                     className="w-full"
                   >
                    <div className="flex items-start gap-3 w-full">
                      <div className="mt-0.5">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => handleMarkAsRead(e, notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 text-center border-t">
            <Link
              to="/notifications"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Ver todas as notificações
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
