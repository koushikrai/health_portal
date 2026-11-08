"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class MasterRepository {
    static async getDepartments() {
        return prisma_1.default.department.findMany({
            orderBy: { code: 'asc' }
        });
    }
    static async getTestsWithRates(orderByField = 'id') {
        return prisma_1.default.medicalTest.findMany({
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
    static async findTestById(id) {
        return prisma_1.default.medicalTest.findUnique({ where: { id } });
    }
    static async findFirstTestWithValidity() {
        return prisma_1.default.medicalTest.findFirst({
            where: { validityMonths: { gt: 0 } }
        });
    }
    static async listAllTests() {
        return prisma_1.default.medicalTest.findMany();
    }
    static async getClinicsWithContractsAndLatestSlot() {
        return prisma_1.default.vendor.findMany({
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
        return prisma_1.default.contractRate.findMany({
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
    static async findLatestContractByVendor(vendorId) {
        return prisma_1.default.contract.findFirst({
            where: { vendorId },
            include: { rates: true },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async countContracts() {
        return prisma_1.default.contract.count();
    }
    static async createContract(data, includeVendor = false) {
        return prisma_1.default.contract.create({
            data,
            include: includeVendor ? { vendor: true } : undefined
        });
    }
    static async countContractRates() {
        return prisma_1.default.contractRate.count();
    }
    static async createContractRate(data) {
        return prisma_1.default.contractRate.create({ data });
    }
    static async upsertContractRate(contractId, testId, rate, includesVat) {
        return prisma_1.default.contractRate.upsert({
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
    static async deleteContractRate(id) {
        return prisma_1.default.contractRate.delete({ where: { id } });
    }
    static async findLatestClinicSlotByVendor(vendorId) {
        return prisma_1.default.clinicSlot.findFirst({
            where: { vendorId },
            orderBy: { createdAt: 'desc' }
        });
    }
}
exports.MasterRepository = MasterRepository;
