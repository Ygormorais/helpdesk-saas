import { useState, useEffect } from 'react';
import { Star, TrendingUp, MessageSquare, Download, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SatisfactionCard } from '@/components/SatisfactionSurvey';
import { api } from '@/config/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#3B82F6', '#22C55E'];

interface SatisfactionStats {
  totalResponses: number;
  averageRating: number;
  distribution: Record<number, number>;
  promoters: number;
  detractors: number;
  passives: number;
  nps: number;
  satisfactionRate: number;
}

interface Comment {
  rating: number;
  comment: string;
  createdAt: string;
}

interface RecentSurvey {
  id: string;
  ticketNumber: string;
  title: string;
  rating: number;
  comment?: string;
  customer: { name: string };
  category: { name: string };
  createdAt: string;
}

export default function SatisfactionPage() {
  const [stats, setStats] = useState<SatisfactionStats | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [recentSurveys, setRecentSurveys] = useState<RecentSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const res = await api.get('/satisfaction/stats', { params: { days: dateRange } });
      const data = res.data;
      setStats(data.stats);
      setComments(data.comments || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching stats:', error);
      setLoadError('Não foi possível carregar as estatísticas de satisfação');
    } finally {
      setLoading(false);
    }
  };

  const chartData = stats
    ? [
        { name: '1 estrela', value: stats.distribution[1] || 0 },
        { name: '2 estrelas', value: stats.distribution[2] || 0 },
        { name: '3 estrelas', value: stats.distribution[3] || 0 },
        { name: '4 estrelas', value: stats.distribution[4] || 0 },
        { name: '5 estrelas', value: stats.distribution[5] || 0 },
      ]
    : [];

  const npsData = stats
    ? [
        { name: 'Promotores', value: stats.promoters, color: '#22C55E' },
        { name: 'Neutros', value: stats.passives, color: '#EAB308' },
        { name: 'Detratores', value: stats.detractors, color: '#EF4444' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Satisfação do Cliente</h1>
          <p className="text-muted-foreground">Acompanhe a satisfação dos seus clientes</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button onClick={fetchStats}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Satisfação do Cliente</h1>
          <p className="text-muted-foreground">
            Acompanhe a satisfação dos seus clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
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

      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SatisfactionCard
              average={stats.averageRating}
              total={stats.totalResponses}
              nps={stats.nps}
            />
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Promotores</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.promoters}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalResponses > 0
                    ? Math.round((stats.promoters / stats.totalResponses) * 100)
                    : 0}
                  % do total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Neutros</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.passives}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalResponses > 0
                    ? Math.round((stats.passives / stats.totalResponses) * 100)
                    : 0}
                  % do total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Detratores</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.detractors}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalResponses > 0
                    ? Math.round((stats.detractors / stats.totalResponses) * 100)
                    : 0}
                  % do total
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
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
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>NPS Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={npsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {npsData.map((entry, index) => (
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

          <Tabs defaultValue="comments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comments">Comentários</TabsTrigger>
              <TabsTrigger value="recent">Avaliações Recentes</TabsTrigger>
            </TabsList>

            <TabsContent value="comments">
              <Card>
                <CardHeader>
                  <CardTitle>Últimos Comentários</CardTitle>
                </CardHeader>
                <CardContent>
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhum comentário ainda
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= comment.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString(
                                'pt-BR'
                              )}
                            </span>
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle>Avaliações Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSurveys.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma avaliação recente
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentSurveys.map((survey) => (
                        <div
                          key={survey.id}
                          className="flex items-start justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {survey.ticketNumber}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  survey.rating >= 4
                                    ? 'bg-green-100 text-green-800'
                                    : survey.rating >= 3
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {survey.rating}/5
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {survey.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {survey.customer.name} •{' '}
                              {survey.category.name}
                            </p>
                            {survey.comment && (
                              <p className="text-sm mt-2 italic">
                                "{survey.comment}"
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(survey.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
