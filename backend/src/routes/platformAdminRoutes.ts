import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePlatformAdmin } from '../middlewares/platformAdmin.js';
import { listTenants } from '../controllers/platformAdminController.js';

const router = Router();

router.use(authenticate);
router.use(requirePlatformAdmin);

router.get('/tenants', listTenants);

export default router;
