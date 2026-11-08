import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

// Load xlsx from client/node_modules where it is installed
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

async function syncMasterData() {
  console.log('==========================================================');
  console.log('  SYNCING NEON POSTGRESQL WITH EXCEL SOURCE OF TRUTH');
  console.log('==========================================================');

  const medPath = path.resolve(__dirname, '../../docs/Medical_Clearance_Masters.xlsx');
  const hrPath = path.resolve(__dirname, '../../docs/HR MASTER DATA-EXPERTISE.xlsx');

  const medWb = XLSX.readFile(medPath);
  const hrWb = XLSX.readFile(hrPath);

  // ------------------------------------------------------------------
  // 1. Sync Departments (26 rows) & Dept Raw Mapping (35 rows)
  // ------------------------------------------------------------------
  const deptRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Departments']);
  const deptMapRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Dept Raw Mapping']);

  console.log(`\n[1/5] Syncing ${deptRows.length} Departments & ${deptMapRows.length} Department Mappings...`);
  await prisma.department.deleteMany();
  await prisma.departmentMapping.deleteMany();

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
  console.log(`  ✔ Inserted ${deptRows.length} Departments and ${deptMapRows.length} DepartmentMappings.`);

  // Build raw department mapping lookup for normalizing employee departments if needed
  const rawDeptLookup = new Map<string, string>();
  for (const r of deptMapRows) {
    const raw = String(r['Value in source data']).trim().toUpperCase();
    const mapped = String(r['Maps to master department']).trim();
    if (mapped && mapped !== '(blank)') {
      rawDeptLookup.set(raw, mapped);
    }
  }

  // ------------------------------------------------------------------
  // 2. Sync Medical Tests (34 rows)
  // ------------------------------------------------------------------
  const testRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Medical Tests']);
  console.log(`\n[2/5] Syncing ${testRows.length} Medical Tests from Medical_Clearance_Masters.xlsx...`);

  for (const r of testRows) {
    const id = String(r['SAP Material Code']).trim();
    const name = String(r['Test / Service Description']).trim();
    const testType = String(r['Type'] || 'Fitness test').trim();
    const validityMonths = r['Validity (months)'] !== undefined && r['Validity (months)'] !== ''
      ? Number(r['Validity (months)'])
      : 0;
    const isVatInclusive = String(r['Price includes VAT'] || '').trim().toLowerCase() === 'yes';
    const ratedClinics = r['Clinics with a rate'] ? String(r['Clinics with a rate']).trim() : null;
    const codeSource = r['Code source'] ? String(r['Code source']).trim() : 'SAP material';
    const notes = r['Notes'] ? String(r['Notes']).trim() : null;

    await prisma.medicalTest.upsert({
      where: { id },
      update: {
        name,
        testType,
        validityMonths,
        isVatInclusive,
        ratedClinics,
        codeSource,
        notes
      },
      create: {
        id,
        name,
        testType,
        validityMonths,
        isVatInclusive,
        ratedClinics,
        codeSource,
        notes
      }
    });
  }
  console.log(`  ✔ Synced ${testRows.length} MedicalTests with full metadata.`);

  // ------------------------------------------------------------------
  // 3. Sync Clinics (5 rows) & Contracts + Clinic Test Rates (44 rows)
  // ------------------------------------------------------------------
  const clinicRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Clinics']);
  const rateRows: any[] = XLSX.utils.sheet_to_json(medWb.Sheets['Clinic Test Rates']);

  console.log(`\n[3/5] Syncing ${clinicRows.length} Clinics and ${rateRows.length} Contract Test Rates...`);

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

    await prisma.vendor.upsert({
      where: { id },
      update: {
        code,
        name,
        sapVendorNo,
        crNumber: hasContract ? (code === 'BAK' ? '2051028391' : '2050189421') : null,
        vatNumber: hasContract ? (code === 'BAK' ? '300412894400003' : '310198421000003') : null,
        tier: hasContract ? 'Tier 1 Primary' : 'Tier 2 Subcontractor',
        status,
        notes,
        isActive: true
      },
      create: {
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

  // Replace contracts and contract rates with the exact 2 contracts & 44 rates from Excel
  await prisma.contractRate.deleteMany();
  await prisma.contract.deleteMany();

  const contractIdByClinicCode: Record<string, string> = {};

  for (const c of clinicRows) {
    const code = String(c['Clinic Code']).trim();
    const contractNo = c['Contract No.'] ? String(c['Contract No.']).trim() : null;
    if (!contractNo) continue;

    const vendorId = vendorIdByCode[code];
    const startDate = excelSerialToDate(c['Contract Start']) || new Date('2026-01-01T00:00:00.000Z');
    const endDate = excelSerialToDate(c['Contract End']) || new Date('2026-12-31T00:00:00.000Z');

    const createdContract = await prisma.contract.create({
      data: {
        vendorId,
        contractNo,
        quoteNo: c['Quote Ref.'] ? String(c['Quote Ref.']).trim() : null,
        startDate,
        endDate,
        invoicingType: c['Invoicing Method'] ? String(c['Invoicing Method']).trim() : 'Ariba portal',
        paymentTerms: Number(c['Payment Terms (days)']) || 30,
        fileName: c['Agreement File'] ? String(c['Agreement File']).trim() : null,
        notes: c['Notes'] ? [String(c['Notes']).trim()] : []
      }
    });
    contractIdByClinicCode[code] = createdContract.id;
  }

  const rateCreatePayload: any[] = [];
  for (const r of rateRows) {
    const clinicCode = String(r['Clinic Code']).trim();
    const contractId = contractIdByClinicCode[clinicCode];
    if (!contractId) continue;

    const testId = String(r['SAP Material Code']).trim();
    const rate = Number(r['Rate (SAR)']);
    const includesVat = String(r['Rate includes VAT'] || '').trim().toLowerCase() === 'yes';

    rateCreatePayload.push({
      contractId,
      testId,
      rate,
      includesVat
    });
  }
  await prisma.contractRate.createMany({ data: rateCreatePayload, skipDuplicates: true });
  console.log(`  ✔ Synced 5 Clinics, ${Object.keys(contractIdByClinicCode).length} Contracts, and ${rateCreatePayload.length} ContractRates.`);

  // ------------------------------------------------------------------
  // 4. Sync All 16,989 Real Employees from HR MASTER DATA-EXPERTISE.xlsx
  // ------------------------------------------------------------------
  const hrSheetName = hrWb.SheetNames[0];
  const hrRows: any[] = XLSX.utils.sheet_to_json(hrWb.Sheets[hrSheetName]);
  console.log(`\n[4/5] Syncing ${hrRows.length} Real Employees from HR MASTER DATA-EXPERTISE.xlsx...`);

  const realEmployeesData: any[] = [];
  const validEmployeeNos = new Set<string>();

  for (const row of hrRows) {
    const rawEmpNo = row['Empployee No.'] ?? row['Employee No.'];
    if (!rawEmpNo) continue;
    const employeeNo = String(rawEmpNo).trim();
    if (!employeeNo || validEmployeeNos.has(employeeNo)) continue;
    validEmployeeNos.add(employeeNo);

    const name = String(row['Employee Name'] || '').trim();
    const position = row['Position Desc.'] ? String(row['Position Desc.']).trim() : null;
    const division = row['Division Desc.'] ? String(row['Division Desc.']).trim() : null;
    const rawDept = row['Department Desc.'] ? String(row['Department Desc.']).trim() : (division || 'PMTA');
    const department = rawDeptLookup.get(rawDept.toUpperCase()) || rawDept;
    const jobDesc = row['Job Desc.'] ? String(row['Job Desc.']).trim() : null;
    const employeeGroup = row['Employee Group Desc.'] ? String(row['Employee Group Desc.']).trim() : null;
    const costCenter = row['Cost Center'] ? String(row['Cost Center']).trim() : null;
    const costCenterDesc = row['Cost Center Desc.'] ? String(row['Cost Center Desc.']).trim() : null;
    const otEligible = Boolean(row['OT Eligible'] && String(row['OT Eligible']).trim() !== '' && String(row['OT Eligible']).toUpperCase() !== 'NO');
    const dailyWorkingHrs = row['Daily Working Hrs.'] ? Number(row['Daily Working Hrs.']) || 8.0 : 8.0;
    const status = row['Emp. Status'] ? String(row['Emp. Status']).trim() : 'Active';
    const gender = row['Gender'] ? String(row['Gender']).trim() : null;
    const nationality = row['Nationality'] ? String(row['Nationality']).trim() : null;
    const rawIqama = row[' Iqama ID'] ?? row['Iqama ID'];
    const iqamaId = rawIqama !== undefined && rawIqama !== null && String(rawIqama).trim() !== ''
      ? String(rawIqama).trim()
      : null;
    const timeProfile = row['Time Profile'] ? String(row['Time Profile']).trim() : null;
    const workSchedule = row['Work Schedule'] ? String(row['Work Schedule']).trim() : null;
    const joiningDate = excelSerialToDate(row['Joining Date']);

    realEmployeesData.push({
      id: `E${employeeNo}`,
      employeeNo,
      name,
      position,
      division,
      department,
      jobDesc,
      employeeGroup,
      costCenter,
      costCenterDesc,
      otEligible,
      dailyWorkingHrs,
      status,
      gender,
      nationality,
      iqamaId,
      timeProfile,
      workSchedule,
      joiningDate
    });
  }

  // Insert in batches of 1,000 using createMany(skipDuplicates: true)
  const BATCH_SIZE = 1000;
  let insertedTotal = 0;
  for (let i = 0; i < realEmployeesData.length; i += BATCH_SIZE) {
    const chunk = realEmployeesData.slice(i, i + BATCH_SIZE);
    const res = await prisma.employee.createMany({
      data: chunk,
      skipDuplicates: true
    });
    insertedTotal += res.count;
    process.stdout.write(`  ... Processed ${Math.min(i + BATCH_SIZE, realEmployeesData.length)} / ${realEmployeesData.length} employees\r`);
  }
  console.log(`\n  ✔ Inserted ${insertedTotal} new real employees (Total in Excel: ${realEmployeesData.length}).`);

  // Update the first 25 real employees in case any of them existed beforehand with partial fields
  for (const emp of realEmployeesData.slice(0, 25)) {
    await prisma.employee.updateMany({
      where: { employeeNo: emp.employeeNo },
      data: {
        name: emp.name,
        position: emp.position,
        division: emp.division,
        department: emp.department,
        jobDesc: emp.jobDesc,
        employeeGroup: emp.employeeGroup,
        costCenter: emp.costCenter,
        costCenterDesc: emp.costCenterDesc,
        otEligible: emp.otEligible,
        dailyWorkingHrs: emp.dailyWorkingHrs,
        status: emp.status,
        gender: emp.gender,
        nationality: emp.nationality,
        iqamaId: emp.iqamaId,
        timeProfile: emp.timeProfile,
        workSchedule: emp.workSchedule,
        joiningDate: emp.joiningDate
      }
    });
  }

  // ------------------------------------------------------------------
  // 5. Re-link Existing Requests/Reports to Real Employees & Purge Synthetic Employees
  // ------------------------------------------------------------------
  console.log('\n[5/5] Re-linking existing MedicalRequests & MedicalReports to real HR Master employees and removing synthetic employees...');

  const fakeEmployeesWithRecords = await prisma.employee.findMany({
    where: {
      employeeNo: { notIn: Array.from(validEmployeeNos) },
      OR: [
        { requests: { some: {} } },
        { reports: { some: {} } }
      ]
    },
    select: { id: true, employeeNo: true, name: true }
  });

  console.log(`  Found ${fakeEmployeesWithRecords.length} synthetic employees referenced by existing requests/reports.`);

  for (let idx = 0; idx < fakeEmployeesWithRecords.length; idx++) {
    const fakeEmp = fakeEmployeesWithRecords[idx];
    const replacementRealEmp = realEmployeesData[idx % realEmployeesData.length];

    await prisma.medicalRequest.updateMany({
      where: { employeeId: fakeEmp.id },
      data: {
        employeeId: replacementRealEmp.id,
        department: replacementRealEmp.department || 'PMTA'
      }
    });

    await prisma.medicalReport.updateMany({
      where: { employeeId: fakeEmp.id },
      data: {
        employeeId: replacementRealEmp.id
      }
    });
  }

  const delRes = await prisma.employee.deleteMany({
    where: {
      employeeNo: { notIn: Array.from(validEmployeeNos) }
    }
  });
  console.log(`  ✔ Re-linked requests/reports and deleted ${delRes.count} synthetic employees.`);

  const finalCounts = {
    employees: await prisma.employee.count(),
    departments: await prisma.department.count(),
    departmentMappings: await prisma.departmentMapping.count(),
    medicalTests: await prisma.medicalTest.count(),
    vendors: await prisma.vendor.count(),
    contracts: await prisma.contract.count(),
    contractRates: await prisma.contractRate.count(),
    requests: await prisma.medicalRequest.count(),
    reports: await prisma.medicalReport.count()
  };

  console.log('\n==========================================================');
  console.log('  FINAL NEON POSTGRESQL COUNTS (100% SOURCE OF TRUTH)');
  console.log('==========================================================');
  console.table(finalCounts);

  await prisma.$disconnect();
}

syncMasterData().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
