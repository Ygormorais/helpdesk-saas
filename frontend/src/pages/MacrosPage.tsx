import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { macrosApi, type Macro } from '@/api/macros';
import { useToast } from '@/hooks/use-toast';
import { FeatureUnavailable } from '@/components/FeatureUnavailable';
import { Link } from 'react-router-dom';

export default function MacrosPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Macro | null>(null);
  const [form, setForm] = useState({ name: '', content: '', isActive: true });

  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['macros', { search, status }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await macrosApi.list({
        search: search.trim() || undefined,
        active: status === 'all' ? undefined : status === 'active',
      });
      return res.data;
    },
    staleTime: 60_000,
  });

  const forbidden = (query.error as any)?.response?.status === 403;

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        content: form.content.trim(),
        isActive: form.isActive,
      };
      if (!payload.name || !payload.content) throw new Error('invalid');
      if (editing) {
        await macrosApi.update(editing._id, payload);
      } else {
        await macrosApi.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['macros'] });
      toast({ title: editing ? 'Macro atualizada' : 'Macro criada' });
      setOpen(false);
      setEditing(null);
      setForm({ name: '', content: '', isActive: true });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao salvar macro',
        description: err?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => macrosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['macros'] });
      toast({ title: 'Macro removida' });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao remover macro',
        description: err?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const macros = query.data?.macros || [];
  const usage = query.data?.usage;
  const rows = useMemo(() => macros, [macros]);

  const limitReached = usage?.max !== undefined && usage?.max !== -1 && (usage?.current || 0) >= usage.max;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', content: '', isActive: true });
    setOpen(true);
  };
  const openEdit = (m: Macro) => {
    setEditing(m);
    setForm({ name: m.name || '', content: m.content || '', isActive: !!m.isActive });
    setOpen(true);
  };

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Macros</h1>
          <p className="text-muted-foreground">Respostas prontas para agilizar atendimentos</p>
        </div>
        <FeatureUnavailable
          title="Macros bloqueadas"
          description="Sua empresa precisa de um plano superior para usar macros de resposta."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Macros</h1>
          <p className="text-muted-foreground">Respostas prontas para agilizar atendimentos</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                if (limitReached) {
                  toast({
                    title: 'Limite de macros atingido',
                    description: 'Faça upgrade para criar mais macros.',
                    variant: 'destructive',
                  });
                  return;
                }
                openCreate();
              }}
              disabled={limitReached}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova macro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar macro' : 'Criar macro'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <Select value={form.isActive ? 'active' : 'inactive'} onValueChange={(v) => setForm({ ...form, isActive: v === 'active' })}>
                  <SelectTrigger id="active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteudo</Label>
                <Textarea
                  id="content"
                  rows={10}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
                {upsert.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <Label>Busca</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Nome da macro" />
            </div>
          </div>
          <div className="min-w-[180px]">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Lista</CardTitle>
            {usage ? (
              <p className="text-xs text-muted-foreground">
                {usage.current} / {usage.max === -1 ? '∞' : usage.max}
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {query.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {query.isError ? <p className="text-sm text-destructive">Erro ao carregar macros</p> : null}

          {!query.isLoading && !query.isError && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma macro encontrada</p>
          ) : null}

          {rows.map((m) => (
            <div key={m._id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{m.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                    {m.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{m.content}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={() => openEdit(m)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => del.mutate(m._id)}
                  disabled={del.isPending}
                  aria-label="Excluir"
                >
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
              Voce atingiu o limite de macros do seu plano.
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
