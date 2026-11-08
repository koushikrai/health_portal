import prisma from '../prisma';
import { InvoiceStatus } from '@prisma/client';

export class InvoiceRepository {
  static async findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        lineItems: {
          include: {
            request: {
              include: { employee: true, test: true, report: true }
            }
          }
        }
      }
    });
  }

  static async list(params: {
    status?: string;
    vendorId?: string;
  }) {
    const { status, vendorId } = params;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status as InvoiceStatus;
    }

    if (vendorId && vendorId !== 'ALL') {
      where.vendorId = vendorId;
    }

    return prisma.invoice.findMany({
      where,
      include: {
        vendor: true,
        lineItems: {
          include: {
            request: {
              include: { employee: true, test: true, report: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async create(data: any) {
    return prisma.invoice.create({
      data,
      include: {
        vendor: true,
        lineItems: { include: { request: true } }
      }
    });
  }

  static async update(id: string, data: any) {
    return prisma.invoice.update({
      where: { id },
      data,
      include: { vendor: true }
    });
  }

  static async count(where?: any) {
    return prisma.invoice.count({ where });
  }

  static async aggregateSum(where?: any) {
    return prisma.invoice.aggregate({
      where,
      _sum: { totalAmount: true }
    });
  }
}
