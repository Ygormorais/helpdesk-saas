import { useMemo, useState } from 'react';
import { Search, Download, User } from 'lucide-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auditApi } from '@/api/audit';
import { api } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { FeatureUnavailable } from '@/components/FeatureUnavailable';

const actions = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'ticket.created', label: 'Ticket criado' },
  { value: 'ticket.updated', label: 'Ticket atualizado' },
  { value: 'ticket.assigned', label: 'Ticket atribuído' },
  { value: 'ticket.status_changed', label: 'Status alterado' },
  { value: 'ticket.resolved', label: 'Ticket resolvido' },
  { value: 'comment.created', label: 'Comentário adicionado' },
  { value: 'user.login', label: 'Login de usuário' },
  { value: 'settings.updated', label: 'Configurações alteradas' },
  { value: 'article.created', label: 'Artigo criado' },
  { value: 'article.updated', label: 'Artigo atualizado' },
  { value: 'article.deleted', label: 'Artigo removido' },
];

const getActionLabel = (action: string) => {
  const found = actions.find((a) => a.value === action);
  return found?.label || action;
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const { toast } = useToast();

  const planQuery = useQuery({
    queryKey: ['plan'],
    queryFn: async () => (await api.get('/plan')).data,
    staleTime: 60_000,
  });

  const query = useQuery({
    queryKey: ['audit', { actionFilter }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (actionFilter !== 'all') params.action = actionFilter;
      const res = await auditApi.list(params);
      return res.data;
    },
    staleTime: 60_000,
  });

  const forbidden = (query.error as any)?.response?.status === 403;

  const filteredLogs = useMemo(() => {
    const rows = query.data?.logs || [];
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((log) => {
      const u = String(log.user?.name || '').toLowerCase();
      const r = String(log.resourceId || log.resource || '').toLowerCase();
      return u.includes(s) || r.includes(s);
    });
  }, [query.data?.logs, search]);

  const exportCsv = async () => {
    try {
      const params: any = { limit: 5000 };
      if (actionFilter !== 'all') params.action = actionFilter;
      const res = await auditApi.exportCsv(params);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = status === 403
        ? 'Export disponível apenas em planos superiores. Faça upgrade para liberar.'
        : 'Não foi possível exportar';
      toast({ title: 'Falha ao exportar', description: msg, variant: 'destructive' });
    }
  };

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Atividade e alterações no sistema</p>
        </div>
        <FeatureUnavailable
          title="Audit log bloqueado"
          description="Sua conta não tem permissão para acessar auditoria."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          {planQuery.data?.retention?.auditDays ? (
            <p className="text-sm text-muted-foreground">Retenção do seu plano: {planQuery.data.retention.auditDays} dias</p>
          ) : null}
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou recurso..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-4 text-sm text-muted-foreground">Carregando...</div> : null}
          {query.isError ? <div className="p-4 text-sm text-destructive">Falha ao carregar auditoria.</div> : null}

          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Data/Hora</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Ação</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Usuário</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Recurso</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Detalhes</th>
                <th className="px-4 py-3 text-left text-sm font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : ''}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{log.user?.name || 'Usuário'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{log.resourceId || log.resource}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {Object.entries(log.details || {}).map(([key, value]) => (
                      <span key={key} className="block">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
