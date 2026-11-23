import prisma from '../prisma';
import { ReportResult } from '@prisma/client';

export class ReportRepository {
  static async findByIdOrRequestId(id: string) {
    return prisma.medicalReport.findFirst({
      where: {
        OR: [{ id }, { requestId: id }]
      },
      include: {
        employee: true,
        test: true,
        vendor: true,
        request: true
      }
    });
  }

  static async findByRequestId(requestId: string) {
    return prisma.medicalReport.findUnique({
      where: { requestId }
    });
  }

  static async list(params: {
    result?: string;
    vendorId?: string;
    search?: string;
  }) {
    const { result, vendorId, search } = params;
    const where: any = {};

    if (result && result !== 'ALL') {
      where.result = result as ReportResult;
    }

    if (vendorId && vendorId !== 'ALL') {
      where.vendorId = vendorId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { employee: { name: { contains: q, mode: 'insensitive' } } },
        { employee: { employeeNo: { contains: q, mode: 'insensitive' } } },
        { employee: { iqamaId: { contains: q, mode: 'insensitive' } } },
        { test: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    return prisma.medicalReport.findMany({
      where,
      include: {
        employee: true,
        test: true,
        vendor: true,
        request: true
      },
      orderBy: { testDate: 'desc' }
    });
  }

  static async upsert(requestId: string, createData: any, updateData: any) {
    return prisma.medicalReport.upsert({
      where: { requestId },
      update: updateData,
      create: createData,
      include: { employee: true, test: true, vendor: true }
    });
  }

  static async count(where?: any) {
    return prisma.medicalReport.count({ where });
  }
}
