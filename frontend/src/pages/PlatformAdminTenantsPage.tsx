import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  isActive: boolean;
  createdAt: string;
  admins: Array<{ id: string; name: string; email: string }>;
  billing: null | {
    plan: string;
    status?: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    desiredPlan?: string;
    desiredPlanEffectiveAt?: string;
    usage?: { agents: number; tickets: number; storage: number };
    limits?: { maxAgents: number; maxTickets: number; maxStorage: number };
  };
};

export default function PlatformAdminTenantsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['platform-admin-tenants', { q, page }],
    queryFn: async () => {
      const res = await api.get('/platform-admin/tenants', { params: { q: q || undefined, page, limit: 25 } });
      return res.data as { data: TenantRow[]; pagination: { page: number; pages: number; total: number } };
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const rows = query.data?.data || [];
  const pages = query.data?.pagination?.pages || 1;

  const totalLabel = useMemo(() => {
    const total = query.data?.pagination?.total;
    return typeof total === 'number' ? `${total} tenant(s)` : '';
  }, [query.data?.pagination?.total]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">{totalLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome/slug/domínio"
            className="w-[260px]"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Tenant</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Plano</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Periodo</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium">Admins</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-destructive">Falha ao carregar.</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum tenant.</td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.slug}{t.domain ? ` • ${t.domain}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{t.billing?.plan ? String(t.billing.plan).toUpperCase() : '-'}</td>
                    <td className="px-4 py-3 text-sm">{t.billing?.status ? String(t.billing.status).toUpperCase() : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {t.billing?.currentPeriodEnd ? new Date(t.billing.currentPeriodEnd).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {t.admins.length ? t.admins.map((a) => a.email).join(', ') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Pagina {page} de {pages}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
            Proxima
          </Button>
        </div>
      </div>
    </div>
  );
}
