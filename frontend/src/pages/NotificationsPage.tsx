import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, Check, Trash2, RefreshCw, Archive, X, CheckCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { notificationsApi, type NotificationDto } from '@/api/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();

  const parseBool = (v: string | null) => v === '1' || v === 'true';
  const parsePage = (v: string | null) => {
    const n = Number(v || 1);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  };

  const initialType = searchParams.get('type') || 'all';

  const [page, setPage] = useState(() => parsePage(searchParams.get('page')));
  const [unreadOnly, setUnreadOnly] = useState(() => parseBool(searchParams.get('unread')));
  const [archivedOnly, setArchivedOnly] = useState(() => parseBool(searchParams.get('archived')));
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(() => (searchParams.get('q') || '').trim());
  const [typeFilter, setTypeFilter] = useState(() => initialType);
  const limit = 50;

  useEffect(() => {
    const nextPage = parsePage(searchParams.get('page'));
    const nextArchived = parseBool(searchParams.get('archived'));
    const nextUnread = nextArchived ? false : parseBool(searchParams.get('unread'));
    const nextQ = searchParams.get('q') || '';
    const nextType = searchParams.get('type') || 'all';

    if (page !== nextPage) setPage(nextPage);
    if (archivedOnly !== nextArchived) setArchivedOnly(nextArchived);
    if (unreadOnly !== nextUnread) setUnreadOnly(nextUnread);
    if (q !== nextQ) setQ(nextQ);
    if (typeFilter !== nextType) setTypeFilter(nextType);
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set('page', String(page));
    if (archivedOnly) next.set('archived', '1');
    if (!archivedOnly && unreadOnly) next.set('unread', '1');
    const tq = q.trim();
    if (tq) next.set('q', tq);
    if (typeFilter && typeFilter !== 'all') next.set('type', typeFilter);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [archivedOnly, page, q, searchParams, setSearchParams, typeFilter, unreadOnly]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const typeOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos os tipos' },
      { value: 'TICKET_CREATED', label: 'Ticket criado' },
      { value: 'TICKET_UPDATED', label: 'Ticket atualizado' },
      { value: 'TICKET_ASSIGNED', label: 'Ticket atribuido' },
      { value: 'TICKET_RESOLVED', label: 'Ticket resolvido' },
      { value: 'COMMENT_CREATED', label: 'Novo comentario' },
      { value: 'CHAT_MESSAGE', label: 'Mensagem no chat' },
    ],
    []
  );

  const typeLabelByValue = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of typeOptions) {
      m.set(o.value, o.label);
    }
    return m;
  }, [typeOptions]);

  const effectiveTypeOptions = useMemo(() => {
    if (typeFilter === 'all') return typeOptions;
    if (typeOptions.some((o) => o.value === typeFilter)) return typeOptions;
    return [...typeOptions, { value: typeFilter, label: typeFilter }];
  }, [typeFilter, typeOptions]);

  const hasAnyFilter = useMemo(() => {
    return page > 1 || unreadOnly || archivedOnly || q.trim().length > 0 || (typeFilter && typeFilter !== 'all');
  }, [archivedOnly, page, q, typeFilter, unreadOnly]);

  const listQuery = useQuery({
    queryKey: ['notifications', { page, limit, unreadOnly, archivedOnly, q: debouncedQ, typeFilter }],
    queryFn: async () => {
      const res = await notificationsApi.list({
        page,
        limit,
        unreadOnly: archivedOnly ? false : unreadOnly,
        archivedOnly,
        q: debouncedQ || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
      });
      return res.data;
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await notificationsApi.markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notificações marcadas como lidas' });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await notificationsApi.clearMine();
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      const archivedIds = Array.isArray(data?.archivedIds) ? data.archivedIds : [];
      const truncated = !!data?.truncated;
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

              p.then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
                .catch(() => undefined);
            }}
          >
            Desfazer
          </ToastAction>
        ),
      });
    },
  });

  const unarchiveAllMutation = useMutation({
    mutationFn: async () => {
      await notificationsApi.unarchiveAll();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notificacoes restauradas' });
    },
  });

  const unarchiveOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.unarchive([id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const archiveOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.archive([id]);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notificacao arquivada',
        duration: 6000,
        action: (
          <ToastAction
            altText="Desfazer"
            onClick={() => {
              notificationsApi
                .unarchive([id])
                .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
                .catch(() => undefined);
            }}
          >
            Desfazer
          </ToastAction>
        ),
      });
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
  const unreadTotal = archivedOnly
    ? 0
    : (typeof listQuery.data?.unreadTotal === 'number'
      ? Number(listQuery.data?.unreadTotal)
      : notifications.filter((n) => !n.read).length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">{unreadTotal} não lidas</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
            title="Atualizar"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button
            variant={archivedOnly ? 'outline' : (unreadOnly ? 'default' : 'outline')}
            onClick={() => {
              setPage(1);
              if (archivedOnly) return;
              setUnreadOnly((v) => !v);
            }}
            disabled={archivedOnly}
          >
            {unreadOnly ? 'Mostrando não lidas' : 'Somente não lidas'}
          </Button>

          <Button
            variant={archivedOnly ? 'default' : 'outline'}
            onClick={() => {
              setPage(1);
              setUnreadOnly(false);
              setArchivedOnly((v) => !v);
            }}
          >
            {archivedOnly ? 'Arquivadas' : 'Ver arquivadas'}
          </Button>

          <Button
            variant="outline"
            onClick={() => markAllMutation.mutate()}
            disabled={archivedOnly || markAllMutation.isPending || unreadTotal === 0}
          >
            <Check className="mr-2 h-4 w-4" />
            Marcar todas
          </Button>

          {archivedOnly ? (
            <Button
              variant="outline"
              onClick={() => unarchiveAllMutation.mutate()}
              disabled={unarchiveAllMutation.isPending || notifications.length === 0}
            >
              Restaurar tudo
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={() => clearMutation.mutate()}
            disabled={archivedOnly || clearMutation.isPending || notifications.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>{archivedOnly ? 'Arquivadas' : 'Recentes'}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Buscar..."
              className="h-9 w-[220px]"
            />
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setPage(1);
                setTypeFilter(v);
              }}
            >
              <SelectTrigger className="h-9 w-[200px]" aria-label="Filtrar por tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {effectiveTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasAnyFilter ? (
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => {
                  setPage(1);
                  setUnreadOnly(false);
                  setArchivedOnly(false);
                  setQ('');
                  setTypeFilter('all');
                }}
                title="Limpar filtros"
              >
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            ) : null}
          </div>
        </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {listQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
          {listQuery.isError && (
            <p className="text-sm text-destructive">Erro ao carregar notificações</p>
          )}
          {!listQuery.isLoading && !listQuery.isError && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          )}

          {notifications.map((n) => {
            const link = n.ticketId
              ? `/tickets/${n.ticketId}`
              : n.chatId
                ? `/chat?chatId=${encodeURIComponent(n.chatId)}`
                : '#';
            return (
              <Link
                key={n.id}
                to={link}
                onClick={() => {
                  if (!archivedOnly && !n.read) markOneMutation.mutate(n.id);
                }}
                className={`block rounded-lg border p-3 hover:bg-muted/40 transition-colors ${
                  !n.read ? 'bg-muted/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      <span className="shrink-0 rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {typeLabelByValue.get(String(n.type)) || String(n.type)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {archivedOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        unarchiveOneMutation.mutate(n.id);
                      }}
                    >
                      Restaurar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!n.read ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markOneMutation.mutate(n.id);
                          }}
                          title="Marcar como lida"
                          aria-label="Marcar como lida"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          archiveOneMutation.mutate(n.id);
                        }}
                        title="Arquivar"
                        aria-label="Arquivar"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
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
