import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, ThumbsDown, Eye, Clock, User, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const article = {
  title: 'Como resetar sua senha',
  slug: 'como-resetar-senha',
  content: `
# Como resetar sua senha

Este guia explica passo a passo como recuperar o acesso à sua conta quando você esquecer sua senha.

## Passo 1: Acessar a página de recuperação

1. Acesse a página de login
2. Clique em "Esqueceu sua senha?"
3. Digite o email cadastrado na sua conta

## Passo 2: Verificar email

Após solicitar a recuperação, você receberá um email com um link de redefinição. Este link é válido por 24 horas.

**Importante:** Verifique também sua pasta de spam se não encontrar o email na caixa de entrada.

## Passo 3: Criar nova senha

Clique no link recebido e você será direcionado para uma página onde poderá criar uma nova senha.

### Requisitos da senha:
- Mínimo de 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos um número
- Pelo menos um caractere especial

## Passo 4: Fazer login

Após criar a nova senha, faça login com suas credenciais atualizadas.

## Problemas comuns

### Não recebi o email
- Verifique se o email está correto
- Confirme que a conta existe
- Tente solicitar novamente após 15 minutos

### Link expirado
Os links de recuperação expirem em 24 horas por segurança. Solicite um novo link se necessário.

## Precisa de mais ajuda?

Se você ainda estiver com dificuldades, entre em contato com nosso suporte.
  `,
  category: { name: 'Conta', color: '#3B82F6' },
  author: { name: 'Equipe de Suporte', avatar: 'S' },
  views: 1250,
  helpful: { yes: 45, no: 3 },
  createdAt: '2024-01-10',
  updatedAt: '2024-01-10',
  relatedArticles: [
    { id: '2', title: 'Guia de integração com API', slug: 'integracao-api' },
    { id: '4', title: 'Comparativo de planos', slug: 'planos-precos' },
  ],
};

export default function ArticleDetailPage() {
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');

  const handleFeedback = (type: 'yes' | 'no') => {
    setFeedback(type);
    setShowFeedbackForm(true);
  };

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
            style={{ backgroundColor: article.category.color }}
          >
            {article.category.name}
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
          <span>Atualizado em {article.updatedAt}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span>{article.views} visualizações</span>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
          <div dangerouslySetInnerHTML={{
            __html: article.content
              .replace(/^# (.+)$/gm, '<h1>$1</h1>')
              .replace(/^## (.+)$/gm, '<h2>$1</h2>')
              .replace(/^### (.+)$/gm, '<h3>$1</h3>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/^- (.+)$/gm, '<li>$1</li>')
              .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
              .replace(/\n\n/g, '<br/><br/>')
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
            <span>{article.helpful.yes} pessoas acharam útil</span>
            <span>|</span>
            <span>{article.helpful.no} pessoas não acharam útil</span>
          </div>
        </CardContent>
      </Card>

      {article.relatedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artigos relacionados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {article.relatedArticles.map((related) => (
                <li key={related.id}>
                  <Link
                    to={`/knowledge/${related.slug}`}
                    className="text-primary hover:underline"
                  >
                    {related.title}
                  </Link>
                </li>
              ))}
            </ul>
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
