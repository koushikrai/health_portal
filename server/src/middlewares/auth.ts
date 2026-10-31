import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../prisma';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  vendorId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'ecc-health-clearance-secret-2026';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Authentication bearer token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verify user exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { vendor: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Unauthorized: User account not found or inactive' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      vendorId: user.vendorId
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

    if (req.user.role === Role.ADMIN || allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      error: `Forbidden: Role '${req.user.role}' lacks permission for this action. Allowed: [${allowedRoles.join(', ')}]`
    });
  };
};
