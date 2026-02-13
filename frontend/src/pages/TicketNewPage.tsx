import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowLeft, PlusCircle } from 'lucide-react';

import { ticketsApi } from '@/api/tickets';
import { categoriesApi } from '@/api/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  title: z.string().min(5, 'Titulo deve ter no minimo 5 caracteres'),
  description: z.string().min(10, 'Descricao deve ter no minimo 10 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TicketNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: categoriesResp,
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.list();
      return res.data as { categories: Array<{ _id: string; name: string }> };
    },
  });

  const categories = useMemo(() => categoriesResp?.categories || [], [categoriesResp]);
  const canSubmit = categories.length > 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      priority: 'medium',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await ticketsApi.create(values);
      return res.data as { ticket: { _id: string } };
    },
    onSuccess: (data) => {
      toast({ title: 'Ticket criado' });
      navigate(`/tickets/${data.ticket._id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar ticket',
        description: error.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Novo Ticket</h1>
          <p className="text-muted-foreground">Abra uma solicitacao para sua equipe</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Detalhes do Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isCategoriesError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">
              Nao foi possivel carregar as categorias.
              <Button
                type="button"
                variant="outline"
                className="ml-3 h-8"
                onClick={() => refetchCategories()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {!isLoadingCategories && !isCategoriesError && categories.length === 0 && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground mb-4">
              Nenhuma categoria cadastrada. Crie uma categoria para conseguir abrir tickets.
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="title">Titulo</Label>
              <Input id="title" placeholder="Ex: Nao consigo acessar minha conta" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Descreva o problema com o maximo de detalhes possivel"
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.watch('category')}
                  onValueChange={(v) => form.setValue('category', v, { shouldValidate: true })}
                  disabled={isLoadingCategories || categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCategories ? 'Carregando...' : 'Selecione'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.watch('priority') || 'medium'}
                  onValueChange={(v) => form.setValue('priority', v as FormValues['priority'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link to="/tickets">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
                {createMutation.isPending ? 'Criando...' : 'Criar Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
