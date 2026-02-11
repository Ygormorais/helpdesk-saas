import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Eye, ThumbsUp } from 'lucide-react';
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

const articles = [
  {
    id: '1',
    slug: 'como-resetar-senha',
    title: 'Como resetar sua senha',
    excerpt: 'Aprenda passo a passo como recuperar o acesso à sua conta quando esquecer a senha.',
    category: { name: 'Conta', color: '#3B82F6' },
    views: 1250,
    helpful: { yes: 45, no: 3 },
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    slug: 'integracao-api',
    title: 'Guia de integração com API',
    excerpt: 'Documentação completa para integrar seus sistemas com nossa API REST.',
    category: { name: 'Desenvolvimento', color: '#10B981' },
    views: 890,
    helpful: { yes: 32, no: 5 },
    createdAt: '2024-01-08',
  },
  {
    id: '3',
    slug: 'configuracao-webhook',
    title: 'Configurando Webhooks',
    excerpt: 'Aprenda a receber notificações em tempo real através de webhooks.',
    category: { name: 'Desenvolvimento', color: '#10B981' },
    views: 654,
    helpful: { yes: 28, no: 2 },
    createdAt: '2024-01-05',
  },
  {
    id: '4',
    slug: 'planos-precos',
    title: 'Comparativo de planos',
    description: 'Entenda as diferenças entre os planos e escolha o melhor para sua empresa.',
    category: { name: 'Billing', color: '#F59E0B' },
    views: 543,
    helpful: { yes: 19, no: 1 },
    createdAt: '2024-01-03',
  },
  {
    id: '5',
    slug: 'seguranca-dados',
    title: 'Segurança e proteção de dados',
    excerpt: 'Conheça nossas práticas de segurança e como protegemos suas informações.',
    category: { name: 'Segurança', color: '#EF4444' },
    views: 432,
    helpful: { yes: 15, no: 0 },
    createdAt: '2024-01-01',
  },
];

const categories = [
  { name: 'Todas', count: 5 },
  { name: 'Conta', count: 1 },
  { name: 'Desenvolvimento', count: 2 },
  { name: 'Billing', count: 1 },
  { name: 'Segurança', count: 1 },
];

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
      article.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      </div>

      <div className="flex gap-4 justify-center">
        {categories.map((cat) => (
          <Button
            key={cat.name}
            variant={selectedCategory === cat.name.toLowerCase() || (selectedCategory === 'all' && cat.name === 'Todas') ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.name === 'Todas' ? 'all' : cat.name)}
          >
            {cat.name}
            <span className="ml-2 text-xs opacity-70">({cat.count})</span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article) => (
          <Link key={article.id} to={`/knowledge/${article.slug}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: article.category.color }}
                  >
                    {article.category.name}
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
                    {article.views}
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {article.helpful.yes}
                  </div>
                  <span>{article.createdAt}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredArticles.length === 0 && (
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
