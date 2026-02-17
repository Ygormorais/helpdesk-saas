import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { listUsers } from '../controllers/userController.js';

const router = Router();

router.use(authenticate);

// Staff-only directory for internal features (chat DM, assignments, etc.)
router.get('/', authorize('admin', 'manager', 'agent'), listUsers);

export default router;
