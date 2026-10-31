import { PrismaClient, Role, RequestStatus, ReportResult, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const VENDORS = [
  { id: 'V1', name: 'Badr Al Khaleej Polyclinic Co.', code: 'BAK', sapVendorNo: '1001502', crNumber: '2051028391', vatNumber: '300412894400003', tier: 'Tier 1 Primary', saudization: 42.5 },
  { id: 'V2', name: 'Gulf Asian Medical Centre', code: 'GAMC', sapVendorNo: '1001238', crNumber: '2050189421', vatNumber: '310198421000003', tier: 'Tier 1 Primary', saudization: 36.8 },
  { id: 'V3', name: 'Jubail Medical Center', code: 'JMC', sapVendorNo: '1001409', crNumber: '2055001243', vatNumber: '300184719200003', tier: 'Tier 2 Subcontractor', saudization: 34.2 },
  { id: 'V4', name: 'Arrazi Medical Center', code: 'ARZ', sapVendorNo: '1001672', crNumber: '2050084319', vatNumber: '301984201800003', tier: 'Tier 2 Subcontractor', saudization: 45.0 },
  { id: 'V5', name: 'Dina Medical Center', code: 'DINA', sapVendorNo: '1001889', crNumber: '2050042188', vatNumber: '302001948200003', tier: 'Tier 2 Subcontractor', saudization: 31.0 }
];

const TESTS: Array<[string, string, number, boolean?]> = [
  
 ['5004955','Sadara medical test',12],['5004959','SABIC medical screening with TSH',12],['5004964','PetroKemya N/S medical test with TSH',12],
 ['5004977','SAFCO medical test',12],['5004976','Sharq medical test',12],['5004972','Yanpet medical test',12],['5004973','Yansab medical test',12],
 ['5004979','Hadeed medical test',12],['5004975','CPP medical test',12],['5004978','Amiral medical test',12],['5004981','SATORP medical test',12],
 ['5004958',"Ma'aden medical test (PSA above 40)",12],['5004963','Saipem medical test',12],['5004974','Bahrain medical test',12],
 ['5004985','Pre-employment Kemya / SAFCO / SABIC',12],['5004970','Pre-employment, Saudi only',12],['5004971','Pre-employment, non-Saudi',12],
 ['5004965','General medical fitness',12],['5004961','Aramco driver medical',12],['5004966','Driving licence medical',12],
 ['5004956','Iqama medical check-up',12],['5004984','Food handling / RC, Baladiya',12],
 ['5004968','Meningitis B vaccine, food handler',0],['5004967','Blood grouping for ID',0],['5004980','ID front page renewal',0],
 ['5004962','Online charges for Baladiya',0],['5004987','Online charges',0],['5004983','Medical consultation',0],
 ['5004988','Specialist consultation',0],['5004986','PCR swab (price includes VAT)',0,true],
 ['X-PREEMP','Pre-employment medical (type not recorded)',12],['X-ECG','ECG test',12],['X-MEDTEST','Medical test (type not recorded)',12],['X-AIRP','Air Products medical',12]

];

const RATES_BAK: Record<string, number> = {'5004955':185,'5004959':110,'5004961':40,'5004977':110,'5004964':110,'5004976':110,'5004965':23,'5004956':50,'5004966':35,'5004962':55,'5004967':7,'5004978':85,'5004972':75,'5004973':75,'5004979':110,'5004975':140,'5004970':80,'5004971':23,'5004968':145,'5004974':130,'5004980':35,'5004981':25};
const RATES_GAMC: Record<string, number> = {'5004983':20,'5004988':30,'5004956':40,'5004968':125,'5004986':56,'5004967':7,'5004966':24,'5004970':64,'5004985':24,'5004961':40,'5004984':48,'5004959':99,'5004955':152,'5004958':240,'5004963':120,'5004972':64,'5004973':64,'5004975':116,'5004974':99,'5004987':8,'5004962':64,'5004965':24};

const SEED_EMPLOYEES = [
  {
    "id": "H0",
    "badgeNo": "90000001",
    "name": "Employee 00001",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 32.5
  },
  {
    "id": "H1",
    "badgeNo": "90000002",
    "name": "Employee 00002",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 36.5
  },
  {
    "id": "H2",
    "badgeNo": "90000003",
    "name": "Employee 00003",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 40.5
  },
  {
    "id": "H3",
    "badgeNo": "90000004",
    "name": "Employee 00004",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 44.5
  },
  {
    "id": "H4",
    "badgeNo": "90000005",
    "name": "Employee 00005",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 48.5
  },
  {
    "id": "H5",
    "badgeNo": "90000006",
    "name": "Employee 00006",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 32.5
  },
  {
    "id": "H6",
    "badgeNo": "90000007",
    "name": "Employee 00007",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 36.5
  },
  {
    "id": "H7",
    "badgeNo": "90000008",
    "name": "Employee 00008",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 40.5
  },
  {
    "id": "H8",
    "badgeNo": "90000009",
    "name": "Employee 00009",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 44.5
  },
  {
    "id": "H9",
    "badgeNo": "90000010",
    "name": "Employee 00010",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 48.5
  },
  {
    "id": "H10",
    "badgeNo": "90000011",
    "name": "Employee 00011",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 32.5
  },
  {
    "id": "H11",
    "badgeNo": "90000012",
    "name": "Employee 00012",
    "trade": "RSD",
    "department": "RSD",
    "hourlyRate": 36.5
  },
  {
    "id": "H12",
    "badgeNo": "90000013",
    "name": "Employee 00013",
    "trade": "RSD",
    "department": "RSD",
    "hourlyRate": 40.5
  },
  {
    "id": "H13",
    "badgeNo": "90000014",
    "name": "Employee 00014",
    "trade": "TSSD",
    "department": "TSSD",
    "hourlyRate": 44.5
  },
  {
    "id": "H14",
    "badgeNo": "90000015",
    "name": "Employee 00015",
    "trade": "TSSD",
    "department": "TSSD",
    "hourlyRate": 48.5
  },
  {
    "id": "H15",
    "badgeNo": "90000016",
    "name": "Employee 00016",
    "trade": "CIVIL",
    "department": "CIVIL",
    "hourlyRate": 32.5
  },
  {
    "id": "H16",
    "badgeNo": "90000017",
    "name": "Employee 00017",
    "trade": "CIVIL",
    "department": "CIVIL",
    "hourlyRate": 36.5
  },
  {
    "id": "H17",
    "badgeNo": "90000018",
    "name": "Employee 00018",
    "trade": "PAD",
    "department": "PAD",
    "hourlyRate": 40.5
  },
  {
    "id": "H18",
    "badgeNo": "90000019",
    "name": "Employee 00019",
    "trade": "PAD",
    "department": "PAD",
    "hourlyRate": 44.5
  },
  {
    "id": "H19",
    "badgeNo": "90000020",
    "name": "Employee 00020",
    "trade": "PAD",
    "department": "PAD",
    "hourlyRate": 48.5
  },
  {
    "id": "H20",
    "badgeNo": "90000021",
    "name": "Employee 00021",
    "trade": "PAD",
    "department": "PAD",
    "hourlyRate": 32.5
  },
  {
    "id": "H21",
    "badgeNo": "90000022",
    "name": "Employee 00022",
    "trade": "PAD",
    "department": "PAD",
    "hourlyRate": 36.5
  },
  {
    "id": "H22",
    "badgeNo": "90000023",
    "name": "Employee 00023",
    "trade": "TSSD",
    "department": "TSSD",
    "hourlyRate": 40.5
  },
  {
    "id": "H23",
    "badgeNo": "90000024",
    "name": "Employee 00024",
    "trade": "PAD",
    "department": "PAD",
    "hourlyRate": 44.5
  },
  {
    "id": "H24",
    "badgeNo": "90000025",
    "name": "Employee 00025",
    "trade": "CIVIL",
    "department": "CIVIL",
    "hourlyRate": 48.5
  },
  {
    "id": "H25",
    "badgeNo": "90000026",
    "name": "Employee 00026",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 32.5
  },
  {
    "id": "H26",
    "badgeNo": "90000027",
    "name": "Employee 00027",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 36.5
  },
  {
    "id": "H27",
    "badgeNo": "90000028",
    "name": "Employee 00028",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 40.5
  },
  {
    "id": "H28",
    "badgeNo": "90000029",
    "name": "Employee 00029",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 44.5
  },
  {
    "id": "H29",
    "badgeNo": "90000030",
    "name": "Employee 00030",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 48.5
  },
  {
    "id": "H30",
    "badgeNo": "90000031",
    "name": "Employee 00031",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 32.5
  },
  {
    "id": "H31",
    "badgeNo": "90000032",
    "name": "Employee 00032",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 36.5
  },
  {
    "id": "H32",
    "badgeNo": "90000033",
    "name": "Employee 00033",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 40.5
  },
  {
    "id": "H33",
    "badgeNo": "90000034",
    "name": "Employee 00034",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 44.5
  },
  {
    "id": "H34",
    "badgeNo": "90000035",
    "name": "Employee 00035",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 48.5
  },
  {
    "id": "H35",
    "badgeNo": "90000036",
    "name": "Employee 00036",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 32.5
  },
  {
    "id": "H36",
    "badgeNo": "90000037",
    "name": "Employee 00037",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 36.5
  },
  {
    "id": "H37",
    "badgeNo": "90000038",
    "name": "Employee 00038",
    "trade": "PSD",
    "department": "PSD",
    "hourlyRate": 40.5
  },
  {
    "id": "H38",
    "badgeNo": "90000039",
    "name": "Employee 00039",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 44.5
  },
  {
    "id": "H39",
    "badgeNo": "90000040",
    "name": "Employee 00040",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 48.5
  },
  {
    "id": "H40",
    "badgeNo": "90000041",
    "name": "Employee 00041",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 32.5
  },
  {
    "id": "H41",
    "badgeNo": "90000042",
    "name": "Employee 00042",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 36.5
  },
  {
    "id": "H42",
    "badgeNo": "90000043",
    "name": "Employee 00043",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 40.5
  },
  {
    "id": "H43",
    "badgeNo": "90000044",
    "name": "Employee 00044",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 44.5
  },
  {
    "id": "H44",
    "badgeNo": "90000045",
    "name": "Employee 00045",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 48.5
  },
  {
    "id": "H45",
    "badgeNo": "90000046",
    "name": "Employee 00046",
    "trade": "PMTA",
    "department": "PMTA",
    "hourlyRate": 32.5
  },
  {
    "id": "H46",
    "badgeNo": "90000047",
    "name": "Employee 00047",
    "trade": "PAD",
    "department": "PAD",
    "hourlyRate": 36.5
  },
  {
    "id": "H47",
    "badgeNo": "90000048",
    "name": "Employee 00048",
    "trade": "CIVIL",
    "department": "CIVIL",
    "hourlyRate": 40.5
  },
  {
    "id": "H48",
    "badgeNo": "90000049",
    "name": "Employee 00049",
    "trade": "CIVIL",
    "department": "CIVIL",
    "hourlyRate": 44.5
  },
  {
    "id": "H49",
    "badgeNo": "90000050",
    "name": "Employee 00050",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 48.5
  },
  {
    "id": "H50",
    "badgeNo": "90000051",
    "name": "Employee 00051",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 32.5
  },
  {
    "id": "H51",
    "badgeNo": "90000052",
    "name": "Employee 00052",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 36.5
  },
  {
    "id": "H52",
    "badgeNo": "90000053",
    "name": "Employee 00053",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 40.5
  },
  {
    "id": "H53",
    "badgeNo": "90000054",
    "name": "Employee 00054",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 44.5
  },
  {
    "id": "H54",
    "badgeNo": "90000055",
    "name": "Employee 00055",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 48.5
  },
  {
    "id": "H55",
    "badgeNo": "90000056",
    "name": "Employee 00056",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 32.5
  },
  {
    "id": "H56",
    "badgeNo": "90000057",
    "name": "Employee 00057",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 36.5
  },
  {
    "id": "H57",
    "badgeNo": "90000058",
    "name": "Employee 00058",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 40.5
  },
  {
    "id": "H58",
    "badgeNo": "90000059",
    "name": "Employee 00059",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 44.5
  },
  {
    "id": "H59",
    "badgeNo": "90000060",
    "name": "Employee 00060",
    "trade": "ISSD",
    "department": "ISSD",
    "hourlyRate": 48.5
  }
];

async function main() {
  console.log('Seeding database for Expertise Medical Clearance Portal...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.medicalRequest.deleteMany();
  await prisma.clinicSlot.deleteMany();
  await prisma.contractRate.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.medicalTest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();

  // 1. Seed Vendors
  console.log('Seeding vendors...');
  for (const v of VENDORS) {
    await prisma.vendor.create({ data: v });
  }

  // 2. Seed Medical Tests
  console.log('Seeding medical tests...');
  for (const [id, name, months, vatIncl] of TESTS) {
    await prisma.medicalTest.create({
      data: {
        id,
        name,
        validityMonths: months,
        isVatInclusive: !!vatIncl
      }
    });
  }

  // 3. Seed Users
  console.log('Seeding users...');
  const pwHash = await bcrypt.hash('Exp@2026', 10);
  const adminHash = await bcrypt.hash('Admin@2026', 10);

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

  // 4. Seed Contracts & Rates
  console.log('Seeding contracts...');
  const c1 = await prisma.contract.create({
    data: {
      vendorId: 'V1',
      contractNo: '4620000325',
      quoteNo: 'QT25/11/040',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      invoicingType: 'Ariba portal',
      paymentTerms: 30,
      fileName: 'BADR_ALKHALEEJ_AGREEMENT.pdf',
      notes: ['Price schedule lists material 5004964 twice. SAR 110.00 standard rate applies.']
    }
  });

  for (const [testId, rate] of Object.entries(RATES_BAK)) {
    await prisma.contractRate.create({
      data: {
        contractId: c1.id,
        testId,
        rate
      }
    });
  }

  const c2 = await prisma.contract.create({
    data: {
      vendorId: 'V2',
      contractNo: '4620000329',
      quoteNo: 'QT-GAMC-2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      invoicingType: 'E-invoice email',
      paymentTerms: 30,
      fileName: 'GULF_ASIA_CONTRACT.pdf',
      notes: ['PCR swab (5004986) price includes VAT.']
    }
  });

  for (const [testId, rate] of Object.entries(RATES_GAMC)) {
    await prisma.contractRate.create({
      data: {
        contractId: c2.id,
        testId,
        rate
      }
    });
  }

  // 5. Seed Employees
  console.log('Seeding employees...');
  for (const e of SEED_EMPLOYEES) {
    await prisma.employee.create({
      data: {
        id: e.id,
        employeeNo: e.badgeNo || ('EMP-' + e.id),
        name: e.name,
        position: e.trade || 'Technician',
        department: e.department,
        hourlyRate: e.hourlyRate
      }
    });
  }

  
  const ECC_TEST_EMPLOYEES = [
    { id: 'E11000008', employeeNo: '11000008', name: 'Abdul Aziz Sulaiman', position: 'Manager', division: 'Trns & Lgst Dep', department: 'Trns & Lgst Dep', iqamaId: '2117017034', costCenter: '0010000401', status: 'Active' },
    { id: 'E11000016', employeeNo: '11000016', name: 'Dasan Dewasam', position: 'Superintendent Mechanical', division: 'Project Service', department: 'Project Service', iqamaId: '2239993609', costCenter: '0010000402', status: 'Active' },
    { id: 'E11000012', employeeNo: '11000012', name: 'Hamza Baglody', position: 'Manager Collection', division: 'Finance Dept', department: 'Finance Dept', iqamaId: '2271079853', costCenter: '0010000403', status: 'Active' },
    { id: 'E11000017', employeeNo: '11000017', name: 'Jayakrishnan Akkuthparambil', position: 'Assistant Supervisor', division: 'Project Service', department: 'Project Service', iqamaId: '2396643369', costCenter: '0010000404', status: 'Active' },
    { id: 'E11000015', employeeNo: '11000015', name: 'Raman Kundiampurath', position: 'Specialist', division: 'Project Service', department: 'Project Service', iqamaId: '2117017034', costCenter: '0010000405', status: 'Active' }
  ];

  for (const emp of ECC_TEST_EMPLOYEES) {
    await prisma.employee.create({ data: emp });
  }

  // 6. Seed Clinic Capacity Slots
  console.log('Seeding clinic slots...');
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const slotGamc = await prisma.clinicSlot.create({
    data: {
      vendorId: 'V2',
      totalCapacity: 75,
      startDate: now,
      endDate: twoWeeksLater
    }
  });

  const slotBak = await prisma.clinicSlot.create({
    data: {
      vendorId: 'V1',
      totalCapacity: 25,
      startDate: now,
      endDate: twoWeeksLater
    }
  });

  // 7. Seed Sample Requests, Reports, and Invoices
  console.log('Seeding requests and reports...');
  
  // Completed test with Report & Certificate
  const req1 = await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0101',
      employeeId: 'H0',
      testId: '5004955', // Sadara
      vendorId: 'V2',
      slotId: slotGamc.id,
      department: 'PMTA',
      status: RequestStatus.COMPLETED,
      needByDate: new Date('2026-11-05'),
      apptDate: new Date('2026-10-25'),
      note: 'Turnaround clearance for Sadara deployment'
    }
  });

  const rep1 = await prisma.medicalReport.create({
    data: {
      id: 'REP-0081',
      requestId: req1.id,
      employeeId: 'H0',
      testId: '5004955',
      vendorId: 'V2',
      result: ReportResult.FIT,
      testDate: new Date('2026-10-25'),
      validUntil: new Date('2027-10-25'),
      remarks: 'Cardiopulmonary clear. Full visual acuity 20/20. Audiometry normal.'
    }
  });

  // Scheduled Request
  await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0102',
      employeeId: 'H1',
      testId: '5004959', // SABIC
      vendorId: 'V1',
      slotId: slotBak.id,
      department: 'E&I',
      status: RequestStatus.SCHEDULED,
      needByDate: new Date('2026-11-10'),
      apptDate: new Date('2026-11-02'),
      note: 'SABIC TSH mandatory check'
    }
  });

  // Waiting Request (Pending Central Triage)
  await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0103',
      employeeId: 'H2',
      testId: '5004964', // PetroKemya
      department: 'CIVIL',
      status: RequestStatus.WAITING,
      needByDate: new Date('2026-11-08'),
      note: 'Urgent turnaround gate clearance'
    }
  });

  await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0104',
      employeeId: 'H3',
      testId: '5004956', // Iqama check-up
      department: 'MAINTENANCE',
      status: RequestStatus.WAITING,
      needByDate: new Date('2026-11-12'),
      note: 'Annual resident renewal'
    }
  });

  // Completed test 2 for invoicing demo
  const req2 = await prisma.medicalRequest.create({
    data: {
      id: 'MR-2026-0105',
      employeeId: 'H4',
      testId: '5004981', // SATORP
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
      employeeId: 'H4',
      testId: '5004981',
      vendorId: 'V1',
      result: ReportResult.FIT,
      testDate: new Date('2026-10-18'),
      validUntil: new Date('2027-10-18'),
      remarks: 'Fit for hot work & refinery confined space entry.'
    }
  });

  // Seed sample submitted invoice for Finance audit demo
  console.log('Seeding clinic invoice...');
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

  // 8. Seed Initial Audit Logs
  console.log('Seeding audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        actorName: 'System Bootstrap',
        role: Role.ADMIN,
        action: 'INITIALIZE_SYSTEM',
        entityType: 'SYSTEM',
        entityId: 'SYS',
        details: 'Initial system seed with 5 approved clinics, 34 SAP tests, and rate agreements'
      },
      {
        actorName: 'HSE Coordinator',
        role: Role.REQUESTER,
        action: 'CREATE_REQUEST',
        entityType: 'MedicalRequest',
        entityId: 'MR-2026-0101',
        details: 'Submitted Sadara test clearance request for Employee 00001'
      },
      {
        actorName: 'Central Medical Team',
        role: Role.CENTRAL,
        action: 'ASSIGN_VENDOR',
        entityType: 'MedicalRequest',
        entityId: 'MR-2026-0101',
        details: 'Assigned request to Gulf Asian Medical Centre (GAMC)'
      },
      {
        actorName: 'Gulf Asian Clinic Desk',
        role: Role.CLINIC,
        action: 'ISSUE_REPORT',
        entityType: 'MedicalReport',
        entityId: 'REP-0081',
        details: 'Issued FIT clearance report valid until 2027-10-25'
      }
    ]
  });

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
