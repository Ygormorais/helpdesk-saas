import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import Timer from '@/components/Timer';
import { ticketsApi } from '@/api/tickets';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

function formatRemaining(targetIso?: string) {
  if (!targetIso) return '-';
  const target = new Date(targetIso).getTime();
  const diff = target - Date.now();

  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const label = `${hours}h ${minutes}m`;
  return diff >= 0 ? label : `Atrasado ${label}`;
}

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    waiting_customer: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
  };
  const labels: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    resolved: 'Resolvido',
    waiting_customer: 'Aguardando Cliente',
    closed: 'Fechado',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
};

const getPriorityBadge = (priority: string) => {
  const styles: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };
  const labels: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baixa',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[priority] || ''}`}>
      {labels[priority] || priority}
    </span>
  );
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [, setTick] = useState(0);
  const [didAutoTake, setDidAutoTake] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 60000);
    return () => window.clearInterval(t);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await ticketsApi.getById(id!);
      return res.data as { ticket: any; comments: any[] };
    },
  });

  const ticket = data?.ticket;
  const comments = useMemo(() => data?.comments || [], [data]);

  const takeOwnershipMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user || !ticket) return;
      const shouldMoveToInProgress = ticket.status === 'open';
      await ticketsApi.update(id, {
        assignedTo: user.id,
        ...(shouldMoveToInProgress ? { status: 'in_progress' } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  useEffect(() => {
    if (!id || !ticket || !user) return;
    if (didAutoTake) return;

    const isStaff = user.role === 'admin' || user.role === 'manager' || user.role === 'agent';
    const isAssignableStatus = ticket.status !== 'resolved' && ticket.status !== 'closed';
    const hasAssignee = !!ticket.assignedTo;

    if (isStaff && isAssignableStatus && !hasAssignee) {
      setDidAutoTake(true);
      takeOwnershipMutation.mutate();
    }
  }, [didAutoTake, id, ticket, user, takeOwnershipMutation]);

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await ticketsApi.addComment(id!, { content, isInternal: false });
      return res.data as { comment: any };
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast({ title: 'Resposta enviada' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar resposta',
        description: error.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    const content = newComment.trim();
    if (!content || !id) return;
    addCommentMutation.mutate(content);
  };

  if (!id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/tickets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Ticket</h1>
            <p className="text-muted-foreground">ID invalido</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/tickets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Carregando...</h1>
            <p className="text-muted-foreground">{id}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/tickets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Ticket nao encontrado</h1>
            <p className="text-muted-foreground">{id}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="text-muted-foreground">{ticket.ticketNumber}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
              )}
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {(comment.author?.name || '?').charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.author?.name || 'Usuario'}</span>
                      <span className="text-xs text-muted-foreground">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleString('pt-BR') : ''}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Digite sua resposta..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSend}
                    disabled={addCommentMutation.isPending || !newComment.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {addCommentMutation.isPending ? 'Enviando...' : 'Enviar Resposta'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Timer
            ticketId={ticket._id}
            ticketNumber={ticket.ticketNumber}
            ticketTitle={ticket.title}
          />

          <Card>
            <CardHeader>
              <CardTitle>SLA / OLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">SLA - 1a resposta</Label>
                <p className="font-medium">
                  {ticket.sla?.firstResponseAt
                    ? 'Respondido'
                    : formatRemaining(ticket.sla?.responseDue)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">SLA - resolucao</Label>
                <p className="font-medium">
                  {ticket.sla?.resolvedAt
                    ? 'Resolvido'
                    : formatRemaining(ticket.sla?.resolutionDue)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">OLA - ownership</Label>
                <p className="font-medium">
                  {ticket.ola?.ownedAt ? formatRemaining(ticket.ola?.ownDue) : 'Sem responsavel'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">OLA - resolucao</Label>
                <p className="font-medium">
                  {ticket.ola?.ownedAt
                    ? (ticket.ola?.resolvedAt ? 'Resolvido' : formatRemaining(ticket.ola?.resolutionDue))
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="pt-1">{getStatusBadge(ticket.status)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Prioridade</Label>
                <div className="pt-1">{getPriorityBadge(ticket.priority)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Categoria</Label>
                <p className="font-medium">{ticket.category?.name || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{ticket.createdBy?.name || '-'}</p>
                  <p className="text-sm text-muted-foreground">{ticket.createdBy?.email || ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{ticket.assignedTo?.name || 'Nao atribuido'}</p>
                  <p className="text-sm text-muted-foreground">{ticket.assignedTo?.email || ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Criado em:</span>
                <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('pt-BR') : '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Atualizado em:</span>
                <span>{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('pt-BR') : '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
