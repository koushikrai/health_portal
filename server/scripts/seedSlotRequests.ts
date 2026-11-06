import prisma from '../src/prisma';

export async function seedSlotRequests() {
  console.log('--- Seeding Slot Requests for Central Medical Team Allocation Queue ---');

  // Ensure vendors exist
  const vendors = await prisma.vendor.findMany();
  const vMap: Record<string, string> = {};
  vendors.forEach(v => {
    vMap[v.code] = v.id; // BAK, GAMC, JMC, ARZ, DINA
  });

  // Ensure test protocols exist
  let sadaraTest = await prisma.medicalTest.findFirst({ where: { name: { contains: 'Sadara' } } });
  if (!sadaraTest) {
    sadaraTest = await prisma.medicalTest.create({
      data: { id: '5004955', name: 'Sadara Medical', testType: 'Fitness test', validityMonths: 12 }
    });
  }

  let sabicTest = await prisma.medicalTest.findFirst({ where: { name: { contains: 'SABIC' } } });
  if (!sabicTest) {
    sabicTest = await prisma.medicalTest.create({
      data: { id: '5004959', name: 'SABIC Medical Screening', testType: 'Fitness test', validityMonths: 12 }
    });
  }

  // The 4 initial slot requests from the user's screenshot
  const initialRequests = [
    {
      id: 'SR-1007',
      title: 'Sadara Medical',
      testId: sadaraTest.id,
      department: 'PMTA',
      plant: 'Sadara Complex (Jubail)',
      requestedSlots: 10,
      allocatedSlots: 10,
      status: 'ALLOCATED',
      note: 'Turnaround advance booking',
      allocations: [
        { code: 'ARZ', slots: 10 },
        { code: 'BAK', slots: 0 },
        { code: 'DINA', slots: 0 },
        { code: 'GAMC', slots: 0 }
      ]
    },
    {
      id: 'SR-1006',
      title: 'Sadara Medical',
      testId: sadaraTest.id,
      department: 'PMTA',
      plant: 'Sadara Complex (Jubail)',
      requestedSlots: 10,
      allocatedSlots: 0,
      status: 'PENDING',
      note: 'Turnaround quota reservation',
      allocations: [
        { code: 'ARZ', slots: 0 },
        { code: 'BAK', slots: 0 },
        { code: 'DINA', slots: 0 },
        { code: 'GAMC', slots: 0 }
      ]
    },
    {
      id: 'SR-1001',
      title: 'Sadara Medical',
      testId: sadaraTest.id,
      department: 'PMTA',
      plant: 'Sadara Complex (Jubail)',
      requestedSlots: 10,
      allocatedSlots: 0,
      status: 'PENDING',
      note: 'Initial batch pre-booking',
      allocations: [
        { code: 'ARZ', slots: 0 },
        { code: 'BAK', slots: 0 },
        { code: 'DINA', slots: 0 },
        { code: 'GAMC', slots: 0 }
      ]
    },
    {
      id: 'SR-1002',
      title: 'SABIC Medical Screening',
      testId: sabicTest.id,
      department: 'PMTA',
      plant: 'Jubail Site',
      requestedSlots: 20,
      allocatedSlots: 0,
      status: 'PENDING',
      note: 'SABIC turnaround advance capacity',
      allocations: [
        { code: 'ARZ', slots: 0 },
        { code: 'BAK', slots: 0 },
        { code: 'DINA', slots: 0 },
        { code: 'GAMC', slots: 0 }
      ]
    }
  ];

  for (const item of initialRequests) {
    const existing = await prisma.slotRequest.findUnique({ where: { id: item.id } });
    if (!existing) {
      const sr = await prisma.slotRequest.create({
        data: {
          id: item.id,
          title: item.title,
          testId: item.testId,
          department: item.department,
          plant: item.plant,
          requestedSlots: item.requestedSlots,
          allocatedSlots: item.allocatedSlots,
          status: item.status,
          note: item.note,
          createdByName: 'Marcus Sterling (HR)'
        }
      });

      for (const alloc of item.allocations) {
        const vendorId = vMap[alloc.code];
        if (vendorId) {
          await prisma.slotAllocation.create({
            data: {
              slotRequestId: sr.id,
              vendorId,
              allocatedSlots: alloc.slots
            }
          });
        }
      }
    }
  }

  // Ensure contract rates exist for price comparison
  const contracts = await prisma.contract.findMany();
  const cByVendor: Record<string, string> = {};
  for (const c of contracts) {
    cByVendor[c.vendorId] = c.id;
  }

  // For any clinic without a contract, create a baseline contract
  for (const v of vendors) {
    if (!cByVendor[v.id]) {
      const c = await prisma.contract.create({
        data: {
          vendorId: v.id,
          contractNo: `46200003${v.id.replace('V', '2')}`,
          quoteNo: `QT-${v.code}-2026`,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          invoicingType: 'Ariba portal',
          paymentTerms: 30,
          notes: ['Standard corporate tariff schedule.']
        }
      });
      cByVendor[v.id] = c.id;
    }
  }

  // Benchmark Rates across clinics
  const benchmarkRates: Record<string, Record<string, number>> = {
    // Sadara Medical (5004955)
    '5004955': {
      V1: 185.00, // BAK
      V2: 152.00, // GAMC
      V3: 175.00, // JMC
      V4: 152.00, // ARZ (Ar Raji)
      V5: 160.00  // DINA
    },
    // SABIC Medical Screening (5004959)
    '5004959': {
      V1: 110.00,
      V2: 99.00,
      V3: 115.00,
      V4: 105.00,
      V5: 110.00
    },
    // Yanpet medical test (5004972)
    '5004972': {
      V1: 75.00,
      V2: 64.00,
      V3: 78.00,
      V4: 70.00,
      V5: 72.00
    },
    // Ma'aden medical test (5004958)
    '5004958': {
      V1: 250.00,
      V2: 240.00,
      V3: 260.00,
      V4: 245.00,
      V5: 255.00
    },
    // General medical fitness (5004965)
    '5004965': {
      V1: 23.00,
      V2: 24.00,
      V3: 25.00,
      V4: 24.00,
      V5: 26.00
    }
  };

  for (const [testId, rates] of Object.entries(benchmarkRates)) {
    for (const [vId, rate] of Object.entries(rates)) {
      const cId = cByVendor[vId];
      if (cId) {
        const existingRate = await prisma.contractRate.findUnique({
          where: { contractId_testId: { contractId: cId, testId } }
        });
        if (!existingRate) {
          await prisma.contractRate.create({
            data: { contractId: cId, testId, rate }
          });
        }
      }
    }
  }

  console.log('Slot requests and price comparison rates successfully seeded!');
}

if (require.main === module) {
  seedSlotRequests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
