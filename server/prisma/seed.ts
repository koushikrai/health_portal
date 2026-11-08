import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient, Role, RequestStatus, ReportResult, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
  console.error('CRITICAL: Refusing to seed default accounts into production database.');
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require(path.resolve(__dirname, '../../client/node_modules/xlsx'));

const prisma = new PrismaClient();

function excelSerialToDate(serial: any): Date | null {
  if (!serial) return null;
  const num = Number(serial);
  if (isNaN(num) || num <= 0) return null;
  const utcDays = Math.floor(num - 25569);
  return new Date(utcDays * 86400 * 1000);
}

async function main() {
  console.log('Seeding database from official Excel Master files...');

  const medPath = path.resolve(__dirname, '../../docs/Medical_Clearance_Masters.xlsx');
  const hrPath = path.resolve(__dirname, '../../docs/HR MASTER DATA-EXPERTISE.xlsx');

  const medWb = XLSX.readFile(medPath);
  const hrWb = XLSX.readFile(hrPath);

  // Clean existing operational data
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
  await prisma.department.deleteMany();
  await prisma.departmentMapping.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();

  // 1. Seed Departments (26) & Department Mappings (35) from Medical_Clearance_Masters.xlsx
  const deptRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Departments']);
  const deptMapRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Dept Raw Mapping']);

  await prisma.department.createMany({
    data: deptRows.map((r: any) => ({
      id: String(r['Dept ID']).trim(),
      code: String(r['Department Code / Name']).trim(),
      name: String(r['Department Code / Name']).trim(),
      status: String(r['Status'] || 'Active').trim(),
      cleanupNote: r['Cleanup note'] ? String(r['Cleanup note']).trim() : null
    }))
  });

  await prisma.departmentMapping.createMany({
    data: deptMapRows.map((r: any) => ({
      rawValue: String(r['Value in source data']).trim(),
      masterCode: String(r['Maps to master department']).trim(),
      action: String(r['Action'] || '').trim()
    }))
  });

  const rawDeptLookup = new Map<string, string>();
  for (const r of deptMapRows) {
    const raw = String(r['Value in source data']).trim().toUpperCase();
    const mapped = String(r['Maps to master department']).trim();
    if (mapped && mapped !== '(blank)') {
      rawDeptLookup.set(raw, mapped);
    }
  }

  // 2. Seed Clinics (5) from Medical_Clearance_Masters.xlsx
  const clinicRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Clinics']);
  const vendorIdByCode: Record<string, string> = {
    BAK: 'V1',
    GAMC: 'V2',
    JMC: 'V3',
    ARZ: 'V4',
    DINA: 'V5'
  };

  for (const c of clinicRows) {
    const code = String(c['Clinic Code']).trim();
    const id = vendorIdByCode[code] || code;
    const name = String(c['Clinic Name']).trim();
    const sapVendorNo = c['SAP Vendor No.'] ? String(c['SAP Vendor No.']).trim() : null;
    const status = c['Status'] ? String(c['Status']).trim() : 'No contract / rates loaded';
    const notes = c['Notes'] ? String(c['Notes']).trim() : null;
    const hasContract = Boolean(c['Contract No.']);

    await prisma.vendor.create({
      data: {
        id,
        code,
        name,
        sapVendorNo,
        crNumber: hasContract ? (code === 'BAK' ? '2051028391' : '2050189421') : null,
        vatNumber: hasContract ? (code === 'BAK' ? '300412894400003' : '310198421000003') : null,
        tier: hasContract ? 'Tier 1 Primary' : 'Tier 2 Subcontractor',
        status,
        notes,
        isActive: true
      }
    });
  }

  // 3. Seed Medical Tests (34) from Medical_Clearance_Masters.xlsx
  const testRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Medical Tests']);
  await prisma.medicalTest.createMany({
    data: testRows.map((r: any) => ({
      id: String(r['SAP Material Code']).trim(),
      name: String(r['Test / Service Description']).trim(),
      testType: String(r['Type'] || 'Fitness test').trim(),
      validityMonths: r['Validity (months)'] !== undefined && r['Validity (months)'] !== ''
        ? Number(r['Validity (months)'])
        : 0,
      isVatInclusive: String(r['Price includes VAT'] || '').trim().toLowerCase() === 'yes',
      ratedClinics: r['Clinics with a rate'] ? String(r['Clinics with a rate']).trim() : null,
      codeSource: r['Code source'] ? String(r['Code source']).trim() : 'SAP material',
      notes: r['Notes'] ? String(r['Notes']).trim() : null
    }))
  });

  // 4. Seed Contracts (2) & Contract Rates (44) from Medical_Clearance_Masters.xlsx
  const contractIdByClinicCode: Record<string, string> = {};
  for (const c of clinicRows) {
    const code = String(c['Clinic Code']).trim();
    const contractNo = c['Contract No.'] ? String(c['Contract No.']).trim() : null;
    if (!contractNo) continue;

    const createdContract = await prisma.contract.create({
      data: {
        vendorId: vendorIdByCode[code],
        contractNo,
        quoteNo: c['Quote Ref.'] ? String(c['Quote Ref.']).trim() : null,
        startDate: excelSerialToDate(c['Contract Start']) || new Date('2026-01-01T00:00:00.000Z'),
        endDate: excelSerialToDate(c['Contract End']) || new Date('2026-12-31T00:00:00.000Z'),
        invoicingType: c['Invoicing Method'] ? String(c['Invoicing Method']).trim() : 'Ariba portal',
        paymentTerms: Number(c['Payment Terms (days)']) || 30,
        fileName: c['Agreement File'] ? String(c['Agreement File']).trim() : null,
        notes: c['Notes'] ? [String(c['Notes']).trim()] : []
      }
    });
    contractIdByClinicCode[code] = createdContract.id;
  }

  const rateRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Clinic Test Rates']);
  await prisma.contractRate.createMany({
    data: rateRows
      .filter((r: any) => Boolean(contractIdByClinicCode[String(r['Clinic Code']).trim()]))
      .map((r: any) => ({
        contractId: contractIdByClinicCode[String(r['Clinic Code']).trim()],
        testId: String(r['SAP Material Code']).trim(),
        rate: Number(r['Rate (SAR)']),
        includesVat: String(r['Rate includes VAT'] || '').trim().toLowerCase() === 'yes'
      }))
  });

  // 5. Seed Users
  const defaultPw = process.env.SEED_USER_PASSWORD || 'Exp@2026';
  const defaultAdminPw = process.env.SEED_ADMIN_PASSWORD || 'Admin@2026';
  const pwHash = await bcrypt.hash(defaultPw, 10);
  const adminHash = await bcrypt.hash(defaultAdminPw, 10);

  const usersData = [
    { username: 'hr', name: 'Marcus Sterling', role: Role.HR, passwordHash: pwHash },
    { username: 'requester', name: 'HSE Coordinator', role: Role.REQUESTER, passwordHash: pwHash },
    { username: 'central', name: 'Central Medical Team', role: Role.CENTRAL, passwordHash: pwHash },
    { username: 'finance', name: 'Finance Controller', role: Role.FINANCE, passwordHash: pwHash },
    { username: 'admin', name: 'System Administrator', role: Role.ADMIN, passwordHash: adminHash },
    { username: 'badr', name: 'Badr Al Khaleej Admin', role: Role.CLINIC, vendorId: 'V1', passwordHash: pwHash },
    { username: 'gulfasian', name: 'Gulf Asian Clinic Desk', role: Role.CLINIC, vendorId: 'V2', passwordHash: pwHash },
    { username: 'jubail', name: 'JMC Coordinator', role: Role.CLINIC, vendorId: 'V3', passwordHash: pwHash },
    { username: 'arrazi', name: 'Arrazi Reception', role: Role.CLINIC, vendorId: 'V4', passwordHash: pwHash },
    { username: 'dina', name: 'Dina Health Clinic', role: Role.CLINIC, vendorId: 'V5', passwordHash: pwHash }
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }

  // 6. Seed Real Employees (16,989) from HR MASTER DATA-EXPERTISE.xlsx
  const hrRows: any[] = XLSX.utils.sheet_to_json(hrWb.Sheets[hrWb.SheetNames[0]]);
  const seenEmpNos = new Set<string>();
  const employeesPayload: any[] = [];

  for (const row of hrRows) {
    const rawEmpNo = row['Empployee No.'] ?? row['Employee No.'];
    if (!rawEmpNo) continue;
    const employeeNo = String(rawEmpNo).trim();
    if (!employeeNo || seenEmpNos.has(employeeNo)) continue;
    seenEmpNos.add(employeeNo);

    const division = row['Division Desc.'] ? String(row['Division Desc.']).trim() : null;
    const rawDept = row['Department Desc.'] ? String(row['Department Desc.']).trim() : (division || 'PMTA');
    const department = rawDeptLookup.get(rawDept.toUpperCase()) || rawDept;
    const rawIqama = row[' Iqama ID'] ?? row['Iqama ID'];

    employeesPayload.push({
      id: `E${employeeNo}`,
      employeeNo,
      name: String(row['Employee Name'] || '').trim(),
      position: row['Position Desc.'] ? String(row['Position Desc.']).trim() : null,
      division,
      department,
      jobDesc: row['Job Desc.'] ? String(row['Job Desc.']).trim() : null,
      employeeGroup: row['Employee Group Desc.'] ? String(row['Employee Group Desc.']).trim() : null,
      costCenter: row['Cost Center'] ? String(row['Cost Center']).trim() : null,
      costCenterDesc: row['Cost Center Desc.'] ? String(row['Cost Center Desc.']).trim() : null,
      otEligible: Boolean(row['OT Eligible'] && String(row['OT Eligible']).trim() !== '' && String(row['OT Eligible']).toUpperCase() !== 'NO'),
      dailyWorkingHrs: row['Daily Working Hrs.'] ? Number(row['Daily Working Hrs.']) || 8.0 : 8.0,
      status: row['Emp. Status'] ? String(row['Emp. Status']).trim() : 'Active',
      gender: row['Gender'] ? String(row['Gender']).trim() : null,
      nationality: row['Nationality'] ? String(row['Nationality']).trim() : null,
      iqamaId: rawIqama !== undefined && rawIqama !== null && String(rawIqama).trim() !== '' ? String(rawIqama).trim() : null,
      timeProfile: row['Time Profile'] ? String(row['Time Profile']).trim() : null,
      workSchedule: row['Work Schedule'] ? String(row['Work Schedule']).trim() : null,
      joiningDate: excelSerialToDate(row['Joining Date'])
    });
  }

  for (let i = 0; i < employeesPayload.length; i += 1000) {
    await prisma.employee.createMany({
      data: employeesPayload.slice(i, i + 1000),
      skipDuplicates: true
    });
  }

  // 7. Seed Clinic Capacity Slots & Sample Requests linked to Real Employees
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const slotGamc = await prisma.clinicSlot.create({
    data: { vendorId: 'V2', totalCapacity: 75, startDate: now, endDate: twoWeeksLater }
  });

  const slotBak = await prisma.clinicSlot.create({
    data: { vendorId: 'V1', totalCapacity: 25, startDate: now, endDate: twoWeeksLater }
  });

  const req1 = await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0101',
      employeeId: 'E11000008',
      testId: '5004955',
      vendorId: 'V2',
      slotId: slotGamc.id,
      department: 'PMTA',
      status: RequestStatus.COMPLETED,
      needByDate: new Date('2026-11-05'),
      apptDate: new Date('2026-10-25'),
      note: 'Turnaround clearance for Sadara deployment'
    }
  });

  await prisma.medicalReport.create({
    data: {
      id: 'REP-0081',
      requestId: req1.id,
      employeeId: 'E11000008',
      testId: '5004955',
      vendorId: 'V2',
      result: ReportResult.FIT,
      testDate: new Date('2026-10-25'),
      validUntil: new Date('2027-10-25'),
      remarks: 'Cardiopulmonary clear. Full visual acuity 20/20. Audiometry normal.'
    }
  });

  await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0102',
      employeeId: 'E11000012',
      testId: '5004959',
      vendorId: 'V1',
      slotId: slotBak.id,
      department: 'E&I',
      status: RequestStatus.SCHEDULED,
      needByDate: new Date('2026-11-10'),
      apptDate: new Date('2026-11-02'),
      note: 'SABIC TSH mandatory check'
    }
  });

  await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0103',
      employeeId: 'E11000015',
      testId: '5004964',
      department: 'CIVIL',
      status: RequestStatus.WAITING,
      needByDate: new Date('2026-11-08'),
      note: 'Urgent turnaround gate clearance'
    }
  });

  await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0104',
      employeeId: 'E11000016',
      testId: '5004956',
      department: 'MAINTENANCE',
      status: RequestStatus.WAITING,
      needByDate: new Date('2026-11-12'),
      note: 'Annual resident renewal'
    }
  });

  const req2 = await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0105',
      employeeId: 'E11000017',
      testId: '5004981',
      vendorId: 'V1',
      slotId: slotBak.id,
      department: 'PMTA',
      status: RequestStatus.COMPLETED,
      needByDate: new Date('2026-10-20'),
      apptDate: new Date('2026-10-18'),
      note: 'Refinery shutdown support'
    }
  });

  await prisma.medicalReport.create({
    data: {
      id: 'REP-0082',
      requestId: req2.id,
      employeeId: 'E11000017',
      testId: '5004981',
      vendorId: 'V1',
      result: ReportResult.FIT,
      testDate: new Date('2026-10-18'),
      validUntil: new Date('2027-10-18'),
      remarks: 'Fit for hot work & refinery confined space entry.'
    }
  });

  const inv = await prisma.invoice.create({
    data: {
      id: 'INV-0031',
      invoiceNo: 'GAMC-2026-089',
      vendorId: 'V2',
      invoiceDate: new Date('2026-10-26'),
      subtotal: 152.00,
      vatAmount: 22.80,
      totalAmount: 174.80,
      status: InvoiceStatus.SUBMITTED,
      fileUrl: 'GAMC-2026-089.pdf'
    }
  });

  await prisma.invoiceLineItem.create({
    data: {
      invoiceId: inv.id,
      requestId: req1.id,
      contractRate: 152.00,
      billedRate: 152.00
    }
  });

  console.log('Seed completed successfully from Excel source-of-truth files!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
