import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, MessageCircle, Plus, Search } from 'lucide-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
import { chatApi } from '@/api/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '@/config/api';

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
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialPriority = searchParams.get('priority') || 'all';
  const initialMine = searchParams.get('mine') === '1';
  const initialPage = Math.max(1, Number(searchParams.get('page') || 1) || 1);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [mineOnly, setMineOnly] = useState(initialMine);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(20);
  const [isExporting, setIsExporting] = useState(false);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    // Support back/forward navigation by reading URL state
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const mine = searchParams.get('mine') === '1';
    const nextPage = Math.max(1, Number(searchParams.get('page') || 1) || 1);

    if (q !== debouncedSearch) {
      setSearch(q);
      setDebouncedSearch(q);
    }
    if (status !== statusFilter) setStatusFilter(status);
    if (priority !== priorityFilter) setPriorityFilter(priority);
    if (mine !== mineOnly) setMineOnly(mine);
    if (nextPage !== page) setPage(nextPage);
  }, [debouncedSearch, mineOnly, page, priorityFilter, searchParams, statusFilter]);

  useEffect(() => {
    // keep URL in sync (shareable state)
    const next = new URLSearchParams();
    if (debouncedSearch.trim()) next.set('q', debouncedSearch.trim());
    if (statusFilter !== 'all') next.set('status', statusFilter);
    if (priorityFilter !== 'all') next.set('priority', priorityFilter);
    if (mineOnly) next.set('mine', '1');
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, mineOnly, page, priorityFilter, setSearchParams, statusFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tickets', { page, limit, search: debouncedSearch, statusFilter, priorityFilter, mineOnly }],
    queryFn: async () => {
      const res = await ticketsApi.list({
        page,
        limit,
        search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
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
        title: 'Nao foi possivel abrir o chat',
        description: msg || (user?.role === 'client' ? 'Ticket sem agente atribuido' : 'Tente novamente'),
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
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Por pagina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 / pagina</SelectItem>
                <SelectItem value="50">50 / pagina</SelectItem>
                <SelectItem value="100">100 / pagina</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Título</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Prioridade</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Criado por</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Chat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={8}>
                    Carregando tickets...
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-destructive" colSpan={8}>
                    Erro ao carregar tickets
                  </td>
                </tr>
              )}
              {!isLoading && !isError && tickets.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={8}>
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
            Pagina {pagination.page} de {pagination.pages} • {pagination.total} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages || p + 1, p + 1))}
              disabled={pagination.page >= pagination.pages}
            >
              Proxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
