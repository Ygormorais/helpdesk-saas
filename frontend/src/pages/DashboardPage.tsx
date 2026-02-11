import { useQuery } from '@tanstack/react-query';
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
import { analyticsApi } from '@/config/analytics';
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

const mockStats = {
  totalTickets: 156,
  openTickets: 23,
  inProgressTickets: 42,
  resolvedTickets: 91,
  ticketsThisMonth: 67,
  totalAgents: 8,
  avgResponseTime: 4.5,
  satisfaction: 4.2,
};

const mockStatusData = [
  { name: 'Aberto', value: 23, color: '#EF4444' },
  { name: 'Em Andamento', value: 42, color: '#3B82F6' },
  { name: 'Aguardando', value: 15, color: '#F59E0B' },
  { name: 'Resolvido', value: 91, color: '#10B981' },
  { name: 'Fechado', value: 35, color: '#6B7280' },
];

const mockPriorityData = [
  { name: 'Urgente', value: 12, color: '#EF4444' },
  { name: 'Alta', value: 35, color: '#F59E0B' },
  { name: 'Média', value: 78, color: '#3B82F6' },
  { name: 'Baixa', value: 31, color: '#10B981' },
];

const mockTrendData = [
  { date: '01/01', created: 12, resolved: 8 },
  { date: '02/01', created: 15, resolved: 12 },
  { date: '03/01', created: 8, resolved: 10 },
  { date: '04/01', created: 20, resolved: 15 },
  { date: '05/01', created: 18, resolved: 16 },
  { date: '06/01', created: 25, resolved: 20 },
  { date: '07/01', created: 22, resolved: 18 },
  { date: '08/01', created: 16, resolved: 14 },
  { date: '09/01', created: 28, resolved: 22 },
  { date: '10/01', created: 24, resolved: 20 },
  { date: '11/01', created: 19, resolved: 17 },
  { date: '12/01', created: 30, resolved: 25 },
];

const mockCategoryData = [
  { name: 'Técnico', count: 45 },
  { name: 'Financeiro', count: 23 },
  { name: 'Administrativo', count: 18 },
  { name: 'Geral', count: 12 },
  { name: 'Vendas', count: 8 },
];

const mockAgentData = [
  { name: 'Carlos', resolved: 45, total: 52 },
  { name: 'Maria', resolved: 38, total: 45 },
  { name: 'Pedro', resolved: 32, total: 40 },
  { name: 'Ana', resolved: 28, total: 35 },
  { name: 'João', resolved: 22, total: 28 },
];

const mockSLAdata = [
  { name: 'Dentro do SLA', value: 85, color: '#10B981' },
  { name: 'Fora do SLA', value: 15, color: '#EF4444' },
];

const mockSatisfactionData = [
  { rating: '5 estrelas', count: 45 },
  { rating: '4 estrelas', count: 32 },
  { rating: '3 estrelas', count: 12 },
  { rating: '2 estrelas', count: 5 },
  { rating: '1 estrela', count: 3 },
];

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
}: {
  title: string;
  value: string | number;
  icon: any;
  change?: string;
  changeType?: 'up' | 'down';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <select className="px-3 py-2 border rounded-md text-sm">
            <option>Últimos 30 dias</option>
            <option>Últimos 7 dias</option>
            <option>Último mês</option>
            <option>Este ano</option>
          </select>
          <Link to="/tickets">
            <Button>Novo Ticket</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Tickets"
          value={mockStats.totalTickets}
          icon={Ticket}
          change="+12%"
          changeType="up"
        />
        <StatCard
          title="Em Aberto"
          value={mockStats.openTickets}
          icon={AlertCircle}
          change="-5%"
          changeType="up"
        />
        <StatCard
          title="Em Andamento"
          value={mockStats.inProgressTickets}
          icon={Clock}
          change="+8%"
          changeType="up"
        />
        <StatCard
          title="Resolvidos"
          value={mockStats.resolvedTickets}
          icon={CheckCircle}
          change="+15%"
          changeType="up"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tickets Este Mês"
          value={mockStats.ticketsThisMonth}
          icon={TrendingUp}
          change="+23%"
          changeType="up"
        />
        <StatCard
          title="Agentes Ativos"
          value={mockStats.totalAgents}
          icon={Users}
        />
        <StatCard
          title="Tempo Médio Resposta"
          value={`${mockStats.avgResponseTime}h`}
          icon={Clock}
        />
        <StatCard
          title="Satisfação"
          value={`${mockStats.satisfaction}/5`}
          icon={Star}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Tickets por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockTrendData}>
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
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {mockStatusData.map((entry, index) => (
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockPriorityData} layout="vertical">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockCategoryData}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockAgentData}>
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Satisfação do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockSatisfactionData}>
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
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Compliance SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={mockSLAdata}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockSLAdata.map((entry, index) => (
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
                <div className="text-2xl font-bold text-green-500">85%</div>
                <div className="text-xs text-muted-foreground">Dentro do SLA</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">15%</div>
                <div className="text-xs text-muted-foreground">Fora do SLA</div>
              </div>
            </div>
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Título</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Prioridade</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Responsável</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: '1', ticketNumber: 'TKT-00001', title: 'Problema no login', status: 'open', priority: 'high', agent: 'Carlos', updated: '5 min atrás' },
                    { id: '2', ticketNumber: 'TKT-00002', title: 'Dúvida sobre cobrança', status: 'in_progress', priority: 'medium', agent: 'Maria', updated: '15 min atrás' },
                    { id: '3', ticketNumber: 'TKT-00003', title: 'Erro no sistema', status: 'waiting_customer', priority: 'urgent', agent: 'Pedro', updated: '30 min atrás' },
                    { id: '4', ticketNumber: 'TKT-00004', title: 'Solicitação de acesso', status: 'resolved', priority: 'low', agent: 'Ana', updated: '1h atrás' },
                    { id: '5', ticketNumber: 'TKT-00005', title: 'Feedback sobre atendimento', status: 'open', priority: 'low', agent: 'João', updated: '2h atrás' },
                  ].map((ticket) => (
                    <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link to={`/tickets/${ticket.id}`} className="font-medium text-primary hover:underline">
                          {ticket.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/tickets/${ticket.id}`} className="hover:underline">
                          {ticket.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                          ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {ticket.status === 'open' ? 'Aberto' :
                           ticket.status === 'in_progress' ? 'Em Andamento' :
                           ticket.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {ticket.priority === 'urgent' ? 'Urgente' :
                           ticket.priority === 'high' ? 'Alta' :
                           ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ticket.agent}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{ticket.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="critical">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum ticket crítico</h3>
                <p className="text-muted-foreground">Todos os tickets estão dentro do prazo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pending">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Tickets pendentes</h3>
                <p className="text-muted-foreground">Ver tickets aguardando resposta</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
