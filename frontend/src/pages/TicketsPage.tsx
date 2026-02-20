import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, MessageCircle, Plus, Search } from 'lucide-react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ticketsApi } from '@/api/tickets';
import { categoriesApi } from '@/api/categories';
import { chatApi } from '@/api/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '@/config/api';
import { downloadCSV } from '@/utils/csv';

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    waiting_customer: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
  };
  const labels: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    resolved: 'Resolvido',
    waiting_customer: 'Aguardando Cliente',
    closed: 'Fechado',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const getPriorityBadge = (priority: string) => {
  const styles: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };
  const labels: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

export default function TicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialPriority = searchParams.get('priority') || 'all';
  const initialCategory = searchParams.get('category') || 'all';
  const initialMine = searchParams.get('mine') === '1';
  const initialPage = Math.max(1, Number(searchParams.get('page') || 1) || 1);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [mineOnly, setMineOnly] = useState(initialMine);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(20);
  const [isExporting, setIsExporting] = useState(false);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setMineOnly(false);
    setPage(1);
  };

  useEffect(() => {
    const isActive =
      !!debouncedSearch.trim() ||
      statusFilter !== 'all' ||
      priorityFilter !== 'all' ||
      categoryFilter !== 'all' ||
      mineOnly;

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || '').toLowerCase();
      const isTypingTarget =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (t as any)?.isContentEditable;

      if (isTypingTarget) return;
      if (e.key === 'Escape') {
        if (isActive) {
          clearFilters();
        }
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [debouncedSearch, statusFilter, priorityFilter, categoryFilter, mineOnly]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    // Keep selection scoped to current filters/page
    setSelectedIds([]);
  }, [debouncedSearch, statusFilter, priorityFilter, categoryFilter, mineOnly, page, limit]);

  useEffect(() => {
    // Support back/forward navigation by reading URL state
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const category = searchParams.get('category') || 'all';
    const mine = searchParams.get('mine') === '1';
    const nextPage = Math.max(1, Number(searchParams.get('page') || 1) || 1);

    if (q !== debouncedSearch) {
      setSearch(q);
      setDebouncedSearch(q);
    }
    if (status !== statusFilter) setStatusFilter(status);
    if (priority !== priorityFilter) setPriorityFilter(priority);
    if (category !== categoryFilter) setCategoryFilter(category);
    if (mine !== mineOnly) setMineOnly(mine);
    if (nextPage !== page) setPage(nextPage);
  }, [debouncedSearch, mineOnly, page, priorityFilter, searchParams, statusFilter, categoryFilter]);

  useEffect(() => {
    // keep URL in sync (shareable state)
    const next = new URLSearchParams();
    if (debouncedSearch.trim()) next.set('q', debouncedSearch.trim());
    if (statusFilter !== 'all') next.set('status', statusFilter);
    if (priorityFilter !== 'all') next.set('priority', priorityFilter);
    if (categoryFilter !== 'all') next.set('category', categoryFilter);
    if (mineOnly) next.set('mine', '1');
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, mineOnly, page, priorityFilter, categoryFilter, setSearchParams, statusFilter]);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.list();
      return res.data.categories as Array<any>;
    },
    staleTime: 60_000,
  });

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['tickets', { page, limit, search: debouncedSearch, statusFilter, priorityFilter, categoryFilter, mineOnly }],
    queryFn: async () => {
      const res = await ticketsApi.list({
        page,
        limit,
        search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        assignedTo: mineOnly && user?.id ? user.id : undefined,
      });
      return res.data as {
        tickets: Array<any>;
        pagination: { page: number; limit: number; total: number; pages: number };
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const tickets = useMemo(() => data?.tickets || [], [data]);
  const pagination = data?.pagination;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelectedOnPage = tickets.length > 0 && tickets.every((t) => selectedSet.has(String(t._id)));

  const hasActiveFilters =
    !!debouncedSearch.trim() || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || mineOnly;

  const canExport = user?.role !== 'client';
  const canUseMineFilter = user?.role !== 'client';

  const openTicketChat = async (ticket: any) => {
    try {
      if (!user) return;
      setOpeningChatId(String(ticket._id));

      const createdById = (ticket.createdBy?._id || ticket.createdBy?.id) as string | undefined;
      const assigneeId = (ticket.assignedTo?._id || ticket.assignedTo?.id) as string | undefined;

      let participantId: string | undefined;
      if (user.role === 'client') participantId = assigneeId;
      else participantId = createdById;

      if (!participantId) {
        throw new Error('missing-participant');
      }

      const res = await chatApi.create({ participantId, ticketId: String(ticket._id) });
      const chat = res.data.chat;
      if (chat?._id) {
        navigate(`/chat?chatId=${encodeURIComponent(String(chat._id))}`);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      toast({
        title: 'Não foi possível abrir o chat',
        description: msg || (user?.role === 'client' ? 'Ticket sem agente atribuído' : 'Tente novamente'),
        variant: 'destructive',
      });
    } finally {
      setOpeningChatId(null);
    }
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string> = { limit: '50000' };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (mineOnly && user?.id) params.assignedTo = user.id;

      const res = await api.get('/tickets/export/csv', { params, responseType: 'blob' });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tickets.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportSelectedCsv = () => {
    const selected = tickets.filter((t) => selectedSet.has(String(t._id)));
    if (selected.length === 0) return;

    downloadCSV(
      ['ticketNumber', 'title', 'status', 'priority', 'category', 'createdBy', 'createdAt'],
      selected.map((t) => [
        t.ticketNumber,
        t.title,
        t.status,
        t.priority,
        t.category?.name || '',
        t.createdBy?.name || '',
        t.createdAt ? new Date(t.createdAt).toISOString() : '',
      ]),
      'tickets-selected.csv'
    );
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => ticketsApi.update(id, { status }))
      );

      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      toast({
        title: failed ? 'Ação concluída com falhas' : 'Ação concluída',
        description: failed ? `${ok} atualizado(s), ${failed} falhou(aram).` : `${ok} ticket(s) atualizado(s).`,
        variant: failed ? 'destructive' : 'default',
      });

      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error: any) {
      toast({
        title: 'Erro na ação em massa',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <div className="flex items-center gap-2">
          {canExport ? (
            <Button variant="secondary" onClick={exportCsv} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          ) : null}
          <Link to="/tickets/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Ticket
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tickets..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                ref={searchRef}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="waiting_customer">Aguardando Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]" aria-label="Filtrar por prioridade">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]" aria-label="Filtrar por categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {(categoriesQuery.data || []).map((c: any) => (
                  <SelectItem key={String(c._id)} value={String(c._id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canUseMineFilter ? (
              <Button
                type="button"
                variant={mineOnly ? 'default' : 'outline'}
                onClick={() => {
                  setMineOnly((v) => !v);
                  setPage(1);
                }}
              >
                Meus tickets
              </Button>
            ) : null}

            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]" aria-label="Itens por página">
                <SelectValue placeholder="Por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 / página</SelectItem>
                <SelectItem value="50">50 / página</SelectItem>
                <SelectItem value="100">100 / página</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
              >
                Limpar
              </Button>
            ) : null}
          </div>
          {isFetching && !isLoading ? (
            <div className="mt-3 text-xs text-muted-foreground">Atualizando resultados...</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        {selectedIds.length ? (
          <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">{selectedIds.length} selecionado(s)</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={exportSelectedCsv}>
                Exportar selecionados
              </Button>
              {user?.role !== 'client' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bulkUpdateStatus('resolved')}
                    disabled={isBulkUpdating}
                  >
                    Marcar como resolvido
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bulkUpdateStatus('closed')}
                    disabled={isBulkUpdating}
                  >
                    Fechar
                  </Button>
                </>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Limpar seleção
              </Button>
            </div>
          </div>
        ) : null}
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium w-10">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(tickets.map((t) => String(t._id)));
                      else setSelectedIds([]);
                    }}
                    aria-label="Selecionar todos os tickets da página"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Título</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Prioridade</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Criado por</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Data</th>
                <th scope="col" className="px-4 py-3 text-right text-sm font-medium">Chat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  <tr>
                    <td className="px-4 py-4 text-left text-xs text-muted-foreground" colSpan={9}>
                      Carregando tickets...
                    </td>
                  </tr>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="border-b last:border-0">
                      <td className="px-4 py-3" colSpan={9}>
                        <div className="h-5 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {isError && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-destructive" colSpan={9}>
                    Erro ao carregar tickets
                  </td>
                </tr>
              )}
              {!isLoading && !isError && tickets.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={9}>
                    <div className="space-y-2">
                      <div>Nenhum ticket encontrado</div>
                      <div>
                        <Link to="/tickets/new" className="text-primary hover:underline">
                          Criar um ticket
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && tickets.map((ticket) => (
                <tr key={ticket._id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(String(ticket._id))}
                      onChange={() => {
                        const id = String(ticket._id);
                        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
                      }}
                      aria-label={`Selecionar ticket ${ticket.ticketNumber}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/tickets/${ticket._id}`} className="font-medium text-primary hover:underline">
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/tickets/${ticket._id}`} className="hover:underline">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                  <td className="px-4 py-3">{getPriorityBadge(ticket.priority)}</td>
                  <td className="px-4 py-3 text-sm">{ticket.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{ticket.createdBy?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openTicketChat(ticket)}
                      disabled={openingChatId === String(ticket._id)}
                      title="Abrir chat do ticket"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pagination ? (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.pages} • {pagination.total} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || isFetching}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages || p + 1, p + 1))}
              disabled={pagination.page >= pagination.pages || isFetching}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
