"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const eligibilityService_1 = require("../services/eligibilityService");
class EmployeeController {
    static async search(req, res) {
        try {
            const q = (req.query.q || '').trim();
            const limit = Math.min(Number(req.query.limit) || 20, 50);
            let whereClause = {};
            if (q) {
                whereClause = {
                    OR: [
                        { employeeNo: { contains: q, mode: 'insensitive' } },
                        { iqamaId: { contains: q, mode: 'insensitive' } },
                        { name: { contains: q, mode: 'insensitive' } },
                        { department: { contains: q, mode: 'insensitive' } },
                        { position: { contains: q, mode: 'insensitive' } }
                    ]
                };
            }
            const employees = await prisma_1.default.employee.findMany({
                where: whereClause,
                take: limit,
                orderBy: { employeeNo: 'asc' }
            });
            return res.json({ employees });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const employee = await prisma_1.default.employee.findFirst({
                where: {
                    OR: [
                        { id },
                        { employeeNo: id },
                        { iqamaId: id }
                    ]
                },
                include: {
                    requests: {
                        include: { test: true, vendor: true, report: true },
                        orderBy: { createdAt: 'desc' }
                    },
                    reports: {
                        include: { test: true, vendor: true },
                        orderBy: { testDate: 'desc' }
                    }
                }
            });
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            return res.json({ employee });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async checkEligibility(req, res) {
        try {
            const { id } = req.params;
            const testId = req.query.testId;
            if (!testId) {
                return res.status(400).json({ error: 'Query param testId is required' });
            }
            const employee = await prisma_1.default.employee.findFirst({
                where: {
                    OR: [{ id }, { employeeNo: id }]
                }
            });
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            const eligibility = await eligibilityService_1.EligibilityService.check(employee.id, testId);
            return res.json({ employee, eligibility });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.EmployeeController = EmployeeController;
