import { lazy, Suspense, useState, useEffect } from 'react';
import { Clock, Calendar, Download, TrendingUp, User, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const TimeReportsCharts = lazy(() => import('@/components/charts/TimeReportsCharts'));
import { api } from '@/config/api';
import { FeatureUnavailable } from '@/components/FeatureUnavailable';
import { DataStateCard } from '@/components/DataStateCard';

interface TimeStats {
  totalDuration: number;
  billableDuration: number;
  nonBillableDuration: number;
  totalEntries: number;
}

interface UserTime {
  userId: string;
  name: string;
  duration: number;
  entries: number;
}

interface TicketTime {
  ticketId: string;
  ticketNumber: string;
  title: string;
  duration: number;
  entries: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function TimeReportsPage() {
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [byUser, setByUser] = useState<UserTime[]>([]);
  const [byTicket, setByTicket] = useState<TicketTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoadError(null);
      setForbidden(false);
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '365':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const res = await api.get('/time/stats', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      const data = res.data;
      setStats(data.stats);
      setByUser(data.byUser || []);
      setByTicket(data.byTicket || []);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        if (import.meta.env.DEV) console.error('Error fetching stats:', error);
        setLoadError('Não foi possível carregar o relatório de tempo');
      }
    } finally {
      setLoading(false);
    }
  };

  const pieData = stats
    ? [
        { name: 'Billável', value: stats.billableDuration },
        { name: 'Não Billável', value: stats.nonBillableDuration },
      ]
    : [];

  const userChartData = byUser
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map((u) => ({
      name: u.name.length > 15 ? u.name.substring(0, 15) + '...' : u.name,
      hours: Math.round(u.duration / (1000 * 60 * 60) * 10) / 10,
    }));

  const ticketChartData = byTicket
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map((t) => ({
      name: t.ticketNumber,
      hours: Math.round(t.duration / (1000 * 60 * 60) * 10) / 10,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Tempo</h1>
          <p className="text-muted-foreground">Controle de tempo indisponível no seu plano.</p>
        </div>
        <FeatureUnavailable
          title="Controle de tempo bloqueado"
          description="Sua empresa precisa de um plano superior para acessar o controle de tempo e relatórios."
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Tempo</h1>
          <p className="text-muted-foreground">Acompanhe o tempo gasto em tickets</p>
        </div>
        <DataStateCard title="Falha ao carregar" description={loadError} actionLabel="Tentar novamente" onAction={fetchStats} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Tempo</h1>
          <p className="text-muted-foreground">
            Acompanhe o tempo gasto em tickets
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]" aria-label="Selecionar período">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">
                  {stats ? formatDuration(stats.totalDuration) : '0h 0m'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Billável</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats ? formatDuration(stats.billableDuration) : '0h 0m'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Não Billável</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats ? formatDuration(stats.nonBillableDuration) : '0h 0m'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold">
                  {stats?.totalEntries || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, idx) => (
              <Card key={`time-charts-skel-${idx}`}>
                <CardContent className="py-10">
                  <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <TimeReportsCharts pieData={pieData} userChartData={userChartData} formatDuration={formatDuration} />
      </Suspense>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Por Usuário</TabsTrigger>
          <TabsTrigger value="tickets">Por Ticket</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Usuário</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Tempo Total</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Entradas</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Média por Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {byUser.map((user) => (
                    <tr key={user.userId} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">{formatDuration(user.duration)}</td>
                      <td className="px-4 py-3">{user.entries}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDuration(Math.round(user.duration / user.entries))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Título</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Tempo Total</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Entradas</th>
                  </tr>
                </thead>
                <tbody>
                  {byTicket.map((ticket) => (
                    <tr key={ticket.ticketId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{ticket.ticketNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                        {ticket.title}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatDuration(ticket.duration)}</td>
                      <td className="px-4 py-3">{ticket.entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
