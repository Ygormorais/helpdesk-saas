import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, ThumbsDown, Eye, Clock, User, Share2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { articlesApi } from '@/api/articles';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
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

  const html = useMemo(() => {
    const content = article?.content || '';
    return content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/\n\n/g, '<br/><br/>');
  }, [article?.content]);

  const voteMutation = useMutation({
    mutationFn: async (helpful: boolean) => {
      if (!article?._id) return;
      await articlesApi.vote(article._id, helpful);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', slug] });
    },
  });

  const handleFeedback = (type: 'yes' | 'no') => {
    setFeedback(type);
    setShowFeedbackForm(true);
    voteMutation.mutate(type === 'yes');
  };

  if (!slug) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-muted-foreground">Slug invalido</p>
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
        <Button variant="ghost" size="icon">
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
          <div dangerouslySetInnerHTML={{
            __html: article.content
              ? html
              : ''
          }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Este artigo foi útil?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!feedback ? (
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleFeedback('yes')}
              >
                <ThumbsUp className="mr-2 h-4 w-4" />
                Sim
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFeedback('no')}
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
                  <Button onClick={() => setShowFeedbackForm(false)}>
                    Enviar feedback
                  </Button>
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

      <div className="text-center py-8 border-t">
        <p className="text-muted-foreground mb-4">Ainda tem dúvidas?</p>
        <Link to="/tickets">
          <Button>Entrar em contato com suporte</Button>
        </Link>
      </div>
    </div>
  );
}
