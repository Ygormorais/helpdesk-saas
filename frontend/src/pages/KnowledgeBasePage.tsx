import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Eye, ThumbsUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { articlesApi } from '@/api/articles';
import { FeatureUnavailable } from '@/components/FeatureUnavailable';

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const isAiSearch = debouncedSearch.trim().length >= 2;

  const listQuery = useQuery({
    queryKey: ['articles', isAiSearch ? 'ai' : 'public', { q: debouncedSearch, selectedCategory }],
    queryFn: async () => {
      const q = debouncedSearch.trim();
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;

      if (q.length >= 2) {
        const res = await articlesApi.searchAi({ q, category, limit: 30 });
        return { articles: res.data.results, mode: res.data.mode as 'ai' | 'fallback' };
      }

      const res = await articlesApi.listPublic({
        search: q ? q : undefined,
        category,
      });
      return { articles: res.data.articles, mode: 'public' as const };
    },
  });

  const articles = listQuery.data?.articles || [];
  const searchMode = listQuery.data?.mode;

  const categories = useMemo(() => {
    const counts = new Map<string, { name: string; color: string; count: number; id: string }>();
    for (const a of articles) {
      const c: any = a.category;
      if (!c) continue;
      const key = c._id;
      const prev = counts.get(key);
      counts.set(key, {
        id: c._id,
        name: c.name,
        color: c.color,
        count: (prev?.count || 0) + 1,
      });
    }

    const list = Array.from(counts.values()).sort((a, b) => a.name.localeCompare(b.name));
    return [{ id: 'all', name: 'Todas', color: '#6B7280', count: articles.length }, ...list];
  }, [articles]);

  const isForbidden = (listQuery.error as any)?.response?.status === 403;
  if (isForbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Central de Ajuda</h1>
          <p className="text-lg text-muted-foreground">Base de conhecimento indisponível no seu plano.</p>
        </div>
        <FeatureUnavailable
          title="Base de conhecimento bloqueada"
          description="Sua empresa precisa de um plano superior para acessar a base de conhecimento."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Central de Ajuda</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Encontre respostas para suas dúvidas em nossa base de conhecimento
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar artigos..."
            className="pl-12 py-6 text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAiSearch ? (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {searchMode === 'ai' ? 'Busca com IA (semântica).' : null}
            {searchMode === 'fallback' ? 'IA indisponível no momento; usando busca básica.' : null}
            {!searchMode ? 'Buscando...' : null}
          </div>
        ) : (
          <div className="mt-2 text-center text-xs text-muted-foreground">Digite 2+ caracteres para busca com IA.</div>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
            <span className="ml-2 text-xs opacity-70">({cat.count})</span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article: any) => (
          <Link key={article._id} to={`/knowledge/${article.slug}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: article.category?.color || '#6B7280' }}
                  >
                    {article.category?.name || 'Sem categoria'}
                  </span>
                </div>
                <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.views || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {article.helpful?.yes || 0}
                  </div>
                  <span>{article.createdAt ? new Date(article.createdAt).toLocaleDateString('pt-BR') : ''}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!listQuery.isLoading && !listQuery.isError && articles.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum artigo encontrado</h3>
          <p className="text-muted-foreground">Tente buscar com outras palavras ou filtros</p>
        </div>
      )}

      <div className="text-center pt-8 border-t">
        <p className="text-muted-foreground mb-4">Não encontrou o que procurava?</p>
        <Link to="/tickets">
          <Button variant="outline">
            Criar um ticket de suporte
          </Button>
        </Link>
      </div>
    </div>
  );
}
