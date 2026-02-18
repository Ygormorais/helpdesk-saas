import { Response } from 'express';
import { Article, ArticleFeedback, Ticket, AuditAction } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { z } from 'zod';
import { aiArticleSearchService } from '../services/aiArticleSearchService.js';
import { auditService } from '../services/auditService.js';

const createArticleSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(50),
  excerpt: z.string().max(300).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  relatedTickets: z.array(z.string()).optional(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }).optional(),
});

const updateArticleSchema = z.object({
  title: z.string().min(5).optional(),
  content: z.string().min(50).optional(),
  excerpt: z.string().max(300).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  relatedTickets: z.array(z.string()).optional(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }).optional(),
});

const articleFeedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().trim().min(1).max(1000).optional(),
});

async function upsertFeedbackAndUpdateCounters(params: {
  tenantId: any;
  articleId: any;
  userId: any;
  helpful: boolean;
  comment?: string;
}) {
  const { tenantId, articleId, userId, helpful, comment } = params;

  const article = await Article.findOne({ _id: articleId, tenant: tenantId });
  if (!article) {
    throw new AppError('Article not found', 404);
  }

  const existing = await ArticleFeedback.findOne({
    tenant: tenantId,
    article: articleId,
    user: userId,
  });

  if (!existing) {
    await ArticleFeedback.create({
      tenant: tenantId,
      article: articleId,
      user: userId,
      helpful,
      comment,
    });

    if (helpful) article.helpful.yes += 1;
    else article.helpful.no += 1;
    await article.save();
    return;
  }

  const prevHelpful = existing.helpful;
  existing.helpful = helpful;
  if (comment !== undefined) {
    existing.comment = comment;
  }
  await existing.save();

  if (prevHelpful !== helpful) {
    if (prevHelpful) article.helpful.yes = Math.max(0, article.helpful.yes - 1);
    else article.helpful.no = Math.max(0, article.helpful.no - 1);

    if (helpful) article.helpful.yes += 1;
    else article.helpful.no += 1;
    await article.save();
  }
}

export const createArticle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = createArticleSchema.parse(req.body);
    const user = req.user!;

    const article = await Article.create({
      ...data,
      tenant: user.tenant._id,
      author: user._id,
    });

    await article.populate('author', 'name email');
    await article.populate('category', 'name color');

    await auditService.log(
      AuditAction.ARTICLE_CREATED,
      'article',
      article._id.toString(),
      {
        title: article.title,
        slug: article.slug,
        isPublished: article.isPublished,
      },
      { user, ip: req.ip, userAgent: req.get('user-agent') }
    );

    res.status(201).json({ message: 'Article created', article });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const getArticles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const {
    page = '1',
    limit = '20',
    category,
    search,
    status,
  } = req.query as Record<string, string>;

  const query: Record<string, any> = { tenant: user.tenant._id };

  if (status === 'published') query.isPublished = true;
  if (status === 'draft') query.isPublished = false;
  if (category) query.category = category;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [articles, total] = await Promise.all([
    Article.find(query)
      .populate('author', 'name')
      .populate('category', 'name color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Article.countDocuments(query),
  ]);

  res.json({
    articles,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
};

export const getArticleBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { slug } = req.params;

  const article = await Article.findOne({
    slug,
    tenant: user.tenant._id,
  })
    .populate('author', 'name email avatar')
    .populate('category', 'name color');

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  article.views += 1;
  await article.save();

  res.json({ article });
};

export const getPublicArticles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { search, category } = req.query as Record<string, string>;

  const query: Record<string, any> = {
    tenant: user.tenant._id,
    isPublished: true,
  };

  if (category) query.category = category;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];
  }

  const articles = await Article.find(query)
    .select('title slug excerpt category tags views createdAt')
    .populate('category', 'name color')
    .sort({ views: -1, createdAt: -1 });

  res.json({ articles });
};

const searchAiSchema = z.object({
  q: z.string().min(2),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const listFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  commentOnly: z.preprocess((v) => {
    if (v === 'true' || v === '1' || v === true) return true;
    if (v === 'false' || v === '0' || v === false) return false;
    return v;
  }, z.boolean().optional()),
  helpful: z.preprocess((v) => {
    if (v === 'true' || v === true) return true;
    if (v === 'false' || v === false) return false;
    if (v === 'yes') return true;
    if (v === 'no') return false;
    return v;
  }, z.boolean().optional()),
});

export const searchArticlesAi = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const parsed = searchAiSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  const { q, category, limit } = parsed.data;
  const out = await aiArticleSearchService.searchPublishedArticles({
    tenantId: user.tenant._id,
    query: q,
    categoryId: category,
    limit,
  });

  res.json(out);
};

export const updateArticle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const updates = updateArticleSchema.parse(req.body);

  const article = await Article.findOne({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  Object.assign(article, updates);
  await article.save();

  await article.populate('author', 'name email');
  await article.populate('category', 'name color');

  await auditService.log(
    AuditAction.ARTICLE_UPDATED,
    'article',
    article._id.toString(),
    {
      slug: article.slug,
      updates,
    },
    { user, ip: req.ip, userAgent: req.get('user-agent') }
  );

  res.json({ message: 'Article updated', article });
};

export const deleteArticle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const article = await Article.findOneAndDelete({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  await auditService.log(
    AuditAction.ARTICLE_DELETED,
    'article',
    article._id.toString(),
    {
      title: article.title,
      slug: article.slug,
    },
    { user, ip: req.ip, userAgent: req.get('user-agent') }
  );

  res.json({ message: 'Article deleted' });
};

export const voteArticle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const parsed = articleFeedbackSchema.pick({ helpful: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  await upsertFeedbackAndUpdateCounters({
    tenantId: user.tenant._id,
    articleId: id,
    userId: user._id,
    helpful: parsed.data.helpful,
  });

  const article = await Article.findOne({ _id: id, tenant: user.tenant._id }).select('helpful');
  res.json({ message: 'Vote recorded', helpful: article?.helpful });
};

export const submitArticleFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const parsed = articleFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  await upsertFeedbackAndUpdateCounters({
    tenantId: user.tenant._id,
    articleId: id,
    userId: user._id,
    helpful: parsed.data.helpful,
    comment: parsed.data.comment,
  });

  res.json({ success: true });
};

export const listArticleFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { page, limit, commentOnly, helpful } = listFeedbackQuerySchema.parse(req.query);

  const article = await Article.findOne({ _id: id, tenant: user.tenant._id }).select('_id helpful');
  if (!article) {
    throw new AppError('Article not found', 404);
  }

  const query: any = {
    tenant: user.tenant._id,
    article: article._id,
  };

  if (typeof helpful === 'boolean') {
    query.helpful = helpful;
  }

  if (commentOnly) {
    query.comment = { $exists: true, $ne: '' };
  }

  const skip = (page - 1) * limit;

  const [items, total, grouped] = await Promise.all([
    ArticleFeedback.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('helpful comment user createdAt'),
    ArticleFeedback.countDocuments(query),
    ArticleFeedback.aggregate([
      { $match: { tenant: user.tenant._id, article: article._id } },
      { $group: { _id: '$helpful', count: { $sum: 1 } } },
    ]),
  ]);

  const stats = {
    yes: grouped.find((g: any) => g._id === true)?.count || 0,
    no: grouped.find((g: any) => g._id === false)?.count || 0,
    total: grouped.reduce((acc: number, g: any) => acc + (g.count || 0), 0),
    counters: article.helpful,
  };

  const feedback = items.map((f: any) => ({
    id: f._id,
    helpful: f.helpful,
    comment: f.comment,
    createdAt: f.createdAt,
    user: f.user ? { id: f.user._id, name: f.user.name, email: f.user.email } : undefined,
  }));

  res.json({
    feedback,
    stats,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export const addRelatedTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const bodySchema = z.object({ ticketId: z.string().min(1) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  const ticket = await Ticket.findOne({ _id: parsed.data.ticketId, tenant: user.tenant._id }).select('_id');
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const out = await Article.updateOne(
    { _id: id, tenant: user.tenant._id },
    { $addToSet: { relatedTickets: ticket._id } }
  );

  if (out.matchedCount === 0) {
    throw new AppError('Article not found', 404);
  }

  res.json({ success: true });
};

export const removeRelatedTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id, ticketId } = req.params;

  const out = await Article.updateOne(
    { _id: id, tenant: user.tenant._id },
    { $pull: { relatedTickets: ticketId } }
  );

  if (out.matchedCount === 0) {
    throw new AppError('Article not found', 404);
  }

  res.json({ success: true });
};

export const getArticlesByTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { ticketId } = req.params;

  const ticket = await Ticket.findOne({ _id: ticketId, tenant: user.tenant._id }).select('_id');
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const articles = await Article.find({
    tenant: user.tenant._id,
    relatedTickets: ticket._id,
  })
    .select('title slug excerpt category tags views isPublished createdAt updatedAt')
    .populate('category', 'name color')
    .sort({ updatedAt: -1 });

  res.json({ articles });
};

export const getRelatedArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { slug } = req.params;
  const limitRaw = parseInt(req.query.limit as string, 10) || 6;
  const limit = Math.min(12, Math.max(1, limitRaw));

  const current = await Article.findOne({
    slug,
    tenant: user.tenant._id,
    isPublished: true,
  }).select('_id category tags');

  if (!current) {
    throw new AppError('Article not found', 404);
  }

  const baseQuery: any = {
    tenant: user.tenant._id,
    isPublished: true,
    _id: { $ne: current._id },
  };

  const picked: any[] = [];
  const pickedIds = new Set<string>();

  const pushUnique = (items: any[]) => {
    for (const a of items) {
      const key = String(a._id);
      if (pickedIds.has(key)) continue;
      pickedIds.add(key);
      picked.push(a);
      if (picked.length >= limit) break;
    }
  };

  if (current.category) {
    const sameCategory = await Article.find({ ...baseQuery, category: current.category })
      .select('title slug excerpt category tags views createdAt updatedAt')
      .populate('category', 'name color')
      .sort({ views: -1, updatedAt: -1 })
      .limit(limit);
    pushUnique(sameCategory);
  }

  if (picked.length < limit && Array.isArray(current.tags) && current.tags.length > 0) {
    const byTags = await Article.find({
      ...baseQuery,
      tags: { $in: current.tags },
    })
      .select('title slug excerpt category tags views createdAt updatedAt')
      .populate('category', 'name color')
      .sort({ views: -1, updatedAt: -1 })
      .limit(limit);
    pushUnique(byTags);
  }

  if (picked.length < limit) {
    const latest = await Article.find(baseQuery)
      .select('title slug excerpt category tags views createdAt updatedAt')
      .populate('category', 'name color')
      .sort({ createdAt: -1 })
      .limit(limit);
    pushUnique(latest);
  }

  res.json({ articles: picked });
};

export const getPopularArticles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const limitRaw = parseInt(req.query.limit as string, 10) || 5;
  const limit = Math.min(50, Math.max(1, limitRaw));

  const articles = await Article.find({
    tenant: user.tenant._id,
    isPublished: true,
  })
    .select('title slug excerpt views')
    .sort({ views: -1 })
    .limit(limit);

  res.json({ articles });
};
