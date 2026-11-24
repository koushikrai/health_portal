"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EligibilityService = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const client_1 = require("@prisma/client");
class EligibilityService {
    static async check(employeeId, testId) {
        const test = await prisma_1.default.medicalTest.findUnique({
            where: { id: testId }
        });
        if (!test) {
            throw new Error(`Invalid medical test ID: ${testId}`);
        }
        // 1. Check for active in-flight request for this employee & test
        const activeRequest = await prisma_1.default.medicalRequest.findFirst({
            where: {
                employeeId,
                testId,
                status: { in: [client_1.RequestStatus.WAITING, client_1.RequestStatus.SUBMITTED, client_1.RequestStatus.SCHEDULED] }
            },
            include: {
                vendor: true,
                test: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        if (activeRequest) {
            const clinicName = activeRequest.vendor?.name || 'Pending Clinic Allocation';
            const statusLabel = activeRequest.status === client_1.RequestStatus.WAITING
                ? 'Queued for Clinic Allocation'
                : activeRequest.status === client_1.RequestStatus.SUBMITTED
                    ? 'Assigned to Clinic'
                    : 'Appointment Scheduled';
            return {
                isEligible: false,
                status: 'ACTIVE_REQUEST_PENDING',
                canRequest: false,
                message: `Active clearance request #${activeRequest.id} is already in progress (${statusLabel} at ${clinicName}). Duplicate request is blocked.`,
                activeRequest: {
                    requestId: activeRequest.id,
                    status: activeRequest.status,
                    statusLabel,
                    clinicName,
                    apptDate: activeRequest.apptDate,
                    createdAt: activeRequest.createdAt
                }
            };
        }
        // Find latest completed report for this employee & test
        const latestReport = await prisma_1.default.medicalReport.findFirst({
            where: {
                employeeId,
                testId,
                result: 'FIT'
            },
            orderBy: {
                testDate: 'desc'
            },
            include: {
                vendor: true
            }
        });
        if (!latestReport || !latestReport.validUntil) {
            return {
                isEligible: true,
                status: 'NO_PREVIOUS_RECORD',
                canRequest: true,
                message: 'No previous active clearance certificate on file. Employee is fully eligible for testing.'
            };
        }
        const now = new Date();
        const validUntil = new Date(latestReport.validUntil);
        const diffTime = validUntil.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
            return {
                isEligible: true,
                status: 'EXPIRED',
                canRequest: true,
                message: `Previous certificate expired on ${validUntil.toISOString().slice(0, 10)} (${Math.abs(diffDays)} days ago). Urgent renewal clearance required.`,
                previousReport: {
                    reportId: latestReport.id,
                    testDate: latestReport.testDate,
                    validUntil: latestReport.validUntil,
                    result: latestReport.result,
                    vendorName: latestReport.vendor.name
                }
            };
        }
        if (diffDays <= 30) {
            return {
                isEligible: true,
                status: 'EXPIRING_SOON',
                canRequest: true,
                message: `Current certificate expires in ${diffDays} days (${validUntil.toISOString().slice(0, 10)}). Eligible for 30-day advance renewal window.`,
                previousReport: {
                    reportId: latestReport.id,
                    testDate: latestReport.testDate,
                    validUntil: latestReport.validUntil,
                    result: latestReport.result,
                    vendorName: latestReport.vendor.name
                }
            };
        }
        // Active & valid > 30 days
        return {
            isEligible: false,
            status: 'ACTIVE_VALID',
            canRequest: false,
            message: `Employee holds an ACTIVE clearance certificate valid until ${validUntil.toISOString().slice(0, 10)} (${diffDays} days remaining). Test request is not necessary.`,
            previousReport: {
                reportId: latestReport.id,
                testDate: latestReport.testDate,
                validUntil: latestReport.validUntil,
                result: latestReport.result,
                vendorName: latestReport.vendor.name
            }
        };
    }
}
exports.EligibilityService = EligibilityService;
