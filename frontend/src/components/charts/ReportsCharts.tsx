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
import { Button } from '@/components/ui/button';

type Props = {
  report: any;
  trend: any[];
  statusPieData: Array<{ name: string; value: number; color: string }>;
  slaPieData: Array<{ name: string; value: number; color: string }>;
  agentsBarData: any[];
  slaTrend: any[];
  priorityBarData: any[];
  satisfactionBarData: any[];
  categoryBarData: any[];
  csatByAgentData: Array<{ name: string; avgRating: number; count: number }>;
  csatByCategoryData: Array<{ name: string; avgRating: number; count: number }>;
  slaByCategoryData: Array<{ name: string; withinRate: number; totalResolved: number }>;
  satisfactionAverage: number;
  onExportTrend: () => void;
  onExportStatus: () => void;
  onExportSla: () => void;
  onExportAgents: () => void;
};

export default function ReportsCharts({
  report,
  trend,
  statusPieData,
  slaPieData,
  agentsBarData,
  slaTrend,
  priorityBarData,
  satisfactionBarData,
  categoryBarData,
  csatByAgentData,
  csatByCategoryData,
  slaByCategoryData,
  satisfactionAverage,
  onExportTrend,
  onExportStatus,
  onExportSla,
  onExportAgents,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between sm:flex-row">
            <CardTitle>Tickets por dia</CardTitle>
            <Button variant="secondary" onClick={onExportTrend} disabled={!report}>
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="created" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} name="Criados" />
                <Area type="monotone" dataKey="resolved" stroke="#10B981" fill="#10B981" fillOpacity={0.18} name="Resolvidos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between sm:flex-row">
            <CardTitle>Status de tickets</CardTitle>
            <Button variant="secondary" onClick={onExportStatus} disabled={!report}>
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusPieData} dataKey="value" cx="50%" cy="50%" outerRadius={84} label>
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between sm:flex-row">
            <CardTitle>SLA (resolução)</CardTitle>
            <Button variant="secondary" onClick={onExportSla} disabled={!report}>
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">
              Dentro do SLA: {report?.sla?.withinRate ?? 0}% (base: {report?.sla?.totalResolved ?? 0} tickets)
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={slaPieData} dataKey="value" cx="50%" cy="50%" outerRadius={84} label>
                  {slaPieData.map((entry, idx) => (
                    <Cell key={`sla-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between sm:flex-row">
            <CardTitle>Top agentes (resolvidos)</CardTitle>
            <Button variant="secondary" onClick={onExportAgents} disabled={!report}>
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agentsBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="resolved" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA trend (dentro do prazo)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={slaTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="withinRate" stroke="#10B981" fill="#10B981" fillOpacity={0.18} name="% dentro" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tickets por prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Satisfação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">Média: {satisfactionAverage}</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={satisfactionBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {(csatByAgentData.length > 0 || csatByCategoryData.length > 0 || slaByCategoryData.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>CSAT por agente</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={csatByAgentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="avgRating" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">Media de avaliacao (1 a 5)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CSAT por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={csatByCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="avgRating" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">Media de avaliacao (1 a 5)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SLA por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={slaByCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="withinRate" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">% de resolucoes dentro do prazo</p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
