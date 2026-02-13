import { Router } from 'express';
import {
  createArticle,
  getArticles,
  getArticleBySlug,
  updateArticle,
  deleteArticle,
  voteArticle,
  getPublicArticles,
  getPopularArticles,
  searchArticlesAi,
} from '../controllers/articleController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';
import { requireFeature } from '../services/planService.js';

const router = Router();

router.use(authenticate);
router.use(requireFeature('knowledgeBase'));

router.get('/', getArticles);
router.get('/public', getPublicArticles);
router.get('/popular', getPopularArticles);
router.get('/search', searchArticlesAi);
router.get('/:slug', getArticleBySlug);

router.post('/', authorize('admin', 'manager', 'agent'), createArticle);
router.put('/:id', authorize('admin', 'manager', 'agent'), updateArticle);
router.delete('/:id', authorize('admin', 'manager'), deleteArticle);
router.post('/:id/vote', voteArticle);

export default router;
