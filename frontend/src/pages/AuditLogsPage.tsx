import { useState } from 'react';
import { Search, Filter, Download, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const actions = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'ticket.created', label: 'Ticket criado' },
  { value: 'ticket.updated', label: 'Ticket atualizado' },
  { value: 'ticket.assigned', label: 'Ticket atribuido' },
  { value: 'ticket.status_changed', label: 'Status alterado' },
  { value: 'ticket.resolved', label: 'Ticket resolvido' },
  { value: 'comment.created', label: 'Comentário adicionado' },
  { value: 'user.login', label: 'Login de usuário' },
  { value: 'settings.updated', label: 'Configurações alteradas' },
  { value: 'article.created', label: 'Artigo criado' },
  { value: 'article.updated', label: 'Artigo atualizado' },
  { value: 'article.deleted', label: 'Artigo removido' },
];

const mockLogs = [
  { id: '1', action: 'ticket.created', user: { name: 'João Silva' }, resource: 'TKT-00001', details: { title: 'Problema no login' }, ip: '192.168.1.1', createdAt: '2024-01-15 10:30' },
  { id: '2', action: 'ticket.status_changed', user: { name: 'Maria Santos' }, resource: 'TKT-00002', details: { from: 'open', to: 'in_progress' }, ip: '192.168.1.2', createdAt: '2024-01-15 10:35' },
  { id: '3', action: 'comment.created', user: { name: 'Carlos Tech' }, resource: 'TKT-00001', details: { preview: 'Verificando o problema...' }, ip: '192.168.1.3', createdAt: '2024-01-15 10:40' },
  { id: '4', action: 'user.login', user: { name: 'Pedro Oliveira' }, resource: 'User', details: { method: 'password' }, ip: '192.168.1.4', createdAt: '2024-01-15 10:45' },
  { id: '5', action: 'settings.updated', user: { name: 'Admin' }, resource: 'Tenant', details: { field: 'slaResponseTime', from: 4, to: 2 }, ip: '192.168.1.5', createdAt: '2024-01-15 11:00' },
];

const getActionLabel = (action: string) => {
  const found = actions.find((a) => a.value === action);
  return found?.label || action;
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch = log.user.name.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <Button variant="outline">
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
              <SelectTrigger className="w-[200px]">
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
                  <td className="px-4 py-3 text-sm">{log.createdAt}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{log.user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{log.resource}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {Object.entries(log.details).map(([key, value]) => (
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
