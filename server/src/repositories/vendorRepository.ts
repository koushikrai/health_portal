import prisma from '../prisma';

export class VendorRepository {
  static async findById(id: string) {
    return prisma.vendor.findUnique({
      where: { id },
      include: {
        contracts: { include: { rates: { include: { test: true } } } },
        slots: true
      }
    });
  }

  static async findByCode(code: string) {
    return prisma.vendor.findFirst({
      where: { code }
    });
  }

  static async listAll() {
    return prisma.vendor.findMany({
      orderBy: { code: 'asc' }
    });
  }

  static async listAllIds() {
    return prisma.vendor.findMany({
      select: { id: true }
    });
  }

  static async listActive() {
    return prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        contracts: {
          include: {
            rates: { include: { test: true } }
          }
        }
      },
      orderBy: { code: 'asc' }
    });
  }

  static async listActiveWithSlotAllocations() {
    return prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        slotAllocations: {
          include: {
            slotRequest: {
              include: { test: true }
            }
          }
        }
      },
      orderBy: { code: 'asc' }
    });
  }

  static async listWithSlotsAndRequests() {
    return prisma.vendor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        sapVendorNo: true,
        crNumber: true,
        slots: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        requests: {
          where: { status: { in: ['SUBMITTED', 'SCHEDULED'] } }
        }
      }
    });
  }

  static async create(data: any) {
    return prisma.vendor.create({ data });
  }

  static async update(id: string, data: any) {
    return prisma.vendor.update({
      where: { id },
      data
    });
  }

  static async delete(id: string) {
    await prisma.contractRate.deleteMany({ where: { contract: { vendorId: id } } });
    await prisma.contract.deleteMany({ where: { vendorId: id } });
    await prisma.slotAllocation.deleteMany({ where: { vendorId: id } });
    await prisma.clinicSlot.deleteMany({ where: { vendorId: id } });
    return prisma.vendor.delete({ where: { id } });
  }

  static async count(where?: any) {
    return prisma.vendor.count({ where });
  }
}
