import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash, Eye, FileText, MessageSquare } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { articlesApi } from '@/api/articles';
import { categoriesApi } from '@/api/categories';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AdminArticlesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedbackArticle, setFeedbackArticle] = useState<any | null>(null);
  const [feedbackCommentOnly, setFeedbackCommentOnly] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: '',
    isPublished: false,
  });

  const isEditing = !!editingId;

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.list();
      return res.data.categories as Array<{ _id: string; name: string }>;
    },
  });

  const listQuery = useQuery({
    queryKey: ['articles', 'admin', { search, statusFilter }],
    queryFn: async () => {
      const res = await articlesApi.listAdmin({
        page: 1,
        limit: 50,
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      return res.data.articles;
    },
  });

  const articles = listQuery.data || [];

  const feedbackQuery = useQuery({
    queryKey: ['article-feedback', feedbackArticle?._id, { commentOnly: feedbackCommentOnly }],
    enabled: !!feedbackArticle?._id,
    queryFn: async () => {
      const res = await articlesApi.listFeedback(feedbackArticle._id, { page: 1, limit: 50, commentOnly: feedbackCommentOnly });
      return res.data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const tags = newArticle.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: newArticle.title,
        content: newArticle.content,
        excerpt: newArticle.excerpt || undefined,
        category: newArticle.category || undefined,
        tags: tags,
        isPublished: newArticle.isPublished,
      };

      if (editingId) {
        await articlesApi.update(editingId, payload);
        return;
      }

      await articlesApi.create({
        title: payload.title,
        content: payload.content,
        excerpt: payload.excerpt,
        category: payload.category,
        tags: payload.tags.length ? payload.tags : undefined,
        isPublished: payload.isPublished,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['articles', 'public'] });
      toast({ title: isEditing ? 'Artigo atualizado' : 'Artigo criado' });
      setIsDialogOpen(false);
      setEditingId(null);
      setNewArticle({ title: '', content: '', excerpt: '', category: '', tags: '', isPublished: false });
    },
    onError: (error: any) => {
      toast({
        title: isEditing ? 'Erro ao atualizar artigo' : 'Erro ao criar artigo',
        description: error.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await articlesApi.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['articles', 'public'] });
      toast({ title: 'Artigo excluido' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir artigo',
        description: error.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setNewArticle({ title: '', content: '', excerpt: '', category: '', tags: '', isPublished: false });
    setIsDialogOpen(true);
  };

  const openEditDialog = (article: any) => {
    setEditingId(article._id);
    setNewArticle({
      title: article.title || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      category: article.category?._id || '',
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
      isPublished: !!article.isPublished,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Artigo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Artigo' : 'Criar Novo Artigo'}</DialogTitle>
              <DialogDescription>
                Crie artigos para a base de conhecimento dos seus clientes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Ex: Como resetar sua senha"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Resumo</Label>
                <Input
                  id="excerpt"
                  placeholder="Breve descrição do artigo"
                  value={newArticle.excerpt}
                  onChange={(e) => setNewArticle({ ...newArticle, excerpt: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={newArticle.category}
                    onValueChange={(value) => setNewArticle({ ...newArticle, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(categoriesQuery.data || []).map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="senha, login, recuperação"
                    value={newArticle.tags}
                    onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newArticle.isPublished ? 'published' : 'draft'}
                  onValueChange={(value) => setNewArticle({ ...newArticle, isPublished: value === 'published' })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo (Markdown)</Label>
                <Tabs defaultValue="edit">
                  <TabsList>
                    <TabsTrigger value="edit">Editar</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      id="content"
                      placeholder="Digite o conteúdo do artigo..."
                      value={newArticle.content}
                      onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                      rows={10}
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <Card>
                      <CardContent className="p-4 prose prose-sm max-w-none dark:prose-invert">
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

                              if (!safe) return <span>{children}</span>;
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
                          {newArticle.content || ''}
                        </ReactMarkdown>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending}>
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!feedbackArticle}
          onOpenChange={(open) => {
            if (!open) setFeedbackArticle(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Feedback do artigo</DialogTitle>
              <DialogDescription>{feedbackArticle?.title || ''}</DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {feedbackQuery.data?.stats
                  ? `${feedbackQuery.data.stats.yes || 0} sim • ${feedbackQuery.data.stats.no || 0} nao • total ${feedbackQuery.data.stats.total || 0}`
                  : ''}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={feedbackCommentOnly ? 'default' : 'outline'}
                  onClick={() => setFeedbackCommentOnly(true)}
                >
                  Com comentario
                </Button>
                <Button
                  size="sm"
                  variant={!feedbackCommentOnly ? 'default' : 'outline'}
                  onClick={() => setFeedbackCommentOnly(false)}
                >
                  Todos
                </Button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {feedbackQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {feedbackQuery.isError && <p className="text-sm text-destructive">Erro ao carregar feedback</p>}
              {!feedbackQuery.isLoading && !feedbackQuery.isError && (feedbackQuery.data?.feedback || []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum feedback</p>
              )}

              {(feedbackQuery.data?.feedback || []).map((f: any) => (
                <Card key={f.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {f.user?.name || 'Usuario'}
                          {f.user?.email ? <span className="text-xs text-muted-foreground"> {'<'}{f.user.email}{'>'}</span> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString('pt-BR') : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.helpful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {f.helpful ? 'Util' : 'Nao util'}
                      </span>
                    </div>
                    {f.comment && <p className="text-sm whitespace-pre-wrap">{f.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {listQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        {listQuery.isError && (
          <p className="text-sm text-destructive">Erro ao carregar artigos</p>
        )}

        {articles.map((article: any) => (
          <Card key={article._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{article.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        article.isPublished
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {article.isPublished ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{article.category?.name || 'Sem categoria'}</span>
                      <span>•</span>
                      <span>{article.author?.name || '-'}</span>
                      <span>•</span>
                      <span>{article.views || 0} visualizações</span>
                      <span>•</span>
                      <span>{article.createdAt ? new Date(article.createdAt).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/knowledge/${article.slug}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFeedbackArticle(article);
                      setFeedbackCommentOnly(true);
                    }}
                    aria-label="Ver feedback"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(article)}
                    aria-label="Editar artigo"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm('Excluir este artigo?')) {
                        deleteMutation.mutate(article._id);
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
