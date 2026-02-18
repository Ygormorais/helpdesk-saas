import { Router } from 'express';
import { getAuditLogs, exportAuditLogsCsv } from '../controllers/auditController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), getAuditLogs);
router.get('/export', authorize('admin', 'manager'), exportAuditLogsCsv);

export default router;
