import prisma from '../prisma';
import { RequestStatus } from '@prisma/client';

export interface EligibilityResult {
  isEligible: boolean;
  status: 'NO_PREVIOUS_RECORD' | 'ACTIVE_VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'ACTIVE_REQUEST_PENDING';
  canRequest: boolean;
  message: string;
  activeRequest?: {
    requestId: string;
    status: RequestStatus;
    statusLabel: string;
    clinicName: string;
    apptDate: Date | null;
    createdAt: Date;
  };
  previousReport?: {
    reportId: string;
    testDate: Date;
    validUntil: Date | null;
    result: string;
    vendorName: string;
  };
}

export class EligibilityService {
  static async check(employeeId: string, testId: string): Promise<EligibilityResult> {
    const test = await prisma.medicalTest.findUnique({
      where: { id: testId }
    });

    if (!test) {
      throw new Error(`Invalid medical test ID: ${testId}`);
    }

    // 1. Check for active in-flight request for this employee & test
    const activeRequest = await prisma.medicalRequest.findFirst({
      where: {
        employeeId,
        testId,
        status: { in: [RequestStatus.WAITING, RequestStatus.SUBMITTED, RequestStatus.SCHEDULED] }
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
      const statusLabel = activeRequest.status === RequestStatus.WAITING
        ? 'Queued for Clinic Allocation'
        : activeRequest.status === RequestStatus.SUBMITTED
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
    const latestReport = await prisma.medicalReport.findFirst({
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
