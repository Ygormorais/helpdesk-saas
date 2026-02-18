import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, IUser } from '../models/index.js';
import { updateContext } from '../services/requestContext.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      tenantId: string;
    };

    const user = await User.findById(decoded.userId).populate('tenant');

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User not found or inactive' });
      return;
    }

    const userTenantId = (user.tenant as any)?._id
      ? String((user.tenant as any)._id)
      : String(user.tenant as any);

    if (decoded.tenantId && userTenantId !== decoded.tenantId) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    req.user = user;

    updateContext({
      userId: String(user._id),
      tenantId: userTenantId,
    });

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
};
