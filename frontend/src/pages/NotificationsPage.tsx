import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { notificationsApi, type NotificationDto } from '@/api/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const limit = 50;

  const listQuery = useQuery({
    queryKey: ['notifications', { page, limit, unreadOnly }],
    queryFn: async () => {
      const res = await notificationsApi.list({ page, limit, unreadOnly });
      return res.data;
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await notificationsApi.markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notificacoes marcadas como lidas' });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await notificationsApi.clearMine();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notificacoes limpas' });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.markRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = (listQuery.data?.notifications || []) as NotificationDto[];
  const pagination = listQuery.data?.pagination as undefined | { page: number; pages: number; total: number };
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificacoes</h1>
          <p className="text-muted-foreground">{unreadCount} nao lidas</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => {
              setPage(1);
              setUnreadOnly((v) => !v);
            }}
          >
            {unreadOnly ? 'Mostrando nao lidas' : 'Somente nao lidas'}
          </Button>
          <Button
            variant="outline"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || notifications.length === 0}
          >
            <Check className="mr-2 h-4 w-4" />
            Marcar todas
          </Button>
          <Button
            variant="outline"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || notifications.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {listQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
          {listQuery.isError && (
            <p className="text-sm text-destructive">Erro ao carregar notificacoes</p>
          )}
          {!listQuery.isLoading && !listQuery.isError && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificacao</p>
            </div>
          )}

          {notifications.map((n) => {
            const link = n.ticketId ? `/tickets/${n.ticketId}` : n.chatId ? `/chat` : '#';
            return (
              <Link
                key={n.id}
                to={link}
                onClick={() => {
                  if (!n.read) markOneMutation.mutate(n.id);
                }}
                className={`block rounded-lg border p-3 hover:bg-muted/40 transition-colors ${
                  !n.read ? 'bg-muted/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </Link>
            );
          })}

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || listQuery.isLoading}
              >
                Anterior
              </Button>
              <p className="text-xs text-muted-foreground">
                Pagina {page} de {pagination.pages}
              </p>
              <Button
                variant="outline"
                onClick={() => setPage((p) => (pagination ? Math.min(pagination.pages, p + 1) : p + 1))}
                disabled={!!pagination && page >= pagination.pages}
              >
                Proxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
