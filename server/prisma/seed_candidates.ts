import prisma from '../src/prisma';
import { RequestStatus } from '@prisma/client';

async function main() {
  console.log('Upserting Yanpet Candidate Batch...');

  const candidates = [
    {
      id: 'E10220',
      employeeNo: 'E10220',
      name: 'Suresh Rahman',
      position: 'Fleet Heavy Specialist',
      division: 'LOGISTICS',
      department: 'Logistics Fleet Heavy',
      gender: 'MALE',
      nationality: 'INDIAN',
      iqamaId: '2490184820',
      status: 'Active',
      photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDi3u0H4-ShsSz7RXQBCeQL-ROhfH9hDjJ3C_Z45zYSQeWwrbdaW7_WFYLvlw0uyuF9Pfugq5ervdUQYQ2K6EXJDiqkYntb6hDW9Ybqn8H6g2KjjUYrIkRFRPXsrT27D37vO_k6vDyi-6ClIrBJXppCcNkBOD-NCAXJuDaLUThv22dxzKlqhiuHMgrkrEcaRy4nleCjZ-U0YAZhJVXejCbdG5suJx9oOQnDXMVPthRI',
      requestId: 'MR-2026-0104',
      statusInReq: RequestStatus.SCHEDULED,
      stage: 'Lab Final Review',
      batchNo: 'YAN-2026-0104-R',
      notes: 'Yanpet Petrochem Periodic Fitness & Site Gate Entry'
    },
    {
      id: 'E10221',
      employeeNo: 'E10221',
      name: 'Bilal Siddiqui',
      position: 'Heavy Equipment Operator',
      division: 'OPERATIONS',
      department: 'Heavy Ops',
      gender: 'MALE',
      nationality: 'PAKISTANI',
      iqamaId: '2490184821',
      status: 'Active',
      requestId: 'MR-2026-0105',
      statusInReq: RequestStatus.SCHEDULED,
      stage: 'Audiometry Pending',
      batchNo: 'YAN-2026-0104-R',
      notes: 'Yanpet Petrochem Refinery Unit Assessment'
    },
    {
      id: 'E10228',
      employeeNo: 'E10228',
      name: 'Suresh Al-Harbi',
      position: 'Refinery Process Tech',
      division: 'OPERATIONS',
      department: 'Refinery Unit',
      gender: 'MALE',
      nationality: 'SAUDI ARABIAN',
      iqamaId: '2490184828',
      status: 'Active',
      requestId: 'MR-2026-0106',
      statusInReq: RequestStatus.SUBMITTED,
      stage: 'Blood Draw Pending',
      batchNo: 'YAN-2026-0104-R',
      notes: 'Yanpet Petrochem Gate Access Renewal'
    },
    {
      id: 'E10222',
      employeeNo: 'E10222',
      name: 'Sajid Pillai',
      position: 'Maintenance Specialist',
      division: 'MAINTENANCE',
      department: 'Maintenance',
      gender: 'MALE',
      nationality: 'INDIAN',
      iqamaId: '2490184822',
      status: 'Active',
      requestId: 'MR-2026-0107',
      statusInReq: RequestStatus.WAITING,
      stage: 'Initial Vitals Done',
      batchNo: 'YAN-2026-0104-R',
      notes: 'Yanpet Petrochem Annual Physical'
    }
  ];

  for (const c of candidates) {
    const emp = await prisma.employee.upsert({
      where: { employeeNo: c.employeeNo },
      update: {
        name: c.name,
        position: c.position,
        division: c.division,
        department: c.department,
        gender: c.gender,
        nationality: c.nationality,
        iqamaId: c.iqamaId,
        photoUrl: c.photoUrl || null
      },
      create: {
        id: c.id,
        employeeNo: c.employeeNo,
        name: c.name,
        position: c.position,
        division: c.division,
        department: c.department,
        gender: c.gender,
        nationality: c.nationality,
        iqamaId: c.iqamaId,
        photoUrl: c.photoUrl || null
      }
    });

    const test = await prisma.medicalTest.findFirst({
      where: {
        OR: [
          { name: { contains: 'General', mode: 'insensitive' } },
          { name: { contains: 'SABIC', mode: 'insensitive' } }
        ]
      }
    });
    const testId = test ? test.id : '5004959';

    await prisma.medicalRequest.upsert({
      where: { id: c.requestId },
      update: {
        employeeId: emp.id,
        testId: testId,
        vendorId: 'V1', // Badr Al Khaleej
        department: c.department,
        status: c.statusInReq,
        apptDate: new Date(),
        needByDate: new Date(Date.now() + 14 * 86400000),
        note: `[Batch ${c.batchNo}] Stage: ${c.stage}. ${c.notes}`
      },
      create: {
        id: c.requestId,
        employeeId: emp.id,
        testId: testId,
        vendorId: 'V1', // Badr Al Khaleej
        department: c.department,
        status: c.statusInReq,
        apptDate: new Date(),
        needByDate: new Date(Date.now() + 14 * 86400000),
        note: `[Batch ${c.batchNo}] Stage: ${c.stage}. ${c.notes}`
      }
    });
  }

  console.log('Successfully seeded 4 candidates into database!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
