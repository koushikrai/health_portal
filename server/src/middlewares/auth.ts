import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { UserRepository } from '../repositories/userRepository';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  vendorId?: string | null;
  impersonatorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Authentication bearer token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    // Verify user exists and is active in database via Data Tier repository
    const user = await UserRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Unauthorized: User account not found or inactive' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      vendorId: user.vendorId,
      impersonatorId: decoded.impersonatorId || undefined
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    // Role check: ADMIN role or user possessing explicit role in allowed list
    if (req.user.role === Role.ADMIN || allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      error: `Forbidden: Role '${req.user.role}' lacks permission for this action. Allowed: [${allowedRoles.join(', ')}]`
    });
  };
};
