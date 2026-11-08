import prisma from '../prisma';
import { RequestStatus } from '@prisma/client';

export class RequestRepository {
  static async findById(id: string) {
    return prisma.medicalRequest.findUnique({
      where: { id },
      include: {
        employee: true,
        test: true,
        vendor: true,
        report: true
      }
    });
  }

  static async findManyByIds(ids: string[]) {
    return prisma.medicalRequest.findMany({
      where: { id: { in: ids } }
    });
  }

  static async findBillableCompleted(ids: string[], vendorId: string) {
    return prisma.medicalRequest.findMany({
      where: {
        id: { in: ids },
        vendorId,
        status: RequestStatus.COMPLETED
      },
      include: { test: true }
    });
  }

  static async findLatestActiveForEmployee(employeeId: string) {
    return prisma.medicalRequest.findFirst({
      where: {
        employeeId,
        status: { in: [RequestStatus.WAITING, RequestStatus.SUBMITTED, RequestStatus.SCHEDULED] }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findLatestForEmployee(employeeId: string) {
    return prisma.medicalRequest.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findAllWithDetails() {
    return prisma.medicalRequest.findMany({
      include: {
        employee: true,
        test: true,
        vendor: true,
        report: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findRequestsWithClientFields() {
    return prisma.medicalRequest.findMany({
      select: { department: true, test: { select: { name: true } }, note: true }
    });
  }

  static async groupByTestId() {
    return prisma.medicalRequest.groupBy({
      by: ['testId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
  }

  static async findRequestsForSlotIds(slotReqIds: string[]) {
    if (slotReqIds.length === 0) return [];
    return prisma.medicalRequest.findMany({
      where: {
        OR: [
          ...slotReqIds.map(id => ({ id: { startsWith: `${id}-` } })),
          ...slotReqIds.map(id => ({ note: { contains: id } }))
        ]
      },
      select: {
        id: true,
        vendorId: true,
        note: true
      }
    });
  }

  static async findRequestsForSlot(slotId: string, includeDetails = false) {
    return prisma.medicalRequest.findMany({
      where: {
        OR: [
          { id: { startsWith: `${slotId}-` } },
          { note: { contains: slotId } }
        ]
      },
      include: includeDetails ? {
        employee: true,
        vendor: true,
        test: true,
        report: true
      } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  }

  static async list(params: {
    status?: string;
    vendorId?: string;
    search?: string;
  }) {
    const { status, vendorId, search } = params;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status as RequestStatus;
    }

    if (vendorId && vendorId !== 'ALL') {
      if (vendorId === 'UNASSIGNED' || vendorId === 'NONE') {
        where.vendorId = null;
      } else {
        where.vendorId = vendorId;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { employee: { name: { contains: q, mode: 'insensitive' } } },
        { employee: { employeeNo: { contains: q, mode: 'insensitive' } } },
        { employee: { iqamaId: { contains: q, mode: 'insensitive' } } },
        { department: { contains: q, mode: 'insensitive' } },
        { vendor: { name: { contains: q, mode: 'insensitive' } } },
        { vendor: { code: { contains: q, mode: 'insensitive' } } }
      ];
    }

    return prisma.medicalRequest.findMany({
      where,
      include: {
        employee: true,
        test: true,
        vendor: true,
        report: true,
        invoiceItems: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async create(data: any) {
    return prisma.medicalRequest.create({
      data,
      include: { employee: true, test: true, vendor: true }
    });
  }

  static async update(id: string, data: any) {
    return prisma.medicalRequest.update({
      where: { id },
      data,
      include: { employee: true, test: true, vendor: true, report: true }
    });
  }

  static async updateMany(ids: string[], data: any) {
    return prisma.medicalRequest.updateMany({
      where: { id: { in: ids } },
      data
    });
  }

  static async deleteById(id: string) {
    return prisma.medicalRequest.delete({
      where: { id }
    });
  }

  static async count(where?: any) {
    return prisma.medicalRequest.count({ where });
  }

  static async getNextRequestId(): Promise<string> {
    const allReqs = await prisma.medicalRequest.findMany({
      where: { id: { startsWith: 'MR-2026-' } },
      select: { id: true }
    });
    let maxNum = 140;
    for (const r of allReqs) {
      const parts = r.id.split('-');
      if (parts.length === 3) {
        const n = parseInt(parts[2], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
    return `MR-2026-${String(maxNum + 1).padStart(4, '0')}`;
  }
}
