"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
async function seedBatches() {
    console.log('Seeding batches and 111 employees...');
    const batchConfigs = [
        {
            batchId: 'REQ-2026-0104',
            batchName: 'Yanpet medical test',
            testId: '5004972',
            requestedDate: '2026-11-02',
            plant: 'Yanpet Plant',
            protocolType: 'Periodic Clearance',
            targetCount: 30,
            employees: [
                { empNo: 'E10220', name: 'Suresh Rahman', dept: 'LOGISTIC', cardStatus: 'No card' },
                { empNo: 'E10221', name: 'Bilal Siddiqui', dept: 'ISSD', cardStatus: 'No card' },
                { empNo: 'E10222', name: 'Sajid Pillai', dept: 'PMTA', cardStatus: 'No card' },
                { empNo: 'E10223', name: 'Omar Rahman', dept: 'PSD', cardStatus: 'No card' },
                { empNo: 'E10224', name: 'Bilal Dossary', dept: 'VSD', cardStatus: 'No card' },
                { empNo: 'E10225', name: 'Khalid Al-Otaibi', dept: 'HERD', cardStatus: 'No card' },
                { empNo: 'E10226', name: 'Bilal Al-Harbi', dept: 'HERD', cardStatus: 'No card' },
                { empNo: 'E10227', name: 'Imran Shehri', dept: 'PSD', cardStatus: 'No card' },
                { empNo: 'E10228', name: 'Suresh Al-Harbi', dept: 'E&I', cardStatus: 'Expiring ≤60d • 21 Nov 2026', priority: true },
                { empNo: 'E10229', name: 'Mohammed Sharma', dept: 'TSSD', cardStatus: 'No card' },
                { empNo: 'E10230', name: 'Saeed Al-Qahtani', dept: 'CIVIL', cardStatus: 'No card' },
                { empNo: 'E10231', name: 'Ali Hussain', dept: 'LOGISTIC', cardStatus: 'No card' },
                { empNo: 'E10232', name: 'Imran Fernandez', dept: 'VSD', cardStatus: 'No card' },
                { empNo: 'E10233', name: 'Suresh Hussain', dept: 'PSD', cardStatus: 'No card' },
                { empNo: 'E10234', name: 'Joseph Shehri', dept: 'MAINTENANCE', cardStatus: 'No card' },
                { empNo: 'E10235', name: 'Fahad Al-Dossary', dept: 'PMTA', cardStatus: 'No card' },
                { empNo: 'E10236', name: 'Tariq Al-Ghamdi', dept: 'ISSD', cardStatus: 'No card' },
                { empNo: 'E10237', name: 'Ziyad Al-Mutairi', dept: 'LOGISTIC', cardStatus: 'No card' },
                { empNo: 'E10238', name: 'Abdullah Al-Zahrani', dept: 'PSD', cardStatus: 'No card' },
                { empNo: 'E10239', name: 'Mansoor Al-Shehri', dept: 'VSD', cardStatus: 'No card' },
                { empNo: 'E10240', name: 'Nasser Al-Harthy', dept: 'HERD', cardStatus: 'No card' },
                { empNo: 'E10241', name: 'Yasser Al-Otaibi', dept: 'CIVIL', cardStatus: 'No card' },
                { empNo: 'E10242', name: 'Hamad Al-Subaie', dept: 'TSSD', cardStatus: 'No card' },
                { empNo: 'E10243', name: 'Salman Al-Dosari', dept: 'MAINTENANCE', cardStatus: 'No card' },
                { empNo: 'E10244', name: 'Bandar Al-Harbi', dept: 'PMTA', cardStatus: 'No card' },
                { empNo: 'E10245', name: 'Sultan Al-Rashidi', dept: 'ISSD', cardStatus: 'No card' },
                { empNo: 'E10246', name: 'Rayan Al-Shammary', dept: 'LOGISTIC', cardStatus: 'No card' },
                { empNo: 'E10247', name: 'Majid Al-Enazi', dept: 'PSD', cardStatus: 'No card' },
                { empNo: 'E10248', name: 'Nawaf Al-Khatani', dept: 'VSD', cardStatus: 'No card' },
                { empNo: 'E10249', name: 'Rakan Al-Khaldi', dept: 'HERD', cardStatus: 'No card' }
            ]
        },
        {
            batchId: 'REQ-2026-0101',
            batchName: 'Sadara medical test',
            testId: '5004955',
            requestedDate: '2026-10-28',
            plant: 'Complex South',
            protocolType: 'Annual Comprehensive',
            targetCount: 45,
            employees: Array.from({ length: 45 }).map((_, i) => ({
                empNo: `E102${50 + i}`,
                name: `Sadara Worker ${i + 1}`,
                dept: ['PMTA', 'ISSD', 'CIVIL', 'LOGISTIC', 'E&I', 'MAINTENANCE'][i % 6],
                cardStatus: 'No card'
            }))
        },
        {
            batchId: 'REQ-2026-0102',
            batchName: 'SABIC medical screening with TSH',
            testId: '5004959',
            requestedDate: '2026-10-30',
            plant: 'Jubail Site',
            protocolType: 'Endocrine & Fitness Panel',
            targetCount: 24,
            employees: Array.from({ length: 24 }).map((_, i) => ({
                empNo: `E102${95 + i}`,
                name: `SABIC Specialist ${i + 1}`,
                dept: ['HERD', 'TSSD', 'VSD', 'PSD', 'ISSD', 'PMTA'][i % 6],
                cardStatus: 'No card'
            }))
        },
        {
            batchId: 'REQ-2026-0103',
            batchName: 'General medical fitness',
            testId: '5004965',
            requestedDate: '2026-11-01',
            plant: 'Logistics Wing',
            protocolType: 'Contractor Onboarding',
            targetCount: 12,
            employees: Array.from({ length: 12 }).map((_, i) => ({
                empNo: `E103${19 + i}`,
                name: `Logistics Contractor ${i + 1}`,
                dept: ['LOGISTIC', 'MAINTENANCE', 'CIVIL'][i % 3],
                cardStatus: 'No card'
            }))
        }
    ];
    let totalSeeded = 0;
    for (const b of batchConfigs) {
        for (let idx = 0; idx < b.employees.length; idx++) {
            const empData = b.employees[idx];
            const iqama = `24901848${String(totalSeeded + 10).padStart(2, '0')}`;
            // Upsert Employee
            const emp = await prisma_1.default.employee.upsert({
                where: { employeeNo: empData.empNo },
                update: {
                    name: empData.name,
                    department: empData.dept,
                    division: b.plant,
                    iqamaId: iqama
                },
                create: {
                    id: `EMP-${empData.empNo}`,
                    employeeNo: empData.empNo,
                    name: empData.name,
                    department: empData.dept,
                    division: b.plant,
                    iqamaId: iqama,
                    status: 'Active'
                }
            });
            // Upsert Request with Batch reference
            const reqId = `${b.batchId}-${String(idx + 1).padStart(2, '0')}`;
            await prisma_1.default.medicalRequest.upsert({
                where: { id: reqId },
                update: {
                    department: empData.dept,
                    status: 'WAITING',
                    vendorId: null,
                    note: JSON.stringify({
                        batchId: b.batchId,
                        batchName: b.batchName,
                        plant: b.plant,
                        protocolType: b.protocolType,
                        cardStatus: empData.cardStatus,
                        priority: empData.priority || false
                    })
                },
                create: {
                    id: reqId,
                    employeeId: emp.id,
                    testId: b.testId,
                    department: empData.dept,
                    status: 'WAITING',
                    vendorId: null,
                    needByDate: new Date(b.requestedDate),
                    note: JSON.stringify({
                        batchId: b.batchId,
                        batchName: b.batchName,
                        plant: b.plant,
                        protocolType: b.protocolType,
                        cardStatus: empData.cardStatus,
                        priority: empData.priority || false
                    })
                }
            });
            totalSeeded++;
        }
    }
    console.log(`Seeding complete: ${totalSeeded} requests across 4 batches.`);
}
seedBatches()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
