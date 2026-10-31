"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastersController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class MastersController {
    static async getDepartments(req, res) {
        try {
            const departments = await prisma_1.default.department.findMany({
                orderBy: { code: 'asc' }
            });
            return res.json({ departments });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getTests(req, res) {
        try {
            const tests = await prisma_1.default.medicalTest.findMany({
                include: {
                    rates: {
                        include: {
                            contract: {
                                include: { vendor: true }
                            }
                        }
                    }
                },
                orderBy: { id: 'asc' }
            });
            return res.json({ tests });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getClinics(req, res) {
        try {
            const clinics = await prisma_1.default.vendor.findMany({
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
            return res.json({ clinics });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getRates(req, res) {
        try {
            const rates = await prisma_1.default.contractRate.findMany({
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
            return res.json({ rates });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.MastersController = MastersController;
