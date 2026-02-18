import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SectionState = {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
};

type Props = {
  trendData: any[];
  trend: SectionState;

  statusData: Array<{ name: string; value: number; color: string }>;
  status: SectionState;

  priorityData: any[];
  priority: SectionState;

  categoryData: any[];
  category: SectionState;

  agentData: any[];
  agents: SectionState;

  satisfactionData: any[];
  satisfaction: SectionState;

  slaData: Array<{ name: string; value: number; color: string }>;
  sla: { isLoading: boolean; isError: boolean };
};

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

export default function DashboardCharts({
  trendData,
  trend,
  statusData,
  status,
  priorityData,
  priority,
  categoryData,
  category,
  agentData,
  agents,
  satisfactionData,
  satisfaction,
  slaData,
  sla,
}: Props) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Tickets por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar o gráfico.</div>
            ) : trend.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !trend.hasData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
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
            {status.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : status.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !status.hasData ? (
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
                  <Tooltip contentStyle={tooltipStyle} />
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
            {priority.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : priority.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !priority.hasData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priorityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={60} />
                  <Tooltip contentStyle={tooltipStyle} />
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
            {category.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : category.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !category.hasData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
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
            {agents.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : agents.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !agents.hasData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={agentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
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
            {satisfaction.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : satisfaction.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !satisfaction.hasData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={satisfactionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="rating" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
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
            {sla.isError ? (
              <div className="py-10 text-center text-sm text-destructive">Não foi possível carregar os dados.</div>
            ) : sla.isLoading ? (
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
                      <Tooltip contentStyle={tooltipStyle} />
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
    </>
  );
}
