import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Wand2 } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { automationsApi, type AutomationRule } from '@/api/automations';
import { categoriesApi } from '@/api/categories';
import { api } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { FeatureUnavailable } from '@/components/FeatureUnavailable';
import { Link } from 'react-router-dom';

type StaffUser = { _id: string; name: string; email?: string };

export default function AutomationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<any>({
    name: '',
    isActive: true,
    trigger: 'ticket.created',
    conditions: { category: '', priority: '' },
    actions: { assignTo: '', setStatus: 'in_progress' },
  });

  const rulesQuery = useQuery({
    queryKey: ['automations'],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await automationsApi.list();
      return res.data;
    },
    staleTime: 60_000,
  });

  const forbidden = (rulesQuery.error as any)?.response?.status === 403;

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesApi.list()).data.categories,
    staleTime: 60_000,
  });

  const staffQuery = useQuery({
    queryKey: ['users-staff'],
    queryFn: async () => {
      const res = await api.get('/users');
      const users = (res.data.users || []) as StaffUser[];
      return users.filter((u: any) => ['admin', 'manager', 'agent'].includes(u.role));
    },
    staleTime: 60_000,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: String(form.name || '').trim(),
        isActive: !!form.isActive,
        trigger: 'ticket.created',
        conditions: {
          category: form.conditions?.category || undefined,
          priority: form.conditions?.priority || undefined,
        },
        actions: {
          assignTo: form.actions?.assignTo || undefined,
          setStatus: form.actions?.setStatus || undefined,
        },
      };

      if (!payload.name) throw new Error('invalid');

      if (editing) {
        await automationsApi.update(editing._id, payload);
      } else {
        await automationsApi.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast({ title: editing ? 'Regra atualizada' : 'Regra criada' });
      setOpen(false);
      setEditing(null);
      setForm({
        name: '',
        isActive: true,
        trigger: 'ticket.created',
        conditions: { category: '', priority: '' },
        actions: { assignTo: '', setStatus: 'in_progress' },
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao salvar regra',
        description: err?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => automationsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast({ title: 'Regra removida' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover regra', description: err?.response?.data?.message || 'Tente novamente', variant: 'destructive' });
    },
  });

  const rows = useMemo(() => rulesQuery.data?.rules || [], [rulesQuery.data?.rules]);
  const usage = rulesQuery.data?.usage;
  const limitReached = usage?.max !== undefined && usage?.max !== -1 && (usage?.current || 0) >= usage.max;

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      isActive: true,
      trigger: 'ticket.created',
      conditions: { category: '', priority: '' },
      actions: { assignTo: '', setStatus: 'in_progress' },
    });
    setOpen(true);
  };

  const openEdit = (r: AutomationRule) => {
    setEditing(r);
    setForm({
      name: r.name,
      isActive: r.isActive,
      trigger: 'ticket.created',
      conditions: {
        category: (r.conditions as any)?.category?._id || (r.conditions as any)?.category || '',
        priority: (r.conditions as any)?.priority || '',
      },
      actions: {
        assignTo: (r.actions as any)?.assignTo?._id || (r.actions as any)?.assignTo || '',
        setStatus: (r.actions as any)?.setStatus || 'in_progress',
      },
    });
    setOpen(true);
  };

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Automações</h1>
          <p className="text-muted-foreground">Regras para automatizar triagem e atribuição</p>
        </div>
        <FeatureUnavailable
          title="Automações bloqueadas"
          description="Sua empresa precisa de um plano superior para usar regras de automação."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Automações</h1>
          <p className="text-muted-foreground">Regras para automatizar triagem e atribuição</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                if (limitReached) {
                  toast({
                    title: 'Limite de regras atingido',
                    description: 'Faça upgrade para criar mais regras de automação.',
                    variant: 'destructive',
                  });
                  return;
                }
                openCreate();
              }}
              disabled={limitReached}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar regra' : 'Criar regra'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria (condicao)</Label>
                  <Select value={form.conditions.category || ''} onValueChange={(v) => setForm({ ...form, conditions: { ...form.conditions, category: v === 'any' ? '' : v } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Qualquer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Qualquer</SelectItem>
                      {(categoriesQuery.data || []).map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade (condicao)</Label>
                  <Select value={form.conditions.priority || ''} onValueChange={(v) => setForm({ ...form, conditions: { ...form.conditions, priority: v === 'any' ? '' : v } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Qualquer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Qualquer</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Atribuir para</Label>
                  <Select value={form.actions.assignTo || ''} onValueChange={(v) => setForm({ ...form, actions: { ...form.actions, assignTo: v === 'none' ? '' : v } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(staffQuery.data || []).map((u: any) => (
                        <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.actions.setStatus || 'in_progress'} onValueChange={(v) => setForm({ ...form, actions: { ...form.actions, setStatus: v } })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Wand2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Trigger: quando um ticket for criado, a primeira regra que combinar sera aplicada.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>{upsert.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Regras</CardTitle>
            {usage ? (
              <p className="text-xs text-muted-foreground">
                {usage.current} / {usage.max === -1 ? '∞' : usage.max}
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {rulesQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {rulesQuery.isError ? <p className="text-sm text-destructive">Erro ao carregar regras</p> : null}
          {!rulesQuery.isLoading && !rulesQuery.isError && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma regra criada</p>
          ) : null}

          {rows.map((r) => (
            <div key={r._id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{r.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                    {r.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Se criar ticket
                  {(r.conditions as any)?.category?.name ? ` na categoria ${(r.conditions as any).category.name}` : ''}
                  {(r.conditions as any)?.priority ? ` com prioridade ${(r.conditions as any).priority}` : ''}
                  {', entao'}
                  {(r.actions as any)?.assignTo?.name ? ` atribuir para ${(r.actions as any).assignTo.name}` : ''}
                  {(r.actions as any)?.setStatus ? ` e setar status ${(r.actions as any).setStatus}` : ''}
                  .
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={() => openEdit(r)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => del.mutate(r._id)} disabled={del.isPending} aria-label="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {limitReached ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-900">
              Você atingiu o limite de regras de automação do seu plano.
            </p>
            <Link to="/plans">
              <Button variant="secondary">Ver planos</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
