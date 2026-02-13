import { useMemo, useState } from 'react';
import { Plus, Play, Trash, ExternalLink, Copy, Check } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { webhooksApi } from '@/api/webhooks';
import { useToast } from '@/hooks/use-toast';

const events = [
  'ticket.created',
  'ticket.updated',
  'ticket.status_changed',
  'ticket.assigned',
  'ticket.resolved',
  'comment.created',
  'comment.internal',
  'user.invited',
];

export default function WebhooksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] as string[] });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await webhooksApi.list();
      return res.data.webhooks;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await webhooksApi.create({
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
      });
      return res.data as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setIsDialogOpen(false);
      setNewWebhook({ name: '', url: '', events: [] });
      if (data?.webhook?.secret) {
        toast({ title: 'Webhook criado', description: `Secret: ${data.webhook.secret}` });
      } else {
        toast({ title: 'Webhook criado' });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar webhook',
        description: error.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await webhooksApi.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await webhooksApi.test(id);
      return res.data as any;
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Webhook OK' : 'Webhook falhou',
        description: data.success ? `Status ${data.status}` : data.error || 'Erro',
        variant: data.success ? 'default' : 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const webhooks = listQuery.data || [];

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">Integre com sistemas externos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Webhook</DialogTitle>
              <DialogDescription>
                Configure um webhook para receber notificações em tempo real.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Notificações Slack"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="grid grid-cols-2 gap-2">
                  {events.map((event) => (
                    <label key={event} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event] });
                          } else {
                            setNewWebhook({ ...newWebhook, events: newWebhook.events.filter((e) => e !== event) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Webhook'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {listQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        {listQuery.isError && (
          <p className="text-sm text-destructive">Erro ao carregar webhooks</p>
        )}
        {webhooks.map((webhook) => (
          <Card key={webhook.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-3 w-3 rounded-full ${webhook.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <h3 className="font-medium">{webhook.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate max-w-[300px]">{webhook.url}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {webhook.events.slice(0, 3).map((event) => (
                      <span key={event} className="px-2 py-0.5 bg-muted rounded text-xs">
                        {event.split('.')[1]}
                      </span>
                    ))}
                    {webhook.events.length > 3 && (
                      <span className="px-2 py-0.5 bg-muted rounded text-xs">
                        +{webhook.events.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="h-4 w-px bg-border mx-2" />
                  <span className="text-sm text-muted-foreground">
                    {webhook.failureCount} falhas
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Testar"
                    onClick={() => testMutation.mutate(webhook.id)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Copiar URL">
                    {copiedId === webhook.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" onClick={() => copyToClipboard(webhook.url, webhook.id)} />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm('Excluir este webhook?')) {
                        deleteMutation.mutate(webhook.id);
                      }
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
