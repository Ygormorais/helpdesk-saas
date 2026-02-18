import { lazy, Suspense, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
const ReportsCharts = lazy(() => import('@/components/charts/ReportsCharts'));
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyticsApi } from '@/config/analytics';
import { downloadCSV } from '@/utils/csv';
import { FeatureUnavailable } from '@/components/FeatureUnavailable';

function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold">{value}</CardContent>
    </Card>
  );
}

const STATUS_META: Array<{ key: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'; label: string; color: string }> = [
  { key: 'open', label: 'Aberto', color: '#EF4444' },
  { key: 'in_progress', label: 'Em andamento', color: '#3B82F6' },
  { key: 'waiting_customer', label: 'Aguardando cliente', color: '#F59E0B' },
  { key: 'resolved', label: 'Resolvido', color: '#10B981' },
  { key: 'closed', label: 'Fechado', color: '#6B7280' },
];

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const setDateRangeMonths = (monthsBack: number) => {
    const today = new Date();
    const past = new Date(today);
    past.setMonth(today.getMonth() - monthsBack);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setStartDate(fmt(past));
    setEndDate(fmt(today));
  };

  const reportsQuery = useQuery({
    queryKey: ['analytics-reports', { startDate, endDate }],
    queryFn: async () => {
      const res = await analyticsApi.getReports({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return res.data.data;
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const priorityQuery = useQuery({
    queryKey: ['analytics-priority'],
    queryFn: async () => {
      const res = await analyticsApi.getTicketsByPriority();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const satisfactionQuery = useQuery({
    queryKey: ['analytics-satisfaction'],
    queryFn: async () => {
      const res = await analyticsApi.getSatisfactionStats();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const categoryQuery = useQuery({
    queryKey: ['analytics-category'],
    queryFn: async () => {
      const res = await analyticsApi.getTicketsByCategory();
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const report = reportsQuery.data;
  const trend = report?.trend ?? [];
  const status = report?.status;
  const slaTrend = report?.slaTrend ?? [];

  const statusPieData = useMemo(() => {
    const s = status ?? { open: 0, in_progress: 0, waiting_customer: 0, resolved: 0, closed: 0 };
    return STATUS_META.map((m) => ({
      name: m.label,
      value: s[m.key] ?? 0,
      color: m.color,
    }));
  }, [status]);

  const totalTickets = useMemo(
    () => statusPieData.reduce((acc, item) => acc + (item.value || 0), 0),
    [statusPieData]
  );

  const avgResolutionHours = useMemo(() => {
    const ms = report?.kpis?.avgResolutionMs ?? 0;
    return ms > 0 ? Math.round((ms / (1000 * 60 * 60)) * 10) / 10 : 0;
  }, [report]);

  const avgFirstResponseHours = useMemo(() => {
    const ms = report?.kpis?.avgFirstResponseMs ?? 0;
    return ms > 0 ? Math.round((ms / (1000 * 60 * 60)) * 10) / 10 : 0;
  }, [report]);

  const slaPieData = useMemo(() => {
    const within = report?.sla.withinSla ?? 0;
    const outside = report?.sla.outsideSla ?? 0;
    return [
      { name: 'Dentro do SLA', value: within, color: '#10B981' },
      { name: 'Fora do SLA', value: outside, color: '#EF4444' },
    ];
  }, [report]);

  const agentsBarData = useMemo(() => {
    return (report?.agents ?? []).map((a) => ({
      name: a.name,
      resolved: a.resolved,
    }));
  }, [report]);

  const priorityBarData = useMemo(() => {
    const p = priorityQuery.data;
    if (!p) return [];
    return [
      { name: 'Urgente', value: p.urgent },
      { name: 'Alta', value: p.high },
      { name: 'Média', value: p.medium },
      { name: 'Baixa', value: p.low },
    ];
  }, [priorityQuery.data]);

  const satisfactionBarData = useMemo(() => {
    const s = satisfactionQuery.data;
    if (!s) return [];
    return Object.entries(s.distribution)
      .map(([rating, value]) => ({ rating, value }))
      .sort((a, b) => Number(b.rating) - Number(a.rating));
  }, [satisfactionQuery.data]);

  const categoryBarData = useMemo(() => {
    const c = categoryQuery.data;
    if (!c) return [];
    return c.map((row) => ({ category: row._id, value: row.count }));
  }, [categoryQuery.data]);

  const exportCSV_Tickets = () => {
    downloadCSV(
      ['date', 'created', 'resolved'],
      trend.map((r) => [r.date, r.created, r.resolved]),
      'tickets-trend.csv'
    );
  };

  const exportCSV_Status = () => {
    downloadCSV(
      ['status', 'count'],
      statusPieData.map((s) => [s.name, s.value]),
      'tickets-status.csv'
    );
  };

  const exportCSV_SLA = () => {
    downloadCSV(
      ['label', 'value'],
      slaPieData.map((s) => [s.name, s.value]),
      'sla.csv'
    );
  };

  const exportCSV_Agents = () => {
    downloadCSV(
      ['name', 'resolved', 'avgResolutionHours'],
      (report?.agents ?? []).map((a) => [a.name, a.resolved, Math.round((a.avgResolutionMs || 0) / (1000 * 60 * 60))]),
      'agents.csv'
    );
  };

  const exportAllCSVs = () => {
    exportCSV_Tickets();
    exportCSV_Status();
    exportCSV_SLA();
    exportCSV_Agents();
  };

  const forbidden =
    (reportsQuery.error as any)?.response?.status === 403 ||
    (priorityQuery.error as any)?.response?.status === 403 ||
    (satisfactionQuery.error as any)?.response?.status === 403 ||
    (categoryQuery.error as any)?.response?.status === 403;

  if (forbidden) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Relatórios avançados indisponíveis no seu plano.</p>
        </div>
        <FeatureUnavailable
          title="Relatórios bloqueados"
          description="Sua empresa precisa de um plano superior para acessar relatórios avançados."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Relatórios</h1>
          {report?.range ? (
            <div className="text-sm text-muted-foreground">
              Período: {report.range.start} a {report.range.end}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportAllCSVs} disabled={!report}>
            Exportar CSVs
          </Button>
          <Link to="/dashboard">
            <Button>Voltar ao Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI title="Criados (periodo)" value={report?.kpis?.createdCount ?? totalTickets} />
        <KPI title="Resolvidos (periodo)" value={report?.kpis?.resolvedCount ?? (status?.resolved ?? 0)} />
        <KPI title="Backlog (agora)" value={report?.kpis?.backlogCount ?? 0} />
        <KPI title="SLA (resolução)" value={`${report?.sla?.withinRate ?? 0}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI title="Tempo médio resolução" value={`${avgResolutionHours}h`} />
        <KPI title="Tempo medio 1a resposta" value={`${avgFirstResponseHours}h`} />
        <KPI title="Abertos" value={status?.open ?? 0} />
        <KPI title="Dias no grafico" value={trend.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <Button variant="secondary" onClick={() => setDateRangeMonths(2)}>
            Últimos 2 meses
          </Button>
          <Button variant="secondary" onClick={() => setDateRangeMonths(3)}>
            Últimos 3 meses
          </Button>
          <Button variant="ghost" onClick={() => {
            setStartDate('');
            setEndDate('');
          }}>
            Limpar
          </Button>
          <Button variant="secondary" onClick={exportCSV_Tickets} disabled={!report}>
            Exportar trend
          </Button>
        </CardContent>
      </Card>

      {reportsQuery.isError ? (
        <div className="text-sm text-red-600">Falha ao carregar relatórios.</div>
      ) : null}

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={`reports-charts-skel-a-${idx}`}>
                  <CardContent className="py-10">
                    <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Card key={`reports-charts-skel-b-${idx}`}>
                  <CardContent className="py-10">
                    <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }
      >
        <ReportsCharts
          report={report}
          trend={trend}
          statusPieData={statusPieData}
          slaPieData={slaPieData}
          agentsBarData={agentsBarData}
          slaTrend={slaTrend}
          priorityBarData={priorityBarData}
          satisfactionBarData={satisfactionBarData}
          categoryBarData={categoryBarData}
          satisfactionAverage={satisfactionQuery.data?.average ?? 0}
          onExportTrend={exportCSV_Tickets}
          onExportStatus={exportCSV_Status}
          onExportSla={exportCSV_SLA}
          onExportAgents={exportCSV_Agents}
        />
      </Suspense>
    </div>
  );
}
