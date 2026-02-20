import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MessageCircle, User, Send, Copy } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 
import Timer from '@/components/Timer';
import { ticketsApi } from '@/api/tickets';
import { chatApi } from '@/api/chat';
import { articlesApi } from '@/api/articles';
import { macrosApi } from '@/api/macros';
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
    medium: 'Média',
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [, setTick] = useState(0);
  const [didAutoTake, setDidAutoTake] = useState(false);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copiado', description: value });
    } catch {
      toast({ title: 'Nao foi possivel copiar', description: value, variant: 'destructive' });
    }
  };

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

  const isStaff = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'agent';
  const isClient = user?.role === 'client';

  const isClosedLike = ticket?.status === 'resolved' || ticket?.status === 'closed';
  const assignedToId = (ticket?.assignedTo?._id || ticket?.assignedTo?.id) as string | undefined;
  const canAssignToMe = !!id && !!user && isStaff && !isClosedLike && (!assignedToId || assignedToId !== user.id);

  const macrosQuery = useQuery({
    queryKey: ['macros', 'active'],
    enabled: !!id && isStaff,
    queryFn: async () => {
      try {
        const res = await macrosApi.list({ active: true });
        return res.data.macros;
      } catch (e: any) {
        if (e?.response?.status === 403) return [];
        throw e;
      }
    },
    staleTime: 60_000,
  });

  const linkedArticlesQuery = useQuery({
    queryKey: ['ticket', id, 'kb-articles'],
    enabled: !!id && isStaff,
    queryFn: async () => {
      const res = await articlesApi.byTicket(id!);
      return res.data.articles as any[];
    },
  });

  const kbQueryText = `${ticket?.title || ''}\n\n${ticket?.description || ''}`.trim();

  const clientSuggestedArticlesQuery = useQuery({
    queryKey: ['ticket', id, 'kb-suggested-client', kbQueryText],
    enabled: !!id && isClient && kbQueryText.length >= 2,
    queryFn: async () => {
      const res = await articlesApi.searchAi({ q: kbQueryText.slice(0, 500), limit: 6 });
      return res.data.results as any[];
    },
  });
  const suggestedArticlesQuery = useQuery({
    queryKey: ['ticket', id, 'kb-suggested', kbQueryText],
    enabled: !!id && isStaff && kbQueryText.length >= 2,
    queryFn: async () => {
      const res = await articlesApi.searchAi({ q: kbQueryText.slice(0, 500), limit: 6 });
      return res.data.results as any[];
    },
  });

  const linkArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      if (!id) return;
      await articlesApi.linkTicket(articleId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'kb-articles'] });
      toast({ title: 'Artigo vinculado' });
    },
    onError: () => {
      toast({ title: 'Erro ao vincular artigo', variant: 'destructive' });
    },
  });

  const unlinkArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      if (!id) return;
      await articlesApi.unlinkTicket(articleId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'kb-articles'] });
      toast({ title: 'Artigo desvinculado' });
    },
    onError: () => {
      toast({ title: 'Erro ao desvincular artigo', variant: 'destructive' });
    },
  });

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

  const reopenMutation = useMutation({
    mutationFn: async () => {
      await ticketsApi.reopen(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({ title: 'Ticket reaberto' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao reabrir ticket',
        description: error.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!id) return;
      await ticketsApi.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({ title: 'Ticket atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar ticket',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    const content = newComment.trim();
    if (!content || !id) return;
    addCommentMutation.mutate(content);
  };

  const openChatMutation = useMutation({
    mutationFn: async () => {
      if (!user || !ticket || !id) {
        throw new Error('missing-context');
      }

      const createdById = (ticket.createdBy?._id || ticket.createdBy?.id) as string | undefined;
      const assigneeId = (ticket.assignedTo?._id || ticket.assignedTo?.id) as string | undefined;

      let participantId: string | undefined;
      if (user.role === 'client') {
        participantId = assigneeId;
      } else {
        participantId = createdById;
      }

      if (!participantId) {
        throw new Error('missing-participant');
      }

      const res = await chatApi.create({ participantId, ticketId: id });
      return res.data.chat as any;
    },
    onSuccess: (chat: any) => {
      if (!chat?._id) return;
      navigate(`/chat?chatId=${encodeURIComponent(String(chat._id))}`);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      const fallback = user?.role === 'client'
        ? 'Esse ticket ainda não tem um agente atribuído'
        : 'Não foi possível abrir o chat';
      toast({
        title: 'Erro ao abrir chat',
        description: msg || fallback,
        variant: 'destructive',
      });
    },
  });

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
            <p className="text-muted-foreground">ID inválido</p>
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
            <h1 className="text-2xl font-bold">Ticket não encontrado</h1>
            <p className="text-muted-foreground">{id}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{ticket.title}</h1>
          <p className="text-muted-foreground">{ticket.ticketNumber}</p>
        </div>

        <div className="flex items-center gap-2">
          {canAssignToMe ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => updateTicketMutation.mutate({ assignedTo: user!.id })}
              disabled={updateTicketMutation.isPending}
              title="Atribuir a mim"
            >
              Atribuir a mim
            </Button>
          ) : null}

          {isStaff && !isClosedLike ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => updateTicketMutation.mutate({ status: 'resolved' })}
                disabled={updateTicketMutation.isPending}
                title="Marcar como resolvido"
              >
                Resolver
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => updateTicketMutation.mutate({ status: 'closed' })}
                disabled={updateTicketMutation.isPending}
                title="Fechar ticket"
              >
                Fechar
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={() => copyToClipboard(String(ticket.ticketNumber || id))}
            title="Copiar numero do ticket"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>

          {(ticket.status === 'resolved' || ticket.status === 'closed') ? (
            <Button
              variant="outline"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
            >
              {reopenMutation.isPending ? 'Reabrindo...' : 'Reabrir'}
            </Button>
          ) : null}
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

          {isClient && ((clientSuggestedArticlesQuery.error as any)?.response?.status !== 403) && (
            <Card>
              <CardHeader>
                <CardTitle>Artigos sugeridos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {clientSuggestedArticlesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (clientSuggestedArticlesQuery.data || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sugestão no momento</p>
                ) : (
                  (clientSuggestedArticlesQuery.data || []).map((a: any) => (
                    <Link
                      key={a._id}
                      to={`/knowledge/${a.slug}`}
                      className="block rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-sm font-medium line-clamp-2">{a.title}</p>
                      {a.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>}
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Conversa</CardTitle>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openChatMutation.mutate()}
                  disabled={openChatMutation.isPending}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {openChatMutation.isPending ? 'Abrindo...' : 'Abrir chat'}
                </Button>
              </div>
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

          {(ticket.status === 'resolved' || ticket.status === 'closed') ? (
            <Card>
              <CardHeader>
                <CardTitle>Responder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Este ticket está {ticket.status === 'resolved' ? 'resolvido' : 'fechado'}. Para enviar uma nova mensagem, reabra o ticket.
                </p>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => reopenMutation.mutate()}
                    disabled={reopenMutation.isPending}
                  >
                    {reopenMutation.isPending ? 'Reabrindo...' : 'Reabrir ticket'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isStaff && (macrosQuery.data || []).length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Inserir macro</Label>
                        <Select
                          onValueChange={(macroId) => {
                            const m = (macrosQuery.data || []).find((x: any) => String(x._id) === String(macroId));
                            if (!m?.content) return;
                            setNewComment((prev) => {
                              const p = String(prev || '');
                              const sep = p.trim().length ? '\n\n' : '';
                              return `${p}${sep}${m.content}`;
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(macrosQuery.data || []).map((m: any) => (
                              <SelectItem key={m._id} value={m._id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}
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
          )}
        </div>

        <div className="space-y-6">
          <Timer
            ticketId={ticket._id}
            ticketNumber={ticket.ticketNumber}
            ticketTitle={ticket.title}
          />

          {isStaff &&
            !(((linkedArticlesQuery.error as any)?.response?.status === 403) ||
              ((suggestedArticlesQuery.error as any)?.response?.status === 403)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Base de Conhecimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Vinculados</Label>
                    {linkedArticlesQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground mt-1">Carregando...</p>
                    ) : (linkedArticlesQuery.data || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-1">Nenhum artigo vinculado</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {(linkedArticlesQuery.data || []).map((a: any) => (
                          <div key={a._id} className="flex items-start justify-between gap-3 rounded-lg border p-2">
                            <div className="min-w-0">
                              <Link to={`/knowledge/${a.slug}`} className="text-sm font-medium hover:underline">
                                {a.title}
                              </Link>
                              {a.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unlinkArticleMutation.mutate(String(a._id))}
                              disabled={unlinkArticleMutation.isPending}
                            >
                              Desvincular
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Sugestoes</Label>
                    {suggestedArticlesQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground mt-1">Carregando...</p>
                    ) : (suggestedArticlesQuery.data || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-1">Nenhuma sugestão no momento</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {(suggestedArticlesQuery.data || [])
                          .filter((a: any) => !new Set((linkedArticlesQuery.data || []).map((x: any) => String(x._id))).has(String(a._id)))
                          .slice(0, 6)
                          .map((a: any) => (
                            <div key={a._id} className="flex items-start justify-between gap-3 rounded-lg border p-2">
                              <div className="min-w-0">
                                <Link to={`/knowledge/${a.slug}`} className="text-sm font-medium hover:underline">
                                  {a.title}
                                </Link>
                                {a.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => linkArticleMutation.mutate(String(a._id))}
                                disabled={linkArticleMutation.isPending}
                              >
                                Vincular
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
                  {ticket.ola?.ownedAt ? formatRemaining(ticket.ola?.ownDue) : 'Sem responsável'}
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
                <div className="pt-1">
                  {isStaff ? (
                    <Select
                      value={String(ticket.status)}
                      onValueChange={(v) => updateTicketMutation.mutate({ status: v })}
                      disabled={updateTicketMutation.isPending}
                    >
                      <SelectTrigger aria-label="Alterar status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="waiting_customer">Aguardando Cliente</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getStatusBadge(ticket.status)
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Prioridade</Label>
                <div className="pt-1">
                  {isStaff ? (
                    <Select
                      value={String(ticket.priority)}
                      onValueChange={(v) => updateTicketMutation.mutate({ priority: v })}
                      disabled={updateTicketMutation.isPending}
                    >
                      <SelectTrigger aria-label="Alterar prioridade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgente</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getPriorityBadge(ticket.priority)
                  )}
                </div>
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
                  <p className="font-medium">{ticket.assignedTo?.name || 'Não atribuído'}</p>
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
