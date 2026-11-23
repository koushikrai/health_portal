"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 1. The visible rows from media_1793938729842_cfe4cbb5.jpg and media_1793938729845_9ce5dfc8.jpg:
const exactRows = [
    {
        no: 'E10200', name: 'Omar Ansari', dept: 'RSD', overall: 'VALID',
        cards: [
            { testId: '5004956', shortName: 'Iqama', issuedStr: '2026-04-10', validUntilStr: '2027-04-10', daysLeft: 155, status: 'VALID' }
        ]
    },
    {
        no: 'E10201', name: 'Sajid Ansari', dept: 'TSSD', overall: 'EXPIRING_SOON',
        cards: [
            { testId: '5004970', shortName: 'Pre-employment,', issuedStr: '2025-12-15', validUntilStr: '2026-12-15', daysLeft: 39, status: 'EXPIRING_SOON' }
        ]
    },
    {
        no: 'E10202', name: 'Imran Dossary', dept: 'MAINTENANCE', overall: 'VALID',
        cards: [
            { testId: '5004959', shortName: 'SABIC', issuedStr: '2026-05-01', validUntilStr: '2027-05-01', daysLeft: 176, status: 'VALID' },
            { testId: '5004970', shortName: 'Pre-employment,', issuedStr: '2026-04-15', validUntilStr: '2027-04-15', daysLeft: 160, status: 'VALID' },
            { testId: '5004972', shortName: 'Yanpet', issuedStr: '2026-06-20', validUntilStr: '2027-06-20', daysLeft: 226, status: 'VALID' }
        ]
    },
    {
        no: 'E10203', name: 'Ramesh Rahman', dept: 'RSD', overall: 'EXPIRED',
        cards: [
            { testId: '5004958', shortName: "Ma'aden", issuedStr: '2025-09-10', validUntilStr: '2026-09-10', daysLeft: -57, status: 'EXPIRED' }
        ]
    },
    {
        no: 'E10204', name: 'Yousef Hussain', dept: 'PAD', overall: 'VALID',
        cards: [
            { testId: '5004966', shortName: 'Driving', issuedStr: '2026-03-12', validUntilStr: '2027-03-12', daysLeft: 126, status: 'VALID' },
            { testId: '5004979', shortName: 'Hadeed', issuedStr: '2026-05-22', validUntilStr: '2027-05-22', daysLeft: 197, status: 'VALID' }
        ]
    },
    {
        no: 'E10205', name: 'Sajid Hussain', dept: 'ISSD', overall: 'EXPIRING_SOON',
        cards: [
            { testId: '5004963', shortName: 'Saipem', issuedStr: '2025-12-20', validUntilStr: '2026-12-20', daysLeft: 44, status: 'EXPIRING_SOON' },
            { testId: '5004966', shortName: 'Driving', issuedStr: '2026-06-01', validUntilStr: '2027-06-01', daysLeft: 207, status: 'VALID' },
            { testId: '5004973', shortName: 'Yansab', issuedStr: '2026-07-15', validUntilStr: '2027-07-15', daysLeft: 251, status: 'VALID' }
        ]
    },
    {
        no: 'E10206', name: 'Faisal Hussain', dept: 'PAD', overall: 'VALID',
        cards: [
            { testId: '5004956', shortName: 'Iqama', issuedStr: '2026-04-18', validUntilStr: '2027-04-18', daysLeft: 163, status: 'VALID' },
            { testId: '5004959', shortName: 'SABIC', issuedStr: '2026-05-10', validUntilStr: '2027-05-10', daysLeft: 185, status: 'VALID' },
            { testId: '5004979', shortName: 'Hadeed', issuedStr: '2026-06-15', validUntilStr: '2027-06-15', daysLeft: 221, status: 'VALID' }
        ]
    },
    {
        no: 'E10207', name: 'Omar Dossary', dept: 'PSD', overall: 'VALID',
        cards: [
            { testId: '5004958', shortName: "Ma'aden", issuedStr: '2026-03-30', validUntilStr: '2027-03-30', daysLeft: 144, status: 'VALID' },
            { testId: '5004978', shortName: 'Amiral', issuedStr: '2026-07-01', validUntilStr: '2027-07-01', daysLeft: 237, status: 'VALID' }
        ]
    },
    {
        no: 'E10208', name: 'Nasser Ansari', dept: 'PAD', overall: 'EXPIRED',
        cards: [
            { testId: '5004958', shortName: "Ma'aden", issuedStr: '2026-03-31', validUntilStr: '2027-03-31', daysLeft: 148, status: 'VALID' },
            { testId: '5004970', shortName: 'Pre-employment,', issuedStr: '2025-09-25', validUntilStr: '2026-09-25', daysLeft: -39, status: 'EXPIRED' },
            { testId: '5004974', shortName: 'Bahrain', issuedStr: '2026-02-04', validUntilStr: '2027-02-04', daysLeft: 93, status: 'VALID' }
        ]
    },
    {
        no: 'E10209', name: 'Tariq Al-Otaibi', dept: 'MAINTENANCE', overall: 'EXPIRING_SOON',
        cards: [
            { testId: '5004975', shortName: 'CPP', issuedStr: '2025-12-25', validUntilStr: '2026-12-25', daysLeft: 49, status: 'EXPIRING_SOON' },
            { testId: '5004979', shortName: 'Hadeed', issuedStr: '2026-05-18', validUntilStr: '2027-05-18', daysLeft: 193, status: 'VALID' }
        ]
    },
    {
        no: 'E10210', name: 'Mohammed Shehri', dept: 'ISSD', overall: 'VALID',
        cards: [
            { testId: '5004975', shortName: 'CPP', issuedStr: '2026-04-05', validUntilStr: '2027-04-05', daysLeft: 150, status: 'VALID' }
        ]
    },
    {
        no: 'E10211', name: 'Bilal Dossary', dept: 'LOGISTIC', overall: 'VALID',
        cards: [
            { testId: '5004974', shortName: 'Bahrain', issuedStr: '2026-03-15', validUntilStr: '2027-03-15', daysLeft: 129, status: 'VALID' },
            { testId: '5004977', shortName: 'SAFCO', issuedStr: '2026-05-12', validUntilStr: '2027-05-12', daysLeft: 187, status: 'VALID' }
        ]
    },
    {
        no: 'E10212', name: 'Ahmed Rahman', dept: 'ISSD', overall: 'EXPIRING_SOON',
        cards: [
            { testId: '5004966', shortName: 'Driving', issuedStr: '2025-11-28', validUntilStr: '2026-11-28', daysLeft: 22, status: 'EXPIRING_SOON' },
            { testId: '5004972', shortName: 'Yanpet', issuedStr: '2026-04-10', validUntilStr: '2027-04-10', daysLeft: 155, status: 'VALID' },
            { testId: '5004973', shortName: 'Yansab', issuedStr: '2026-06-08', validUntilStr: '2027-06-08', daysLeft: 214, status: 'VALID' }
        ]
    },
    {
        no: 'E10213', name: 'Tariq Al-Otaibi', dept: 'PSD', overall: 'VALID',
        cards: [
            { testId: '5004972', shortName: 'Yanpet', issuedStr: '2026-04-18', validUntilStr: '2027-04-18', daysLeft: 163, status: 'VALID' },
            { testId: '5004981', shortName: 'SATORP', issuedStr: '2026-06-12', validUntilStr: '2027-06-12', daysLeft: 218, status: 'VALID' }
        ]
    },
    {
        no: 'E10214', name: 'Bilal Al-Qahtani', dept: 'LOGISTIC', overall: 'VALID',
        cards: [
            { testId: '5004956', shortName: 'Iqama', issuedStr: '2026-05-20', validUntilStr: '2027-05-20', daysLeft: 195, status: 'VALID' }
        ]
    },
    {
        no: 'E10215', name: 'Ramesh Khan', dept: 'ISSD', overall: 'VALID',
        cards: [
            { testId: '5004984', shortName: 'Food', issuedStr: '2026-04-25', validUntilStr: '2027-04-25', daysLeft: 170, status: 'VALID' }
        ]
    },
    {
        no: 'E10216', name: 'Ali Ansari', dept: 'VSD', overall: 'VALID',
        cards: [
            { testId: '5004963', shortName: 'Saipem', issuedStr: '2026-04-02', validUntilStr: '2027-04-02', daysLeft: 147, status: 'VALID' }
        ]
    },
    {
        no: 'E10217', name: 'Ramesh Dossary', dept: 'CIVIL', overall: 'VALID',
        cards: [
            { testId: '5004955', shortName: 'Sadara', issuedStr: '2026-05-05', validUntilStr: '2027-05-05', daysLeft: 180, status: 'VALID' },
            { testId: '5004956', shortName: 'Iqama', issuedStr: '2026-06-14', validUntilStr: '2027-06-14', daysLeft: 220, status: 'VALID' }
        ]
    },
    {
        no: 'E10218', name: 'Joseph Dossary', dept: 'PMTA', overall: 'EXPIRED',
        cards: [
            { testId: '5004956', shortName: 'Iqama', issuedStr: '2025-12-10', validUntilStr: '2026-12-10', daysLeft: 34, status: 'EXPIRING_SOON' },
            { testId: '5004961', shortName: 'Aramco', issuedStr: '2025-08-15', validUntilStr: '2026-08-15', daysLeft: -83, status: 'EXPIRED' },
            { testId: '5004978', shortName: 'Amiral', issuedStr: '2026-03-20', validUntilStr: '2027-03-20', daysLeft: 134, status: 'VALID' }
        ]
    },
    {
        no: 'E10219', name: 'Rahul Nair', dept: 'TSSD', overall: 'EXPIRED',
        cards: [
            { testId: '5004975', shortName: 'CPP', issuedStr: '2025-07-20', validUntilStr: '2026-07-20', daysLeft: -109, status: 'EXPIRED' }
        ]
    },
    {
        no: 'E10220', name: 'Suresh Rahman', dept: 'LOGISTIC', overall: 'EXPIRED',
        cards: [
            { testId: '5004973', shortName: 'Yansab', issuedStr: '2025-09-01', validUntilStr: '2026-09-01', daysLeft: -66, status: 'EXPIRED' },
            { testId: '5004978', shortName: 'Amiral', issuedStr: '2026-04-10', validUntilStr: '2027-04-10', daysLeft: 155, status: 'VALID' },
            { testId: '5004979', shortName: 'Hadeed', issuedStr: '2025-12-18', validUntilStr: '2026-12-18', daysLeft: 42, status: 'EXPIRING_SOON' }
        ]
    },
    {
        no: 'E10221', name: 'Bilal Siddiqui', dept: 'ISSD', overall: 'EXPIRING_SOON',
        cards: [
            { testId: '5004963', shortName: 'Saipem', issuedStr: '2025-12-05', validUntilStr: '2026-12-05', daysLeft: 29, status: 'EXPIRING_SOON' },
            { testId: '5004964', shortName: 'PetroKemya', issuedStr: '2026-06-25', validUntilStr: '2027-06-25', daysLeft: 231, status: 'VALID' },
            { testId: '5004976', shortName: 'Sharq', issuedStr: '2026-05-15', validUntilStr: '2027-05-15', daysLeft: 190, status: 'VALID' }
        ]
    },
    {
        no: 'E10222', name: 'Sajid Pillai', dept: 'PMTA', overall: 'VALID',
        cards: [
            { testId: '5004958', shortName: "Ma'aden", issuedStr: '2026-04-12', validUntilStr: '2027-04-12', daysLeft: 157, status: 'VALID' },
            { testId: '5004977', shortName: 'SAFCO', issuedStr: '2026-05-20', validUntilStr: '2027-05-20', daysLeft: 195, status: 'VALID' }
        ]
    },
    {
        no: 'E10223', name: 'Omar Rahman', dept: 'PSD', overall: 'VALID',
        cards: [
            { testId: '5004955', shortName: 'Sadara', issuedStr: '2026-03-25', validUntilStr: '2027-03-25', daysLeft: 139, status: 'VALID' },
            { testId: '5004958', shortName: "Ma'aden", issuedStr: '2026-06-10', validUntilStr: '2027-06-10', daysLeft: 216, status: 'VALID' },
            { testId: '5004970', shortName: 'Pre-employment,', issuedStr: '2026-05-14', validUntilStr: '2027-05-14', daysLeft: 189, status: 'VALID' }
        ]
    }
];
// Generate the remaining 46 employees up to 70 total
// Current exact: 24 total (13 VALID, 5 EXPIRING_SOON, 6 EXPIRED)
// Target total 70:
// Target VALID: 32 (needs 19 more)
// Target EXPIRING_SOON: 20 (needs 15 more)
// Target EXPIRED: 18 (needs 12 more)
// 19 + 15 + 12 = 46 more!
const moreNames = [
    'Mansour Al-Harbi', 'Faisal Al-Zahrani', 'Ibrahim Al-Shehri', 'Yousef Al-Mutairi', 'Naif Al-Otaibi',
    'Majed Al-Khaldi', 'Saad Al-Dossary', 'Rami Al-Subaie', 'Waleed Al-Enazi', 'Hassan Al-Amri',
    'Adel Al-Qarni', 'Nawaf Al-Ghamdi', 'Bander Al-Qahtani', 'Turki Al-Shammari', 'Khaled Al-Harthi',
    'Sami Al-Bishi', 'Ziyad Al-Juhani', 'Abdulrahman Al-Majid', 'Mazen Al-Saeed', 'Farhan Al-Rowaili',
    'Bader Al-Mutlaq', 'Moath Al-Hazmi', 'Osama Al-Ghannam', 'Raed Al-Fahad', 'Mubarak Al-Hajri',
    'Nasser Al-Buainain', 'Hussain Al-Marri', 'Ali Al-Yami', 'Jassim Al-Khalifa', 'Sultan Al-Owaid',
    'Rashid Al-Khatir', 'Abdullah Al-Tamimi', 'Fahad Al-Sudairy', 'Meshal Al-Otaibi', 'Hatem Al-Ghamdi',
    'Wael Al-Harbi', 'Anas Al-Zahrani', 'Luqman Al-Shehri', 'Musaad Al-Dossary', 'Ayman Al-Ghamdi',
    'Shaker Al-Otaibi', 'Talal Al-Harbi', 'Marwan Al-Zahrani', 'Jaber Al-Shehri', 'Deepak Verma', 'Arun Krishnan'
];
const depts = ['LOGISTIC', 'ISSD', 'PMTA', 'PSD', 'VSD', 'HERD', 'E&I', 'CIVIL', 'MAINTENANCE', 'TSSD', 'RSD', 'PAD'];
const remainingRows = [];
// Add 18 VALID (so total Valid = 14 + 18 = 32)
for (let i = 0; i < 18; i++) {
    const idx = 24 + i;
    const no = `E102${String(idx).padStart(2, '0')}`;
    const name = moreNames[i];
    const dept = depts[i % depts.length];
    remainingRows.push({
        no, name, dept, overall: 'VALID',
        cards: [
            { testId: '5004972', shortName: 'Yanpet', issuedStr: '2026-05-10', validUntilStr: '2027-05-10', daysLeft: 185, status: 'VALID' },
            { testId: '5004956', shortName: 'Iqama', issuedStr: '2026-06-15', validUntilStr: '2027-06-15', daysLeft: 221, status: 'VALID' }
        ]
    });
}
// Add 15 EXPIRING_SOON (so total Expiring = 5 + 15 = 20)
for (let i = 0; i < 15; i++) {
    const idx = 24 + 18 + i;
    const no = `E102${String(idx).padStart(2, '0')}`;
    const name = moreNames[18 + i];
    const dept = depts[(i + 3) % depts.length];
    remainingRows.push({
        no, name, dept, overall: 'EXPIRING_SOON',
        cards: [
            { testId: '5004966', shortName: 'Driving', issuedStr: '2025-12-10', validUntilStr: '2026-12-10', daysLeft: 34, status: 'EXPIRING_SOON' },
            { testId: '5004979', shortName: 'Hadeed', issuedStr: '2026-04-12', validUntilStr: '2027-04-12', daysLeft: 157, status: 'VALID' }
        ]
    });
}
// Add 13 EXPIRED (so total Expired = 5 + 13 = 18)
for (let i = 0; i < 13; i++) {
    const idx = 24 + 18 + 15 + i;
    const no = `E102${String(idx).padStart(2, '0')}`;
    const name = moreNames[18 + 15 + i];
    const dept = depts[(i + 7) % depts.length];
    remainingRows.push({
        no, name, dept, overall: 'EXPIRED',
        cards: [
            { testId: '5004958', shortName: "Ma'aden", issuedStr: '2025-08-20', validUntilStr: '2026-08-20', daysLeft: -78, status: 'EXPIRED' },
            { testId: '5004959', shortName: 'SABIC', issuedStr: '2026-03-10', validUntilStr: '2027-03-10', daysLeft: 124, status: 'VALID' }
        ]
    });
}
const all70Rows = [...exactRows, ...remainingRows];
async function seed() {
    console.log(`Seeding exact 70 workforce clearance roster (${all70Rows.length} employees)...`);
    const validTotal = all70Rows.filter(r => r.overall === 'VALID').length;
    const expiringTotal = all70Rows.filter(r => r.overall === 'EXPIRING_SOON').length;
    const expiredTotal = all70Rows.filter(r => r.overall === 'EXPIRED').length;
    console.log(`Target KPIs: Total=${all70Rows.length}, Valid=${validTotal}, Expiring=${expiringTotal}, Expired=${expiredTotal}`);
    // Ensure uploads directory exists
    const reportsDir = path_1.default.join(__dirname, '../../uploads/reports');
    if (!fs_1.default.existsSync(reportsDir)) {
        fs_1.default.mkdirSync(reportsDir, { recursive: true });
    }
    // Create a sample certificate PDF placeholder if not exists
    const samplePdf = path_1.default.join(reportsDir, 'sample_clearance_certificate.pdf');
    if (!fs_1.default.existsSync(samplePdf)) {
        fs_1.default.writeFileSync(samplePdf, '%PDF-1.4\n1 0 obj\n<< /Title (Medical Clearance Certificate) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    }
    // Seed into PostgreSQL
    const clinics = ['V1', 'V2', 'V3', 'V4', 'V5'];
    for (let i = 0; i < all70Rows.length; i++) {
        const row = all70Rows[i];
        const iqamaId = `2490184${String(i + 800).padStart(3, '0')}`;
        // 1. Employee
        const emp = await prisma_1.default.employee.upsert({
            where: { employeeNo: row.no },
            update: {
                name: row.name,
                department: row.dept,
                division: row.dept,
                iqamaId
            },
            create: {
                id: `EMP-${row.no}`,
                employeeNo: row.no,
                name: row.name,
                department: row.dept,
                division: row.dept,
                iqamaId,
                status: 'Active'
            }
        });
        // 2. Medical cards (MedicalRequest + MedicalReport)
        for (let c = 0; c < row.cards.length; c++) {
            const card = row.cards[c];
            const vendorId = clinics[(i + c) % clinics.length];
            const reqId = `REQ-CLR-${row.no}-${c + 1}`;
            const repId = `REP-CLR-${row.no}-${c + 1}`;
            const tDate = new Date(card.issuedStr);
            const vDate = new Date(card.validUntilStr);
            const pdfFilename = `${iqamaId}_${card.shortName.replace(/[^a-zA-Z0-9]/g, '')}_report.pdf`;
            const pdfFilePath = path_1.default.join(reportsDir, pdfFilename);
            if (!fs_1.default.existsSync(pdfFilePath)) {
                fs_1.default.copyFileSync(samplePdf, pdfFilePath);
            }
            const fileUrl = `/uploads/reports/${pdfFilename}`;
            // Upsert request
            await prisma_1.default.medicalRequest.upsert({
                where: { id: reqId },
                update: {
                    employeeId: emp.id,
                    testId: card.testId,
                    vendorId,
                    department: row.dept,
                    status: 'COMPLETED',
                    note: JSON.stringify({
                        batchId: 'BATCH-2026-CLEARANCE-ROSTER',
                        batchName: 'Workforce Medical Clearance Master Roster',
                        shortName: card.shortName,
                        daysLeft: card.daysLeft
                    })
                },
                create: {
                    id: reqId,
                    employeeId: emp.id,
                    testId: card.testId,
                    vendorId,
                    department: row.dept,
                    status: 'COMPLETED',
                    needByDate: vDate,
                    note: JSON.stringify({
                        batchId: 'BATCH-2026-CLEARANCE-ROSTER',
                        batchName: 'Workforce Medical Clearance Master Roster',
                        shortName: card.shortName,
                        daysLeft: card.daysLeft
                    })
                }
            });
            // Upsert report
            await prisma_1.default.medicalReport.upsert({
                where: { requestId: reqId },
                update: {
                    employeeId: emp.id,
                    testId: card.testId,
                    vendorId,
                    result: card.status === 'EXPIRED' ? 'UNFIT' : 'FIT',
                    testDate: tDate,
                    validUntil: vDate,
                    fileUrl,
                    remarks: `[Examining Physician: Dr. Tariq Al-Ghamdi, MD] Clearance protocol: ${card.shortName}. Valid until ${card.validUntilStr}.`
                },
                create: {
                    id: repId,
                    requestId: reqId,
                    employeeId: emp.id,
                    testId: card.testId,
                    vendorId,
                    result: card.status === 'EXPIRED' ? 'UNFIT' : 'FIT',
                    testDate: tDate,
                    validUntil: vDate,
                    fileUrl,
                    remarks: `[Examining Physician: Dr. Tariq Al-Ghamdi, MD] Clearance protocol: ${card.shortName}. Valid until ${card.validUntilStr}.`
                }
            });
        }
    }
    console.log('Seeding completed successfully!');
}
seed().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
