"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotsController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const auditService_1 = require("../services/auditService");
const settingsService_1 = require("../services/settingsService");
class SlotsController {
    /**
     * GET /api/slots/queue
     * Returns all slot requests for Central Medical Team Allocation Queue
     */
    static async listQueue(req, res) {
        try {
            const settings = await settingsService_1.SettingsService.getSettings();
            const expiryDays = settings.slotExpiryDays || 7;
            const now = new Date();
            const slotRequests = await prisma_1.default.slotRequest.findMany({
                include: {
                    test: true,
                    allocations: {
                        include: {
                            vendor: true
                        }
                    }
                },
                orderBy: { id: 'desc' }
            });
            // Fetch all active vendors (specifically the 4 in the screenshot: ARZ, BAK, DINA, GAMC + JMC)
            const vendors = await prisma_1.default.vendor.findMany({
                where: { isActive: true },
                orderBy: { code: 'asc' }
            });
            // Standard 4 clinics order matching user screenshot:
            // Ar Raji Medical, Badr Al Khaleej Medical Center, Dina Medical Center, Gulf Asian Medical Center
            const clinicDisplayOrder = ['ARZ', 'BAK', 'DINA', 'GAMC', 'JMC'];
            const allClinics = vendors.map(v => {
                let displayName = v.name;
                if (v.code === 'ARZ')
                    displayName = 'Ar Raji Medical';
                else if (v.code === 'BAK')
                    displayName = 'Badr Al Khaleej Medical Center';
                else if (v.code === 'DINA')
                    displayName = 'Dina Medical Center';
                else if (v.code === 'GAMC')
                    displayName = 'Gulf Asian Medical Center';
                else if (v.code === 'JMC')
                    displayName = 'Jubail Medical Center';
                return {
                    id: v.id,
                    code: v.code,
                    name: displayName,
                    tier: v.tier || 'Tier 1 Primary',
                    sapVendorNo: v.sapVendorNo
                };
            });
            const queue = slotRequests.map(sr => {
                const allocMap = {};
                sr.allocations.forEach(a => {
                    allocMap[a.vendorId] = a.allocatedSlots;
                });
                // Compute total allocated
                const totalAllocated = sr.allocations.reduce((sum, a) => sum + (a.allocatedSlots || 0), 0);
                // Active allocations list (clinics with > 0 slots)
                const activeAllocations = sr.allocations
                    .filter(a => a.allocatedSlots > 0)
                    .map(a => {
                    let dName = a.vendor.name;
                    if (a.vendor.code === 'ARZ')
                        dName = 'Ar Raji Medical';
                    else if (a.vendor.code === 'BAK')
                        dName = 'Badr Al Khaleej Medical Center';
                    else if (a.vendor.code === 'DINA')
                        dName = 'Dina Medical Center';
                    else if (a.vendor.code === 'GAMC')
                        dName = 'Gulf Asian Medical Center';
                    else if (a.vendor.code === 'JMC')
                        dName = 'Jubail Medical Center';
                    return {
                        vendorId: a.vendorId,
                        vendorCode: a.vendor.code,
                        vendorName: dName,
                        allocatedSlots: a.allocatedSlots
                    };
                });
                // Format clinics for card
                const clinics = vendors.map(v => {
                    let displayName = v.name;
                    if (v.code === 'ARZ')
                        displayName = 'Ar Raji Medical';
                    else if (v.code === 'BAK')
                        displayName = 'Badr Al Khaleej Medical Center';
                    else if (v.code === 'DINA')
                        displayName = 'Dina Medical Center';
                    else if (v.code === 'GAMC')
                        displayName = 'Gulf Asian Medical Center';
                    else if (v.code === 'JMC')
                        displayName = 'Jubail Medical Center';
                    return {
                        id: v.id,
                        code: v.code,
                        name: displayName,
                        allocated: allocMap[v.id] || 0
                    };
                });
                // Sort clinics so the 4 primary ones come first matching screenshot
                clinics.sort((a, b) => {
                    const idxA = clinicDisplayOrder.indexOf(a.code);
                    const idxB = clinicDisplayOrder.indexOf(b.code);
                    if (idxA !== -1 && idxB !== -1)
                        return idxA - idxB;
                    if (idxA !== -1)
                        return -1;
                    if (idxB !== -1)
                        return 1;
                    return a.name.localeCompare(b.name);
                });
                // Calculate age and disappearance threshold based on Admin configuration
                const createdDate = new Date(sr.createdAt);
                const ageMs = now.getTime() - createdDate.getTime();
                const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                const isExpired = sr.status === 'EXPIRED' || (settings.autoExpireSlots && ageDays >= expiryDays);
                const daysRemaining = Math.max(0, expiryDays - ageDays);
                const autoDisappearDate = new Date(createdDate.getTime() + expiryDays * 86400000).toISOString();
                return {
                    id: sr.id,
                    title: sr.title,
                    testId: sr.testId,
                    testName: sr.test?.name || sr.title,
                    department: sr.department,
                    plant: sr.plant,
                    requestedSlots: sr.requestedSlots,
                    allocatedSlots: totalAllocated,
                    status: isExpired ? 'EXPIRED' : sr.status,
                    needByDate: sr.needByDate,
                    note: sr.note,
                    createdByName: sr.createdByName,
                    createdAt: sr.createdAt,
                    ageDays,
                    daysRemaining,
                    isExpired,
                    autoDisappearDate,
                    allocations: allocMap,
                    activeAllocations,
                    clinics
                };
            });
            // Filter: Slots older than the configured window (default 7 days) disappear from the active queue!
            const includeExpired = req.query.includeExpired === 'true';
            const activeQueue = queue.filter(q => !q.isExpired);
            const expiredQueue = queue.filter(q => q.isExpired);
            const displayedQueue = includeExpired ? queue : activeQueue;
            return res.json({
                totalRequests: displayedQueue.length,
                activeCount: activeQueue.length,
                expiredCount: expiredQueue.length,
                slotExpiryDays: expiryDays,
                autoExpireSlots: settings.autoExpireSlots,
                pendingAllocation: activeQueue.filter(q => q.allocatedSlots < q.requestedSlots).length,
                fullyAllocated: activeQueue.filter(q => q.allocatedSlots >= q.requestedSlots).length,
                allClinics,
                requests: displayedQueue
            });
        }
        catch (e) {
            console.error('Error fetching slot allocation queue:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * POST /api/slots/request
     * HR Pre-books slots when employee roster is not yet decided (e.g. 50 slots)
     */
    static async createRequest(req, res) {
        try {
            const { title, testId, department, plant, requestedSlots, needByDate, note } = req.body;
            const slotsCount = parseInt(String(requestedSlots), 10);
            if (isNaN(slotsCount) || slotsCount <= 0) {
                return res.status(400).json({ error: 'Valid positive number of slots required' });
            }
            // Generate next SR ID (e.g. SR-1008)
            const existingSr = await prisma_1.default.slotRequest.findMany({
                select: { id: true }
            });
            let maxSeq = 1007;
            existingSr.forEach(item => {
                const match = item.id.match(/^SR-(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxSeq)
                        maxSeq = num;
                }
            });
            const nextId = `SR-${maxSeq + 1}`;
            // Resolve test title if not provided
            let effectiveTitle = title;
            if (!effectiveTitle && testId) {
                const test = await prisma_1.default.medicalTest.findUnique({ where: { id: testId } });
                if (test)
                    effectiveTitle = test.name;
            }
            if (!effectiveTitle)
                effectiveTitle = 'General Medical Fitness';
            const slotRequest = await prisma_1.default.slotRequest.create({
                data: {
                    id: nextId,
                    title: effectiveTitle,
                    testId: testId || undefined,
                    department: department || 'PMTA',
                    plant: plant || 'Sadara Complex (Jubail)',
                    requestedSlots: slotsCount,
                    allocatedSlots: 0,
                    status: 'PENDING',
                    needByDate: needByDate ? new Date(needByDate) : null,
                    note: note || `Advance quota pre-booking for ${slotsCount} unassigned personnel`,
                    createdById: req.user?.id,
                    createdByName: req.user?.name || 'HR Coordinator'
                }
            });
            // Pre-seed 0-allocations for the primary clinics
            const vendors = await prisma_1.default.vendor.findMany();
            for (const v of vendors) {
                await prisma_1.default.slotAllocation.create({
                    data: {
                        slotRequestId: slotRequest.id,
                        vendorId: v.id,
                        allocatedSlots: 0
                    }
                });
            }
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'HR Coordinator',
                role: req.user?.role || 'HR',
                action: 'PRE_BOOK_SLOTS',
                entityType: 'SlotRequest',
                entityId: slotRequest.id,
                details: `Pre-booked ${slotsCount} slots for ${effectiveTitle} [${slotRequest.department}] (${slotRequest.id})`
            });
            return res.status(201).json({
                slotRequest,
                message: `Successfully registered slot reservation ${slotRequest.id} for ${slotsCount} employees in Central Queue!`
            });
        }
        catch (e) {
            console.error('Error creating pre-booked slot request:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * POST /api/slots/:id/allocate
     * Central Medical Team allocates / confirms clinic split
     */
    static async allocateSlots(req, res) {
        try {
            const { id } = req.params;
            const { allocations, status } = req.body;
            if (!allocations || typeof allocations !== 'object') {
                return res.status(400).json({ error: 'Allocations dictionary required' });
            }
            const slotRequest = await prisma_1.default.slotRequest.findUnique({
                where: { id }
            });
            if (!slotRequest) {
                return res.status(404).json({ error: `Slot request ${id} not found` });
            }
            let totalAllocated = 0;
            // Reset existing allocations for this request to 0 so new clinic choices take full effect
            await prisma_1.default.slotAllocation.updateMany({
                where: { slotRequestId: id },
                data: { allocatedSlots: 0 }
            });
            for (const [vendorId, countRaw] of Object.entries(allocations)) {
                const count = Math.max(0, parseInt(String(countRaw), 10) || 0);
                if (count > 0) {
                    totalAllocated += count;
                    await prisma_1.default.slotAllocation.upsert({
                        where: {
                            slotRequestId_vendorId: {
                                slotRequestId: id,
                                vendorId
                            }
                        },
                        update: {
                            allocatedSlots: count
                        },
                        create: {
                            slotRequestId: id,
                            vendorId,
                            allocatedSlots: count
                        }
                    });
                }
            }
            const effectiveStatus = status || (totalAllocated >= slotRequest.requestedSlots ? 'CONFIRMED' : 'ALLOCATED');
            const updated = await prisma_1.default.slotRequest.update({
                where: { id },
                data: {
                    allocatedSlots: totalAllocated,
                    status: effectiveStatus
                },
                include: {
                    allocations: {
                        include: { vendor: true }
                    }
                }
            });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Central Medical Team',
                role: req.user?.role || 'CENTRAL',
                action: 'CONFIRM_SLOT_ALLOCATION',
                entityType: 'SlotRequest',
                entityId: id,
                details: `Confirmed clinic allocation for ${id}: ${totalAllocated} of ${slotRequest.requestedSlots} slots distributed`
            });
            return res.json({
                success: true,
                slotRequest: updated,
                message: `Confirmed allocation for ${id}: ${totalAllocated} of ${slotRequest.requestedSlots} slots allocated.`
            });
        }
        catch (e) {
            console.error('Error confirming slot allocation:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * GET /api/slots/by-clinic
     * Returns allocation summary grouped by clinic (Tab 2)
     */
    static async listByClinic(req, res) {
        try {
            const vendors = await prisma_1.default.vendor.findMany({
                where: { isActive: true },
                include: {
                    slotAllocations: {
                        include: {
                            slotRequest: {
                                include: { test: true }
                            }
                        }
                    }
                },
                orderBy: { code: 'asc' }
            });
            const clinics = vendors.map(v => {
                let displayName = v.name;
                if (v.code === 'ARZ')
                    displayName = 'Ar Raji Medical';
                else if (v.code === 'BAK')
                    displayName = 'Badr Al Khaleej Medical Center';
                else if (v.code === 'DINA')
                    displayName = 'Dina Medical Center';
                else if (v.code === 'GAMC')
                    displayName = 'Gulf Asian Medical Center';
                const activeAllocations = v.slotAllocations
                    .filter(a => a.allocatedSlots > 0)
                    .map(a => ({
                    slotRequestId: a.slotRequestId,
                    title: a.slotRequest.title,
                    testName: a.slotRequest.test?.name || a.slotRequest.title,
                    department: a.slotRequest.department,
                    plant: a.slotRequest.plant,
                    allocatedSlots: a.allocatedSlots,
                    status: a.slotRequest.status
                }));
                const totalSlots = activeAllocations.reduce((sum, a) => sum + a.allocatedSlots, 0);
                return {
                    id: v.id,
                    code: v.code,
                    name: displayName,
                    sapVendorNo: v.sapVendorNo,
                    crNumber: v.crNumber,
                    vatNumber: v.vatNumber,
                    tier: v.tier || 'Tier 1 Primary',
                    saudization: v.saudization || 40.0,
                    totalAllocatedSlots: totalSlots,
                    allocationsCount: activeAllocations.length,
                    allocations: activeAllocations
                };
            });
            return res.json({ clinics });
        }
        catch (e) {
            console.error('Error fetching clinic allocations:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * GET /api/slots/price-comparison
     * Returns price comparison table across all approved clinics for all tests (Tab 3)
     */
    static async priceComparison(req, res) {
        try {
            const tests = await prisma_1.default.medicalTest.findMany({
                include: {
                    rates: {
                        include: {
                            contract: {
                                include: { vendor: true }
                            }
                        }
                    }
                },
                orderBy: { name: 'asc' }
            });
            const vendors = await prisma_1.default.vendor.findMany({
                where: { isActive: true },
                orderBy: { code: 'asc' }
            });
            const clinicDisplayOrder = ['ARZ', 'BAK', 'DINA', 'GAMC', 'JMC'];
            const clinicsHeader = vendors.map(v => {
                let displayName = v.name;
                if (v.code === 'ARZ')
                    displayName = 'Ar Raji Medical';
                else if (v.code === 'BAK')
                    displayName = 'Badr Al Khaleej Medical Center';
                else if (v.code === 'DINA')
                    displayName = 'Dina Medical Center';
                else if (v.code === 'GAMC')
                    displayName = 'Gulf Asian Medical Center';
                return {
                    id: v.id,
                    code: v.code,
                    name: displayName
                };
            });
            clinicsHeader.sort((a, b) => {
                const idxA = clinicDisplayOrder.indexOf(a.code);
                const idxB = clinicDisplayOrder.indexOf(b.code);
                if (idxA !== -1 && idxB !== -1)
                    return idxA - idxB;
                if (idxA !== -1)
                    return -1;
                if (idxB !== -1)
                    return 1;
                return a.name.localeCompare(b.name);
            });
            const comparison = tests.map(test => {
                const ratesByVendor = {};
                let minRate = Infinity;
                let lowestClinicName = '';
                let lowestClinicCode = '';
                test.rates.forEach(r => {
                    const v = r.contract.vendor;
                    const rateVal = Number(r.rate);
                    ratesByVendor[v.id] = rateVal;
                    if (rateVal > 0 && rateVal < minRate) {
                        minRate = rateVal;
                        lowestClinicName = v.name;
                        lowestClinicCode = v.code;
                    }
                });
                // Fallback default benchmarks if missing
                if (Object.keys(ratesByVendor).length === 0) {
                    ratesByVendor['V1'] = 110.0;
                    ratesByVendor['V2'] = 99.0;
                    ratesByVendor['V4'] = 105.0;
                    ratesByVendor['V5'] = 110.0;
                    minRate = 99.0;
                    lowestClinicName = 'Gulf Asian Medical Centre';
                    lowestClinicCode = 'GAMC';
                }
                return {
                    testId: test.id,
                    testName: test.name,
                    validityMonths: test.validityMonths,
                    rates: ratesByVendor,
                    lowestRate: minRate === Infinity ? null : minRate,
                    lowestClinicName,
                    lowestClinicCode
                };
            });
            return res.json({
                clinics: clinicsHeader,
                tests: comparison
            });
        }
        catch (e) {
            console.error('Error fetching price comparison:', e);
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.SlotsController = SlotsController;
