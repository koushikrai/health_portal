import prisma from '../prisma';

export class SlotRepository {
  static async findById(id: string) {
    return prisma.slotRequest.findUnique({
      where: { id },
      include: {
        test: true,
        allocations: {
          include: { vendor: true }
        }
      }
    });
  }

  static async list() {
    return prisma.slotRequest.findMany({
      include: {
        test: true,
        allocations: {
          include: { vendor: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async listOrderByIdDesc() {
    return prisma.slotRequest.findMany({
      include: {
        test: true,
        allocations: {
          include: { vendor: true }
        }
      },
      orderBy: { id: 'desc' }
    });
  }

  static async listAllIds() {
    return prisma.slotRequest.findMany({
      select: { id: true }
    });
  }

  static async create(data: any) {
    return prisma.slotRequest.create({
      data,
      include: {
        test: true,
        allocations: {
          include: { vendor: true }
        }
      }
    });
  }

  static async update(id: string, data: any) {
    return prisma.slotRequest.update({
      where: { id },
      data,
      include: {
        test: true,
        allocations: {
          include: { vendor: true }
        }
      }
    });
  }

  static async resetAllocationsForSlot(slotRequestId: string) {
    return prisma.slotAllocation.updateMany({
      where: { slotRequestId },
      data: { allocatedSlots: 0 }
    });
  }

  static async createAllocation(slotRequestId: string, vendorId: string, allocatedSlots: number) {
    return prisma.slotAllocation.create({
      data: {
        slotRequestId,
        vendorId,
        allocatedSlots
      }
    });
  }

  static async upsertAllocation(slotRequestId: string, vendorId: string, allocatedSlots: number) {
    return prisma.slotAllocation.upsert({
      where: {
        slotRequestId_vendorId: {
          slotRequestId,
          vendorId
        }
      },
      update: { allocatedSlots },
      create: {
        slotRequestId,
        vendorId,
        allocatedSlots
      }
    });
  }

  static async delete(id: string) {
    return prisma.slotRequest.delete({ where: { id } });
  }

  static async count() {
    return prisma.slotRequest.count();
  }
}
