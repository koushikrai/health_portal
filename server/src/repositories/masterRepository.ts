import prisma from '../prisma';

export class MasterRepository {
  static async getDepartments() {
    return prisma.department.findMany({
      orderBy: { code: 'asc' }
    });
  }

  static async getTestsWithRates(orderByField: 'id' | 'name' = 'id') {
    return prisma.medicalTest.findMany({
      include: {
        rates: {
          include: {
            contract: {
              include: { vendor: true }
            }
          }
        }
      },
      orderBy: orderByField === 'name' ? { name: 'asc' } : { id: 'asc' }
    });
  }

  static async findTestById(id: string) {
    return prisma.medicalTest.findUnique({ where: { id } });
  }

  static async findFirstTestWithValidity() {
    return prisma.medicalTest.findFirst({
      where: { validityMonths: { gt: 0 } }
    });
  }

  static async listAllTests() {
    return prisma.medicalTest.findMany();
  }

  static async getClinicsWithContractsAndLatestSlot() {
    return prisma.vendor.findMany({
      include: {
        contracts: {
          include: {
            rates: {
              include: { test: true }
            }
          }
        },
        slots: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { code: 'asc' }
    });
  }

  static async getRatesWithContractAndTest() {
    return prisma.contractRate.findMany({
      include: {
        contract: {
          include: { vendor: true }
        },
        test: true
      },
      orderBy: [
        { contract: { vendor: { code: 'asc' } } },
        { testId: 'asc' }
      ]
    });
  }

  static async findLatestContractByVendor(vendorId: string) {
    return prisma.contract.findFirst({
      where: { vendorId },
      include: { rates: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async countContracts() {
    return prisma.contract.count();
  }

  static async createContract(data: any, includeVendor = false) {
    return prisma.contract.create({
      data,
      include: includeVendor ? { vendor: true } : undefined
    });
  }

  static async countContractRates() {
    return prisma.contractRate.count();
  }

  static async createContractRate(data: {
    contractId: string;
    testId: string;
    rate: number;
    includesVat: boolean;
  }) {
    return prisma.contractRate.create({ data });
  }

  static async upsertContractRate(
    contractId: string,
    testId: string,
    rate: number,
    includesVat: boolean
  ) {
    return prisma.contractRate.upsert({
      where: {
        contractId_testId: { contractId, testId }
      },
      update: {
        rate,
        includesVat
      },
      create: {
        contractId,
        testId,
        rate,
        includesVat
      },
      include: { test: true }
    });
  }

  static async deleteContractRate(id: string) {
    return prisma.contractRate.delete({ where: { id } });
  }

  static async findLatestClinicSlotByVendor(vendorId: string) {
    return prisma.clinicSlot.findFirst({
      where: { vendorId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
