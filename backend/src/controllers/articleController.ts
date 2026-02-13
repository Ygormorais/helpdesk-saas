import { Response } from 'express';
import { Article } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { z } from 'zod';
import { aiArticleSearchService } from '../services/aiArticleSearchService.js';

const createArticleSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(50),
  excerpt: z.string().max(300).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
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
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }).optional(),
});

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

  res.json({ message: 'Article deleted' });
};

export const voteArticle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { helpful } = req.body;

  const article = await Article.findOne({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  if (helpful === true) {
    article.helpful.yes += 1;
  } else if (helpful === false) {
    article.helpful.no += 1;
  }

  await article.save();

  res.json({ message: 'Vote recorded', helpful: article.helpful });
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
