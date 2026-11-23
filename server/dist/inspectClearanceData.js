"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
async function main() {
    const empCount = await prisma_1.default.employee.count();
    const reqCount = await prisma_1.default.medicalRequest.count();
    const repCount = await prisma_1.default.medicalReport.count();
    const testCount = await prisma_1.default.medicalTest.count();
    console.log({ empCount, reqCount, repCount, testCount });
    // Check how many employees have reports or requests
    const emps = await prisma_1.default.employee.findMany({
        include: {
            reports: { include: { test: true, vendor: true } },
            requests: { include: { test: true, vendor: true, report: true } }
        }
    });
    const empsWithReports = emps.filter(e => e.reports.length > 0);
    console.log(`Employees with reports: ${empsWithReports.length} / ${empCount}`);
    const sample = emps.slice(0, 3).map(e => ({
        id: e.id,
        empNo: e.employeeNo,
        name: e.name,
        dept: e.department,
        reportCount: e.reports.length,
        requestCount: e.requests.length,
        reports: e.reports.map(r => ({
            test: r.test.name,
            validUntil: r.validUntil,
            result: r.result,
            fileUrl: r.fileUrl
        }))
    }));
    console.log('Sample employees:', JSON.stringify(sample, null, 2));
    // Check tests in DB
    const tests = await prisma_1.default.medicalTest.findMany();
    console.log('Tests in DB:', tests.map(t => ({ id: t.id, name: t.name, validityMonths: t.validityMonths })));
}
main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
