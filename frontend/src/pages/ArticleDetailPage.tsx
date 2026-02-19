import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, ThumbsDown, Eye, Clock, Share2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { articlesApi } from '@/api/articles';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');

  const articleQuery = useQuery({
    queryKey: ['article', slug],
    enabled: !!slug,
    queryFn: async () => {
      const res = await articlesApi.getBySlug(slug!);
      return res.data.article;
    },
  });

  const article: any = articleQuery.data;

  const relatedQuery = useQuery({
    queryKey: ['article-related', slug],
    enabled: !!slug,
    queryFn: async () => {
      const res = await articlesApi.related(slug!, { limit: 6 });
      return res.data.articles as any[];
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (payload: { helpful: boolean; comment?: string }) => {
      if (!article?._id) return;
      await articlesApi.feedback(article._id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', slug] });
      toast({ title: 'Feedback enviado' });
      setShowFeedbackForm(false);
    },
    onError: () => {
      toast({ title: 'Erro ao enviar feedback', variant: 'destructive' });
    },
  });

  const handleFeedbackPick = (type: 'yes' | 'no') => {
    setFeedback(type);
    setShowFeedbackForm(true);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copiado' });
    } catch {
      toast({ title: 'Não foi possível copiar o link', variant: 'destructive' });
    }
  };

  if (!slug) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-muted-foreground">Slug inválido</p>
      </div>
    );
  }

  if (articleQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (articleQuery.isError || !article) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-destructive">Erro ao carregar artigo</p>
        <Link to="/knowledge">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/knowledge">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <span
            className="px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: article.category?.color || '#6B7280' }}
          >
            {article.category?.name || 'Sem categoria'}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Copiar link">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <h1 className="text-4xl font-bold">{article.title}</h1>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">{article.author.avatar}</span>
          </div>
          <span>{article.author.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Atualizado em {article.updatedAt ? new Date(article.updatedAt).toLocaleDateString('pt-BR') : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span>{article.views || 0} visualizações</span>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            disallowedElements={['img']}
            unwrapDisallowed
            components={{
              a: ({ href, children, ...props }: any) => {
                const raw = String(href || '').trim();
                const isInternal = raw.startsWith('/') || raw.startsWith('#');
                const isHttp = raw.startsWith('http://') || raw.startsWith('https://');
                const isMail = raw.startsWith('mailto:');
                const safe = isInternal || isHttp || isMail;

                if (!safe) {
                  return <span>{children}</span>;
                }

                const external = isHttp;
                return (
                  <a
                    href={raw}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer nofollow' : undefined}
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {article.content || ''}
          </ReactMarkdown>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Este artigo foi útil?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!feedback ? (
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => handleFeedbackPick('yes')}>
                <ThumbsUp className="mr-2 h-4 w-4" />
                Sim
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFeedbackPick('no')}
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Não
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Obrigado pelo seu feedback!
              </p>
              {showFeedbackForm && (
                <div className="space-y-2">
                  <Label>Deixe um comentário (opcional)</Label>
                  <Textarea
                    placeholder="Como podemos melhorar este artigo?"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const helpful = feedback === 'yes';
                        const comment = feedbackComment.trim();
                        feedbackMutation.mutate({ helpful, comment: comment ? comment : undefined });
                      }}
                      disabled={feedbackMutation.isPending}
                    >
                      Enviar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const helpful = feedback === 'yes';
                        feedbackMutation.mutate({ helpful });
                      }}
                      disabled={feedbackMutation.isPending}
                    >
                      Enviar sem comentario
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
            <span>{article.helpful?.yes || 0} pessoas acharam útil</span>
            <span>|</span>
            <span>{article.helpful?.no || 0} pessoas não acharam útil</span>
          </div>
        </CardContent>
      </Card>

      {!relatedQuery.isError && (relatedQuery.data || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artigos relacionados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(relatedQuery.data || []).map((a: any) => (
              <Link key={a._id} to={`/knowledge/${a.slug}`} className="block rounded-lg border p-3 hover:bg-muted/40">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm line-clamp-2">{a.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{a.views || 0} views</span>
                </div>
                {a.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-center py-8 border-t">
        <p className="text-muted-foreground mb-4">Ainda tem dúvidas?</p>
        <Link to="/tickets">
          <Button>Entrar em contato com suporte</Button>
        </Link>
      </div>
    </div>
  );
}
