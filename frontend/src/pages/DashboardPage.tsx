import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Star,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { analyticsApi } from '@/config/analytics';
import { ticketsApi } from '@/api/tickets';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const STATUS_COLORS: Record<string, string> = {
  open: '#EF4444',
  in_progress: '#3B82F6',
  waiting_customer: '#F59E0B',
  resolved: '#10B981',
  closed: '#6B7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#10B981',
};

const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
};

const statusLabel: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  waiting_customer: 'Aguardando',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const statusClass: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  waiting_customer: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const priorityLabel: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const priorityClass: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: any;
  change?: string;
  changeType?: 'up' | 'down';
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? <div className="h-8 w-20 animate-pulse rounded bg-muted" /> : value}
        </div>
        {change && (
          <div className="flex items-center text-xs">
            {changeType === 'up' ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span className={changeType === 'up' ? 'text-green-500' : 'text-red-500'}>
              {change}
            </span>
            <span className="text-muted-foreground ml-1">desde o último mês</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [trendDays, setTrendDays] = useState(30);

  const statsQuery = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      const res = await analyticsApi.getDashboardStats();
      return res.data.stats;
    },
    staleTime: 60_000,
  });

  const statusQuery = useQuery({
    queryKey: ['analytics', 'tickets-by-status'],
    queryFn: async () => {
      const res = await analyticsApi.getTicketsByStatus();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const priorityQuery = useQuery({
    queryKey: ['analytics', 'tickets-by-priority'],
    queryFn: async () => {
      const res = await analyticsApi.getTicketsByPriority();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const categoryQuery = useQuery({
    queryKey: ['analytics', 'tickets-by-category'],
    queryFn: async () => {
      const res = await analyticsApi.getTicketsByCategory();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const trendQuery = useQuery({
    queryKey: ['analytics', 'tickets-trend', trendDays],
    queryFn: async () => {
      const res = await analyticsApi.getTicketsTrend(trendDays);
      return res.data.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const topAgentsQuery = useQuery({
    queryKey: ['analytics', 'top-agents'],
    queryFn: async () => {
      const res = await analyticsApi.getTopAgents();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const slaQuery = useQuery({
    queryKey: ['analytics', 'sla-compliance'],
    queryFn: async () => {
      const res = await analyticsApi.getSLACompliance();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const satisfactionQuery = useQuery({
    queryKey: ['analytics', 'satisfaction'],
    queryFn: async () => {
      const res = await analyticsApi.getSatisfactionStats();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const recentTicketsQuery = useQuery({
    queryKey: ['tickets', 'recent'],
    queryFn: async () => {
      const res = await ticketsApi.list({ page: 1, limit: 8 });
      return res.data.tickets as any[];
    },
    staleTime: 30_000,
  });

  const criticalTicketsQuery = useQuery({
    queryKey: ['tickets', 'critical'],
    queryFn: async () => {
      const res = await ticketsApi.list({ page: 1, limit: 8, priority: 'urgent' });
      return res.data.tickets as any[];
    },
    staleTime: 30_000,
  });

  const pendingTicketsQuery = useQuery({
    queryKey: ['tickets', 'pending'],
    queryFn: async () => {
      const res = await ticketsApi.list({ page: 1, limit: 8, status: 'open' });
      return res.data.tickets as any[];
    },
    staleTime: 30_000,
  });

  const stats = statsQuery.data || {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    ticketsThisMonth: 0,
    totalAgents: 0,
    avgResponseTime: 0,
    satisfaction: 0,
  };

  const statusData = useMemo(() => {
    const s = statusQuery.data || { open: 0, in_progress: 0, waiting_customer: 0, resolved: 0, closed: 0 };
    return [
      { name: 'Aberto', value: s.open, color: STATUS_COLORS.open },
      { name: 'Em Andamento', value: s.in_progress, color: STATUS_COLORS.in_progress },
      { name: 'Aguardando', value: s.waiting_customer, color: STATUS_COLORS.waiting_customer },
      { name: 'Resolvido', value: s.resolved, color: STATUS_COLORS.resolved },
      { name: 'Fechado', value: s.closed, color: STATUS_COLORS.closed },
    ];
  }, [statusQuery.data]);

  const priorityData = useMemo(() => {
    const p = priorityQuery.data || { urgent: 0, high: 0, medium: 0, low: 0 };
    return [
      { name: 'Urgente', value: p.urgent, color: PRIORITY_COLORS.urgent },
      { name: 'Alta', value: p.high, color: PRIORITY_COLORS.high },
      { name: 'Média', value: p.medium, color: PRIORITY_COLORS.medium },
      { name: 'Baixa', value: p.low, color: PRIORITY_COLORS.low },
    ];
  }, [priorityQuery.data]);

  const categoryData = useMemo(() => {
    const items = categoryQuery.data || [];
    return items.map((i: any) => ({ name: i._id, count: i.count }));
  }, [categoryQuery.data]);

  const trendData = useMemo(() => {
    const items = trendQuery.data || [];
    return items.map((i: any) => ({
      date: formatShortDate(i._id),
      created: i.created,
      resolved: i.resolved,
    }));
  }, [trendQuery.data]);

  const agentData = useMemo(() => {
    const items = topAgentsQuery.data || [];
    return items.map((i: any) => ({ name: i.name, total: i.total, resolved: i.resolved }));
  }, [topAgentsQuery.data]);

  const satisfactionData = useMemo(() => {
    const dist = satisfactionQuery.data?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    return [
      { rating: '5 estrelas', count: dist[5] || 0 },
      { rating: '4 estrelas', count: dist[4] || 0 },
      { rating: '3 estrelas', count: dist[3] || 0 },
      { rating: '2 estrelas', count: dist[2] || 0 },
      { rating: '1 estrela', count: dist[1] || 0 },
    ];
  }, [satisfactionQuery.data]);

  const slaData = useMemo(() => {
    const breachRate = slaQuery.data?.breachRate || 0;
    const okRate = Math.max(0, 100 - breachRate);
    return [
      { name: 'Dentro do SLA', value: okRate, color: '#10B981' },
      { name: 'Fora do SLA', value: breachRate, color: '#EF4444' },
    ];
  }, [slaQuery.data]);

  const showStatsLoading = statsQuery.isLoading && !statsQuery.data;
  const hasTrendData = Array.isArray(trendQuery.data) && trendQuery.data.length > 0;
  const hasStatusData = statusData.some((i) => (i.value || 0) > 0);
  const hasPriorityData = priorityData.some((i) => (i.value || 0) > 0);
  const hasCategoryData = categoryData.some((i: any) => (i.count || 0) > 0);
  const hasAgentData = agentData.some((i: any) => (i.total || 0) > 0 || (i.resolved || 0) > 0);
  const hasSatisfactionData = satisfactionData.some((i) => (i.count || 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Select value={String(trendDays)} onValueChange={(v) => setTrendDays(parseInt(v, 10))}>
            <SelectTrigger className="w-[170px]" aria-label="Selecionar período">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/tickets/new">
            <Button>Novo Ticket</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Tickets"
          value={stats.totalTickets}
          icon={Ticket}
          isLoading={showStatsLoading}
        />
        <StatCard
          title="Em Aberto"
          value={stats.openTickets}
          icon={AlertCircle}
          isLoading={showStatsLoading}
        />
        <StatCard
          title="Em Andamento"
          value={stats.inProgressTickets}
          icon={Clock}
          isLoading={showStatsLoading}
        />
        <StatCard
          title="Resolvidos"
          value={stats.resolvedTickets}
          icon={CheckCircle}
          isLoading={showStatsLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tickets Este Mês"
          value={stats.ticketsThisMonth}
          icon={TrendingUp}
          isLoading={showStatsLoading}
        />
        <StatCard
          title="Agentes Ativos"
          value={stats.totalAgents}
          icon={Users}
          isLoading={showStatsLoading}
        />
        <StatCard
          title="Tempo Médio Resposta"
          value={`${stats.avgResponseTime}h`}
          icon={Clock}
          isLoading={showStatsLoading}
        />
        <StatCard
          title="Satisfação"
          value={`${stats.satisfaction}/5`}
          icon={Star}
          isLoading={showStatsLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Tickets por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {trendQuery.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar o gráfico.</div>
            ) : trendQuery.isLoading && !trendQuery.data ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !hasTrendData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    name="Criados"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                    name="Resolvidos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusQuery.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : statusQuery.isLoading && !statusQuery.data ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !hasStatusData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityQuery.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : priorityQuery.isLoading && !priorityQuery.data ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !hasPriorityData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priorityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryQuery.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : categoryQuery.isLoading && !categoryQuery.data ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !hasCategoryData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            {topAgentsQuery.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : topAgentsQuery.isLoading && !topAgentsQuery.data ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !hasAgentData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={agentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#3B82F6" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" fill="#10B981" name="Resolvidos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Satisfação do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {satisfactionQuery.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : satisfactionQuery.isLoading && !satisfactionQuery.data ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !hasSatisfactionData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={satisfactionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="rating" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Compliance SLA</CardTitle>
          </CardHeader>
          <CardContent>
            {slaQuery.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : slaQuery.isLoading && !slaQuery.data ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={slaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {slaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{slaData[0]?.value || 0}%</div>
                    <div className="text-xs text-muted-foreground">Dentro do SLA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{slaData[1]?.value || 0}%</div>
                    <div className="text-xs text-muted-foreground">Fora do SLA</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
          <TabsTrigger value="critical">Críticos</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
        </TabsList>
        <TabsContent value="recent">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Título</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Prioridade</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Responsável</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTicketsQuery.isLoading && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {recentTicketsQuery.isError && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-destructive" colSpan={6}>
                        Erro ao carregar
                      </td>
                    </tr>
                  )}
                  {!recentTicketsQuery.isLoading && !recentTicketsQuery.isError && (recentTicketsQuery.data || []).length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        Nenhum ticket
                      </td>
                    </tr>
                  )}
                  {!recentTicketsQuery.isLoading && !recentTicketsQuery.isError && (recentTicketsQuery.data || []).map((ticket) => (
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
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabel[ticket.status] || ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClass[ticket.priority] || 'bg-gray-100 text-gray-800'}`}>
                          {priorityLabel[ticket.priority] || ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ticket.assignedTo?.name || 'Não atribuído'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="critical">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Título</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Prioridade</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Responsável</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalTicketsQuery.isLoading && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {criticalTicketsQuery.isError && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-destructive" colSpan={6}>
                        Erro ao carregar
                      </td>
                    </tr>
                  )}
                  {!criticalTicketsQuery.isLoading && !criticalTicketsQuery.isError && (criticalTicketsQuery.data || []).length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        Nenhum ticket crítico
                      </td>
                    </tr>
                  )}
                  {!criticalTicketsQuery.isLoading && !criticalTicketsQuery.isError && (criticalTicketsQuery.data || []).map((ticket) => (
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
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabel[ticket.status] || ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClass[ticket.priority] || 'bg-gray-100 text-gray-800'}`}>
                          {priorityLabel[ticket.priority] || ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ticket.assignedTo?.name || 'Não atribuído'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Título</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Prioridade</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Responsável</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTicketsQuery.isLoading && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {pendingTicketsQuery.isError && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-destructive" colSpan={6}>
                        Erro ao carregar
                      </td>
                    </tr>
                  )}
                  {!pendingTicketsQuery.isLoading && !pendingTicketsQuery.isError && (pendingTicketsQuery.data || []).length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        Nenhum ticket pendente
                      </td>
                    </tr>
                  )}
                  {!pendingTicketsQuery.isLoading && !pendingTicketsQuery.isError && (pendingTicketsQuery.data || []).map((ticket) => (
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
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabel[ticket.status] || ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClass[ticket.priority] || 'bg-gray-100 text-gray-800'}`}>
                          {priorityLabel[ticket.priority] || ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ticket.assignedTo?.name || 'Não atribuído'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('pt-BR') : '-'}
                      </td>
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
