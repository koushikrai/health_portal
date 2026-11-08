"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class EmployeeRepository {
    static async findByIdOrBadge(identifier) {
        return prisma_1.default.employee.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { employeeNo: identifier },
                    { iqamaId: identifier }
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
    }
    static async search(query, limit = 50, offset = 0) {
        const trimmed = (query || '').trim();
        return prisma_1.default.employee.findMany({
            where: trimmed ? {
                OR: [
                    { name: { contains: trimmed, mode: 'insensitive' } },
                    { employeeNo: { contains: trimmed, mode: 'insensitive' } },
                    { iqamaId: { contains: trimmed, mode: 'insensitive' } },
                    { department: { contains: trimmed, mode: 'insensitive' } },
                    { position: { contains: trimmed, mode: 'insensitive' } }
                ]
            } : undefined,
            take: limit,
            skip: offset,
            orderBy: { employeeNo: 'asc' }
        });
    }
    static async create(data) {
        return prisma_1.default.employee.create({
            data: {
                id: data.id,
                employeeNo: data.employeeNo,
                name: data.name,
                department: data.department || 'LOGISTIC',
                division: data.division,
                iqamaId: data.iqamaId,
                status: data.status || 'Active'
            }
        });
    }
    static async countAll() {
        return prisma_1.default.employee.count();
    }
    static async countActive() {
        return prisma_1.default.employee.count({ where: { status: 'Active' } });
    }
    static async getActiveDepartmentCountsAndCleared(now) {
        const [deptCounts, clearedReports] = await Promise.all([
            prisma_1.default.employee.groupBy({
                by: ['department'],
                where: { status: 'Active' },
                _count: { id: true }
            }),
            prisma_1.default.medicalReport.findMany({
                where: { result: 'FIT', validUntil: { gte: now } },
                select: {
                    employeeId: true,
                    employee: { select: { department: true } }
                }
            })
        ]);
        return { deptCounts, clearedReports };
    }
    static async listWorkforceClearanceRoster() {
        const withActivity = await prisma_1.default.employee.findMany({
            where: {
                OR: [
                    { requests: { some: {} } },
                    { reports: { some: {} } }
                ]
            },
            include: {
                reports: {
                    include: {
                        test: true,
                        vendor: true
                    },
                    orderBy: { testDate: 'desc' }
                },
                requests: {
                    include: {
                        test: true,
                        vendor: true,
                        report: true
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { employeeNo: 'asc' },
            take: 250
        });
        if (withActivity.length >= 70) {
            return withActivity;
        }
        const existingIds = new Set(withActivity.map(e => e.id));
        const additional = await prisma_1.default.employee.findMany({
            where: {
                id: { notIn: Array.from(existingIds) }
            },
            include: {
                reports: {
                    include: { test: true, vendor: true },
                    orderBy: { testDate: 'desc' }
                },
                requests: {
                    include: { test: true, vendor: true, report: true },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { employeeNo: 'asc' },
            take: 100 - withActivity.length
        });
        return [...withActivity, ...additional];
    }
}
exports.EmployeeRepository = EmployeeRepository;
