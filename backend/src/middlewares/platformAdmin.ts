import { config } from '../config/index.js';
import type { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';

export const requirePlatformAdmin = (req: AuthRequest, _res: any, next: Function) => {
  const user = req.user;
  if (!user) {
    next(new AppError('Nao autorizado', 401));
    return;
  }

  const email = String(user.email || '').toLowerCase();
  const allowed = config.platformAdminEmails.includes(email);
  if (!allowed) {
    next(new AppError('Acesso negado', 403));
    return;
  }

  next();
};
