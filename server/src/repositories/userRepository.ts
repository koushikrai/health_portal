import prisma from '../prisma';
import { Role } from '@prisma/client';

export class UserRepository {
  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { vendor: true }
    });
  }

  static async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { vendor: true }
    });
  }

  static async findFirstByRole(role: Role, vendorId?: string) {
    const where: any = { role, isActive: true };
    if (vendorId) where.vendorId = vendorId;

    let user = await prisma.user.findFirst({ where, include: { vendor: true } });
    if (!user) {
      user = await prisma.user.findFirst({ where: { role }, include: { vendor: true } });
    }
    return user;
  }

  static async listAll() {
    return prisma.user.findMany({
      include: { vendor: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async listAllWithCounts() {
    return prisma.user.findMany({
      include: {
        vendor: true,
        _count: {
          select: { requests: true, auditLogs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async create(data: {
    username: string;
    passwordHash: string;
    name: string;
    role: Role;
    vendorId?: string | null;
    isActive?: boolean;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        username: data.username.toLowerCase().trim()
      },
      include: { vendor: true }
    });
  }

  static async update(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
      include: { vendor: true }
    });
  }

  static async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  static async count(where?: any) {
    return prisma.user.count({ where });
  }

  static async groupByRole() {
    return prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });
  }
}
