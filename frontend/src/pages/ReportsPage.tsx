import { lazy, Suspense, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
const ReportsCharts = lazy(() => import('@/components/charts/ReportsCharts'));
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { analyticsApi } from '@/config/analytics';
import { downloadCSV } from '@/utils/csv';
import { FeatureUnavailable } from '@/components/FeatureUnavailable';
import { reportSchedulesApi } from '@/api/reportSchedules';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="bg-card">
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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Relatorio semanal',
    frequency: 'weekly',
    hour: 9,
    dayOfWeek: 1,
    recipients: '',
  });

  const qc = useQueryClient();
  const { toast } = useToast();

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

  const schedulesQuery = useQuery({
    queryKey: ['report-schedules'],
    queryFn: async () => {
      const res = await reportSchedulesApi.list();
      return res.data;
    },
    staleTime: 60_000,
    retry: 0,
  });

  const schedulesForbidden = (schedulesQuery.error as any)?.response?.status === 403;
  const schedules = schedulesQuery.data?.schedules || [];
  const schedulesUsage = schedulesQuery.data?.usage;
  const schedulesLimitReached =
    schedulesUsage?.max !== undefined && schedulesUsage.max !== -1 && (schedulesUsage.current || 0) >= schedulesUsage.max;

  const createSchedule = useMutation({
    mutationFn: async () => {
      const emails = scheduleForm.recipients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await reportSchedulesApi.create({
        name: scheduleForm.name,
        frequency: scheduleForm.frequency,
        hour: Number(scheduleForm.hour),
        dayOfWeek: scheduleForm.frequency === 'weekly' ? Number(scheduleForm.dayOfWeek) : undefined,
        recipients: emails,
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      toast({ title: 'Agendamento criado' });
      setScheduleOpen(false);
    },
    onError: (e: any) => {
      toast({
        title: 'Erro ao agendar',
        description: e?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
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
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Fim</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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

       <Card>
         <CardHeader>
           <div className="flex items-center justify-between gap-3">
             <div className="space-y-1">
                <CardTitle>Relatórios agendados (Email)</CardTitle>
               {!schedulesForbidden && schedulesUsage ? (
                 <p className="text-xs text-muted-foreground">
                   {schedulesUsage.max === -1 ? 'Ilimitado' : `${schedulesUsage.current}/${schedulesUsage.max} usados`}
                   {schedulesLimitReached ? (
                     <>
                       {' '}
                       - limite do plano atingido. <Link className="underline" to="/plans">Ver planos</Link>
                     </>
                   ) : null}
                 </p>
               ) : null}
             </div>
             <Dialog
               open={scheduleOpen}
               onOpenChange={(open) => {
                 if (open) {
                   if (schedulesForbidden) {
                     toast({
                       title: 'Agendamento bloqueado',
                        description: 'Disponível apenas em planos superiores.',
                       variant: 'destructive',
                     });
                     return;
                   }
                   if (schedulesLimitReached) {
                     toast({
                       title: 'Limite do plano atingido',
                        description: 'Você atingiu o limite de relatórios agendados do seu plano. Veja os planos para aumentar esse limite.',
                       variant: 'destructive',
                     });
                     return;
                   }
                 }
                 setScheduleOpen(open);
               }}
             >
               <DialogTrigger asChild>
                 <Button variant="secondary" disabled={schedulesQuery.isLoading}>
                   Agendar
                 </Button>
               </DialogTrigger>
               <DialogContent className="max-w-lg">
                 <DialogHeader>
                   <DialogTitle>Novo agendamento</DialogTitle>
                 </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={scheduleForm.name} onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Select value={scheduleForm.frequency} onValueChange={(v) => setScheduleForm({ ...scheduleForm, frequency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Select value={String(scheduleForm.hour)} onValueChange={(v) => setScheduleForm({ ...scheduleForm, hour: Number(v) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, h) => (
                            <SelectItem key={h} value={String(h)}>
                              {String(h).padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {scheduleForm.frequency === 'weekly' ? (
                    <div className="space-y-2">
                      <Label>Dia da semana</Label>
                      <Select value={String(scheduleForm.dayOfWeek)} onValueChange={(v) => setScheduleForm({ ...scheduleForm, dayOfWeek: Number(v) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Segunda</SelectItem>
                          <SelectItem value="2">Terça</SelectItem>
                          <SelectItem value="3">Quarta</SelectItem>
                          <SelectItem value="4">Quinta</SelectItem>
                          <SelectItem value="5">Sexta</SelectItem>
                          <SelectItem value="0">Domingo</SelectItem>
                          <SelectItem value="6">Sábado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label>Destinatários (separar por vírgula)</Label>
                    <Input
                      placeholder="financeiro@empresa.com, gestor@empresa.com"
                      value={scheduleForm.recipients}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">O email contém um link para a página de relatórios com o filtro atual.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => createSchedule.mutate()} disabled={createSchedule.isPending}>
                    {createSchedule.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
         <CardContent>
           {schedulesForbidden ? (
             <FeatureUnavailable
               title="Agendamento bloqueado"
                description="Relatórios agendados por email estão disponíveis apenas em planos superiores."
             />
           ) : schedulesQuery.isLoading ? (
             <p className="text-sm text-muted-foreground">Carregando...</p>
           ) : schedulesQuery.isError ? (
             <p className="text-sm text-destructive">Falha ao carregar agendamentos</p>
           ) : schedules.length === 0 ? (
             <p className="text-sm text-muted-foreground">Nenhum agendamento criado</p>
           ) : (
             <div className="space-y-2">
               {schedules.map((s: any) => (
                 <div key={s._id} className="rounded-lg border p-3">
                   <p className="font-medium">{s.name}</p>
                   <p className="text-xs text-muted-foreground mt-1">
                      Próximo envio: {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString('pt-BR') : '-'}
                   </p>
                 </div>
               ))}
             </div>
           )}
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
          csatByAgentData={report?.premium?.csatByAgent || []}
          csatByCategoryData={report?.premium?.csatByCategory || []}
          slaByCategoryData={report?.premium?.slaByCategory || []}
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
