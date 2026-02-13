import axios from 'axios';
import { config } from '../config/index.js';
import { Article } from '../models/index.js';

type SearchResult = {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  views?: number;
  createdAt?: Date;
  category?: any;
  score: number;
};

function dot(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i += 1) sum += a[i] * b[i];
  return sum;
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

function buildEmbeddingText(article: { title?: string; excerpt?: string; content?: string; tags?: string[] }): string {
  const parts = [
    article.title ? `Title: ${article.title}` : '',
    article.excerpt ? `Excerpt: ${article.excerpt}` : '',
    article.tags && article.tags.length ? `Tags: ${article.tags.join(', ')}` : '',
    article.content ? `Content: ${article.content}` : '',
  ].filter(Boolean);

  const joined = parts.join('\n\n');
  // Keep request size bounded.
  return joined.length > 4000 ? joined.slice(0, 4000) : joined;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const provider = config.aiEmbeddingsProvider || (config.openai.apiKey ? 'openai' : 'ollama');

  if (provider === 'none') {
    throw new Error('AI embeddings disabled');
  }

  if (provider === 'openai') {
    if (!config.openai.apiKey) throw new Error('OPENAI_API_KEY not configured');

    const url = `${config.openai.baseUrl.replace(/\/$/, '')}/embeddings`;
    const response = await axios.post(
      url,
      {
        model: config.openai.embeddingModel,
        input: texts,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      }
    );

    const data = response.data?.data;
    if (!Array.isArray(data)) throw new Error('Invalid embeddings response');
    return data.map((d: any) => d.embedding as number[]);
  }

  // Ollama (local, free): POST /api/embeddings { model, prompt }
  const baseUrl = config.ollama.baseUrl.replace(/\/$/, '');
  const model = config.ollama.embeddingModel;

  const results: number[][] = [];
  const concurrency = 4;
  let idx = 0;

  const runOne = async () => {
    while (idx < texts.length) {
      const current = idx;
      idx += 1;

      const response = await axios.post(
        `${baseUrl}/api/embeddings`,
        { model, prompt: texts[current] },
        { timeout: 30_000, headers: { 'Content-Type': 'application/json' } }
      );

      const embedding = response.data?.embedding;
      if (!Array.isArray(embedding)) throw new Error('Invalid ollama embeddings response');
      results[current] = embedding as number[];
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, texts.length) }, () => runOne()));
  return results;
}

export const aiArticleSearchService = {
  async searchPublishedArticles(params: {
    tenantId: any;
    query: string;
    categoryId?: string;
    limit?: number;
  }): Promise<{ mode: 'ai' | 'fallback'; results: SearchResult[] }> {
    const q = params.query.trim();
    const limit = Math.min(50, Math.max(1, params.limit ?? 12));

    const fallback = async (): Promise<{ mode: 'ai' | 'fallback'; results: SearchResult[] }> => {
      const query: Record<string, any> = { tenant: params.tenantId, isPublished: true };
      if (params.categoryId) query.category = params.categoryId;
      if (q) {
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { excerpt: { $regex: q, $options: 'i' } },
          { content: { $regex: q, $options: 'i' } },
        ];
      }

      const articles = await Article.find(query)
        .select('title slug excerpt category views createdAt')
        .populate('category', 'name color')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        mode: 'fallback',
        results: articles.map((a: any, i: number) => ({
          _id: String(a._id),
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          category: a.category,
          views: a.views,
          createdAt: a.createdAt,
          score: 1 - i / Math.max(1, articles.length),
        })),
      };
    };

    const provider = config.aiEmbeddingsProvider || (config.openai.apiKey ? 'openai' : 'ollama');
    if (provider === 'none') return fallback();

    try {
      // Candidate set: keep bounded for latency.
      const baseQuery: Record<string, any> = { tenant: params.tenantId, isPublished: true };
      if (params.categoryId) baseQuery.category = params.categoryId;

      const candidates = await Article.find(baseQuery)
        .select('title slug excerpt content tags category views createdAt updatedAt ai')
        .populate('category', 'name color')
        .sort({ views: -1, updatedAt: -1 })
        .limit(250)
        .lean();

      const queryEmbedding = (await embedTexts([q]))[0];

      const model = provider === 'openai' ? config.openai.embeddingModel : config.ollama.embeddingModel;
      const needsEmbedding: any[] = [];
      for (const a of candidates) {
        const embeddedAt = a.ai?.embeddedAt ? new Date(a.ai.embeddedAt) : null;
        const updatedAt = a.updatedAt ? new Date(a.updatedAt) : null;
        const isStale = !embeddedAt || (updatedAt && embeddedAt.getTime() < updatedAt.getTime());
        const wrongModel = a.ai?.embeddingModel && a.ai.embeddingModel !== model;
        const hasEmbedding = Array.isArray(a.ai?.embedding) && a.ai.embedding.length > 0;
        if (!hasEmbedding || isStale || wrongModel) {
          needsEmbedding.push(a);
        }
      }

      // Backfill some embeddings on demand.
      const toEmbed = needsEmbedding.slice(0, 30);
      if (toEmbed.length > 0) {
        const texts = toEmbed.map((a) => buildEmbeddingText(a));
        const embeddings = await embedTexts(texts);
        await Promise.all(
          toEmbed.map((a, i) =>
            Article.updateOne(
              { _id: a._id, tenant: params.tenantId },
              {
                $set: {
                  ai: {
                    embedding: embeddings[i],
                    embeddingModel: model,
                    embeddedAt: new Date(),
                  },
                },
              }
            ).catch(() => undefined)
          )
        );

        // Update in-memory candidates for scoring.
        for (let i = 0; i < toEmbed.length; i += 1) {
          const id = String(toEmbed[i]._id);
          const emb = embeddings[i];
          const target = candidates.find((c: any) => String(c._id) === id);
          if (target) {
            target.ai = { embedding: emb, embeddingModel: model, embeddedAt: new Date() };
          }
        }
      }

      const scored: SearchResult[] = [];
      for (const a of candidates) {
        const embedding = a.ai?.embedding;
        if (!Array.isArray(embedding) || embedding.length === 0) continue;

        const score = cosineSimilarity(queryEmbedding, embedding);
        scored.push({
          _id: String(a._id),
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          category: a.category,
          views: a.views,
          createdAt: a.createdAt,
          score,
        });
      }

      scored.sort((a, b) => b.score - a.score);
      return { mode: 'ai', results: scored.slice(0, limit) };
    } catch {
      // If AI provider is not available (ex: Ollama not running), keep search functional.
      return fallback();
    }
  },
};
