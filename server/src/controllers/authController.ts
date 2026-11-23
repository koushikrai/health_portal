import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuditService } from '../services/auditService';
import { config } from '../config';
import { UserRepository } from '../repositories/userRepository';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await UserRepository.findByUsername(username);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials or inactive account' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const payload = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        vendorId: user.vendorId
      };

      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

      await AuditService.log({
        userId: user.id,
        actorName: user.name,
        role: user.role,
        action: 'SIGN_IN',
        entityType: 'User',
        entityId: user.id,
        details: `User ${user.username} signed in as ${user.role}`
      });

      return res.json({
        token,
        user: {
          ...payload,
          vendor: user.vendor
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await UserRepository.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          vendorId: user.vendorId,
          vendor: user.vendor,
          impersonatorId: (req.user as any)?.impersonatorId || null
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async switchRole(req: Request, res: Response) {
    try {
      const isAllowed = req.user?.role === 'ADMIN' || !!(req.user as any)?.impersonatorId;
      if (!isAllowed) {
        return res.status(403).json({ error: 'Forbidden: Only administrators can switch roles' });
      }
      const adminId = (req.user as any)?.impersonatorId || req.user!.id;
      const { targetRole, vendorId } = req.body;

      if (targetRole === 'ADMIN') {
        const adminUser = await UserRepository.findById(adminId);

        if (!adminUser) {
          return res.status(404).json({ error: 'Admin account not found' });
        }

        const payload = {
          id: adminUser.id,
          username: adminUser.username,
          name: adminUser.name,
          role: adminUser.role,
          vendorId: adminUser.vendorId
        };
        const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

        return res.json({
          token,
          user: {
            ...payload,
            vendor: adminUser.vendor
          }
        });
      }

      const user = await UserRepository.findFirstByRole(targetRole as Role, vendorId);

      if (!user || !user.isActive) {
        return res.status(404).json({ error: `No active user found for role ${targetRole}` });
      }

      const payload: any = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        vendorId: user.vendorId,
        impersonatorId: adminId
      };

      // Impersonation token has a safe 2-hour TTL
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '2h' });

      await AuditService.log({
        userId: adminId,
        actorName: (req.user as any)?.name || 'Admin',
        role: req.user?.role || Role.ADMIN,
        action: 'ROLE_IMPERSONATE',
        entityType: 'User',
        entityId: user.id,
        details: `Administrator switched role to ${targetRole} (impersonating ${user.username})`
      });

      return res.json({
        token,
        user: {
          ...payload,
          vendor: user.vendor
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
