import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';

// Load server/.env only as fallback; caller-provided DATABASE_URL env vars take precedence
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface MasterSnapshot {
  meta?: {
    exportedAt?: string;
    description?: string;
    counts?: Record<string, number>;
  };
  departments: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    cleanupNote: string | null;
  }>;
  departmentMappings: Array<{
    id: string;
    rawValue: string;
    masterCode: string;
    action: string;
  }>;
  vendors: Array<{
    id: string;
    code: string;
    name: string;
    sapVendorNo: string | null;
    crNumber: string | null;
    vatNumber: string | null;
    tier: string | null;
    saudization: number | null;
    status: string;
    notes: string | null;
    isActive: boolean;
  }>;
  medicalTests: Array<{
    id: string;
    name: string;
    testType: string;
    validityMonths: number;
    isVatInclusive: boolean;
    ratedClinics: string | null;
    codeSource: string | null;
    notes: string | null;
  }>;
  contracts: Array<{
    id: string;
    vendorId: string;
    contractNo: string;
    quoteNo: string | null;
    startDate: string;
    endDate: string;
    invoicingType: string;
    paymentTerms: number;
    fileName: string | null;
    notes: string[];
    createdAt: string;
  }>;
  contractRates: Array<{
    id: string;
    contractId: string;
    testId: string;
    rate: string | number;
    includesVat: boolean;
  }>;
  users: Array<{
    id: string;
    username: string;
    passwordHash: string;
    name: string;
    role: Role;
    vendorId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  employees: Array<{
    id: string;
    employeeNo: string;
    name: string;
    position: string | null;
    division: string | null;
    department: string | null;
    jobDesc: string | null;
    employeeGroup: string | null;
    costCenter: string | null;
    costCenterDesc: string | null;
    otEligible: boolean;
    dailyWorkingHrs: number;
    status: string;
    gender: string | null;
    nationality: string | null;
    iqamaId: string | null;
    timeProfile: string | null;
    workSchedule: string | null;
    joiningDate: string | null;
    hourlyRate: string | number | null;
    photoUrl: string | null;
    iqamaUrl: string | null;
    passportUrl: string | null;
  }>;
  systemSettings: Array<{
    id: string;
    slotExpiryDays: number;
    autoExpireSlots: boolean;
    slotExpiryBasis: string;
    autoArchiveCompleted: boolean;
    updatedBy: string;
    updatedAt: string;
  }>;
}

const prisma = new PrismaClient();

function loadSnapshot(): MasterSnapshot {
  const snapshotPath = path.resolve(__dirname, 'data/master_snapshot.json.gz');
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Master snapshot not found at ${snapshotPath}`);
  }
  const compressed = fs.readFileSync(snapshotPath);
  const json = zlib.gunzipSync(compressed).toString('utf8');
  return JSON.parse(json) as MasterSnapshot;
}

async function resetOperationalAndMasterTables() {
  if (process.env.ALLOW_DESTRUCTIVE_RESET !== 'true') {
    throw new Error(
      'Refusing --reset without ALLOW_DESTRUCTIVE_RESET=true environment variable.'
    );
  }
  console.log('Resetting operational and master tables...');
  await prisma.auditLog.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.medicalRequest.deleteMany();
  await prisma.slotAllocation.deleteMany();
  await prisma.slotRequest.deleteMany();
  await prisma.clinicSlot.deleteMany();
  await prisma.contractRate.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.medicalTest.deleteMany();
  await prisma.departmentMapping.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.systemSetting.deleteMany();
}

async function main() {
  const shouldReset = process.argv.includes('--reset');
  if (shouldReset) {
    await resetOperationalAndMasterTables();
  }

  const snapshot = loadSnapshot();
  console.log('Importing master-only data (no requests, reports, slots, or invoices)...');

  // 1. Departments & Department Mappings
  const deptRes = await prisma.department.createMany({
    data: snapshot.departments,
    skipDuplicates: true,
  });

  const deptMapRes = await prisma.departmentMapping.createMany({
    data: snapshot.departmentMappings,
    skipDuplicates: true,
  });

  // 2. Clinics (Vendors)
  const vendorRes = await prisma.vendor.createMany({
    data: snapshot.vendors,
    skipDuplicates: true,
  });

  // 3. Medical Tests
  const testRes = await prisma.medicalTest.createMany({
    data: snapshot.medicalTests,
    skipDuplicates: true,
  });

  // 4. Contracts & Contract Rates
  const contractRes = await prisma.contract.createMany({
    data: snapshot.contracts.map((c) => ({
      ...c,
      startDate: new Date(c.startDate),
      endDate: new Date(c.endDate),
      createdAt: new Date(c.createdAt),
    })),
    skipDuplicates: true,
  });

  const rateRes = await prisma.contractRate.createMany({
    data: snapshot.contractRates.map((r) => ({
      ...r,
      rate: Number(r.rate),
    })),
    skipDuplicates: true,
  });

  // 5. System Users (Admin, HR, Requester, Central, Finance, Clinic accounts)
  const userRes = await prisma.user.createMany({
    data: snapshot.users.map((u) => ({
      ...u,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.updatedAt),
    })),
    skipDuplicates: true,
  });

  // 6. HR Master Employee Directory (chunked batches of 1000)
  let employeesInserted = 0;
  const BATCH_SIZE = 1000;
  for (let i = 0; i < snapshot.employees.length; i += BATCH_SIZE) {
    const batch = snapshot.employees.slice(i, i + BATCH_SIZE).map((e) => ({
      ...e,
      joiningDate: e.joiningDate ? new Date(e.joiningDate) : null,
      hourlyRate: e.hourlyRate !== null && e.hourlyRate !== undefined ? Number(e.hourlyRate) : null,
    }));
    const res = await prisma.employee.createMany({
      data: batch,
      skipDuplicates: true,
    });
    employeesInserted += res.count;
  }

  // 7. System Settings
  const settingsData =
    snapshot.systemSettings.length > 0
      ? snapshot.systemSettings.map((s) => ({
          id: s.id,
          slotExpiryDays: s.slotExpiryDays,
          autoExpireSlots: s.autoExpireSlots,
          slotExpiryBasis: s.slotExpiryBasis,
          autoArchiveCompleted: s.autoArchiveCompleted,
          updatedBy: s.updatedBy,
        }))
      : [
          {
            id: 'SYSTEM_DEFAULT',
            slotExpiryDays: 7,
            autoExpireSlots: true,
            slotExpiryBasis: 'CREATED_DATE',
            autoArchiveCompleted: true,
            updatedBy: 'System Default',
          },
        ];

  const settingRes = await prisma.systemSetting.createMany({
    data: settingsData,
    skipDuplicates: true,
  });

  console.log('Master-only seed complete:', {
    departmentsInserted: deptRes.count,
    departmentMappingsInserted: deptMapRes.count,
    vendorsInserted: vendorRes.count,
    medicalTestsInserted: testRes.count,
    contractsInserted: contractRes.count,
    contractRatesInserted: rateRes.count,
    usersInserted: userRes.count,
    employeesInserted,
    systemSettingsInserted: settingRes.count,
  });
}

main()
  .catch((e) => {
    console.error('Master seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
