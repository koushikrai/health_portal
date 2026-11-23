"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotsController = void 0;
const auditService_1 = require("../services/auditService");
const settingsService_1 = require("../services/settingsService");
const slotRepository_1 = require("../repositories/slotRepository");
const vendorRepository_1 = require("../repositories/vendorRepository");
const requestRepository_1 = require("../repositories/requestRepository");
const employeeRepository_1 = require("../repositories/employeeRepository");
const masterRepository_1 = require("../repositories/masterRepository");
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
            const slotRequests = await slotRepository_1.SlotRepository.listOrderByIdDesc();
            // Fetch all active vendors (specifically the 4 in the screenshot: ARZ, BAK, DINA, GAMC + JMC)
            const vendors = await vendorRepository_1.VendorRepository.listActive();
            // Pre-fetch all MedicalRequest records linked to slot requests to compute assignment counts
            const slotReqIds = slotRequests.map(s => s.id);
            const allSlotRequests = await requestRepository_1.RequestRepository.findRequestsForSlotIds(slotReqIds);
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
                // Compute total assigned to this slot
                const srReqs = allSlotRequests.filter(r => r.id.startsWith(`${sr.id}-`) || (r.note && r.note.includes(sr.id)));
                const totalAssigned = srReqs.length;
                const remainingSlots = Math.max(0, sr.requestedSlots - totalAssigned);
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
                    const clinicAssigned = srReqs.filter(r => r.vendorId === a.vendorId).length;
                    return {
                        vendorId: a.vendorId,
                        vendorCode: a.vendor.code,
                        vendorName: dName,
                        allocatedSlots: a.allocatedSlots,
                        assignedSlots: clinicAssigned,
                        remainingSlots: Math.max(0, a.allocatedSlots - clinicAssigned)
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
                    assignedSlots: totalAssigned,
                    remainingSlots,
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
            const existingSr = await slotRepository_1.SlotRepository.listAllIds();
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
                const test = await masterRepository_1.MasterRepository.findTestById(testId);
                if (test)
                    effectiveTitle = test.name;
            }
            if (!effectiveTitle)
                effectiveTitle = 'General Medical Fitness';
            const slotRequest = await slotRepository_1.SlotRepository.create({
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
            });
            // Pre-seed 0-allocations for the primary clinics
            const vendors = await vendorRepository_1.VendorRepository.listAll();
            for (const v of vendors) {
                await slotRepository_1.SlotRepository.createAllocation(slotRequest.id, v.id, 0);
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
            const slotRequest = await slotRepository_1.SlotRepository.findById(id);
            if (!slotRequest) {
                return res.status(404).json({ error: `Slot request ${id} not found` });
            }
            let totalAllocated = 0;
            // Reset existing allocations for this request to 0 so new clinic choices take full effect
            await slotRepository_1.SlotRepository.resetAllocationsForSlot(id);
            for (const [vendorId, countRaw] of Object.entries(allocations)) {
                const count = Math.max(0, parseInt(String(countRaw), 10) || 0);
                if (count > 0) {
                    totalAllocated += count;
                    await slotRepository_1.SlotRepository.upsertAllocation(id, vendorId, count);
                }
            }
            const effectiveStatus = status || (totalAllocated >= slotRequest.requestedSlots ? 'CONFIRMED' : 'ALLOCATED');
            const updated = await slotRepository_1.SlotRepository.update(id, {
                allocatedSlots: totalAllocated,
                status: effectiveStatus
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
            const vendors = await vendorRepository_1.VendorRepository.listActiveWithSlotAllocations();
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
            const tests = await masterRepository_1.MasterRepository.getTestsWithRates('name');
            const vendors = await vendorRepository_1.VendorRepository.listActive();
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
                return {
                    testId: test.id,
                    testName: test.name,
                    validityMonths: test.validityMonths,
                    rates: ratesByVendor,
                    lowestRate: minRate === Infinity ? null : minRate,
                    lowestClinicName: lowestClinicName || null,
                    lowestClinicCode: lowestClinicCode || null
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
    /**
     * GET /api/slots/:id/assignments
     * Returns list of employees assigned to a pre-booked slot reservation
     */
    static async listAssignments(req, res) {
        try {
            const { id } = req.params;
            const slotRequest = await slotRepository_1.SlotRepository.findById(id);
            if (!slotRequest) {
                return res.status(404).json({ error: `Slot request ${id} not found` });
            }
            // Fetch all medical requests linked to this slot via Data Tier
            const requests = await requestRepository_1.RequestRepository.findRequestsForSlot(id, true);
            // Clinic breakdown
            const clinicStats = slotRequest.allocations
                .filter(a => a.allocatedSlots > 0)
                .map(a => {
                const assignedToClinic = requests.filter(r => r.vendorId === a.vendorId).length;
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
                    allocatedSlots: a.allocatedSlots,
                    assignedSlots: assignedToClinic,
                    remainingSlots: Math.max(0, a.allocatedSlots - assignedToClinic)
                };
            });
            const totalAllocated = slotRequest.allocations.reduce((sum, a) => sum + a.allocatedSlots, 0);
            const totalAssigned = requests.length;
            const remainingSlots = Math.max(0, slotRequest.requestedSlots - totalAssigned);
            const formattedAssignments = requests.map(r => ({
                requestId: r.id,
                employeeId: r.employeeId,
                employeeNo: r.employee.employeeNo,
                name: r.employee.name,
                department: r.department || r.employee.department || slotRequest.department,
                position: r.employee.position || 'Operations Crew',
                iqamaId: r.employee.iqamaId,
                vendorId: r.vendorId,
                vendorName: r.vendor?.name || 'Unassigned',
                vendorCode: r.vendor?.code || '—',
                testId: r.testId,
                testName: r.test.name,
                status: r.status,
                apptDate: r.apptDate || r.needByDate,
                reportResult: r.report?.result || null,
                reportFileUrl: r.report?.fileUrl || null,
                assignedAt: r.createdAt
            }));
            return res.json({
                slotRequest: {
                    id: slotRequest.id,
                    title: slotRequest.title,
                    testId: slotRequest.testId,
                    testName: slotRequest.test?.name || slotRequest.title,
                    department: slotRequest.department,
                    plant: slotRequest.plant,
                    requestedSlots: slotRequest.requestedSlots,
                    allocatedSlots: totalAllocated,
                    totalAssigned,
                    remainingSlots,
                    needByDate: slotRequest.needByDate,
                    status: slotRequest.status
                },
                clinicStats,
                assignments: formattedAssignments
            });
        }
        catch (e) {
            console.error('Error listing slot assignments:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * POST /api/slots/:id/assign-single
     * Assign an individual employee to a pre-booked slot reservation
     */
    static async assignSingle(req, res) {
        try {
            const { id } = req.params;
            const { employeeNo, employeeId, name, department, vendorId, apptDate, note } = req.body;
            const empIdentifier = String(employeeNo || employeeId || '').trim();
            if (!empIdentifier && !name) {
                return res.status(400).json({ error: 'Employee badge number, Iqama ID, or name required' });
            }
            const slotRequest = await slotRepository_1.SlotRepository.findById(id);
            if (!slotRequest) {
                return res.status(404).json({ error: `Slot request ${id} not found` });
            }
            // Check current assignment count
            const existingReqs = await requestRepository_1.RequestRepository.findRequestsForSlot(id, false);
            if (existingReqs.length >= slotRequest.requestedSlots) {
                return res.status(400).json({
                    error: `Slot quota for ${id} is fully assigned (${existingReqs.length}/${slotRequest.requestedSlots}). No vacant slots remaining.`
                });
            }
            // Find or create employee
            let emp = await employeeRepository_1.EmployeeRepository.findByIdOrBadge(empIdentifier);
            if (!emp && name) {
                if (!empIdentifier) {
                    return res.status(400).json({ error: 'Employee badge number or Iqama ID is required to register an employee.' });
                }
                emp = await employeeRepository_1.EmployeeRepository.create({
                    id: `EMP-${empIdentifier}`,
                    employeeNo: empIdentifier,
                    name,
                    department: department || slotRequest.department || 'PMTA',
                    status: 'Active'
                });
            }
            if (!emp) {
                return res.status(404).json({ error: `Employee '${empIdentifier}' not found in workforce directory. Please specify name to register.` });
            }
            // Check if employee already assigned to this slot
            const alreadyAssigned = existingReqs.some(r => r.employeeId === emp.id);
            if (alreadyAssigned) {
                return res.status(400).json({ error: `Employee ${emp.name} (${emp.employeeNo}) is already assigned to slot ${id}.` });
            }
            // Determine vendor
            let targetVendorId = vendorId;
            const activeClinics = slotRequest.allocations.filter(a => a.allocatedSlots > 0);
            if (!targetVendorId || targetVendorId === 'AUTO') {
                // Find first clinic with available capacity
                for (const clinic of activeClinics) {
                    const assignedToClinic = existingReqs.filter(r => r.vendorId === clinic.vendorId).length;
                    if (assignedToClinic < clinic.allocatedSlots) {
                        targetVendorId = clinic.vendorId;
                        break;
                    }
                }
                // Fallback to first allocated clinic or V1
                if (!targetVendorId) {
                    targetVendorId = activeClinics[0]?.vendorId || 'V1';
                }
            }
            // Generate sequence request ID
            const reqSeq = existingReqs.length + 1;
            const reqId = `${id}-${String(reqSeq).padStart(3, '0')}`;
            const notePayload = JSON.stringify({
                slotRequestId: id,
                slotTitle: slotRequest.title,
                assignedBy: req.user?.name || 'HR Coordinator',
                assignedAt: new Date().toISOString(),
                customNote: note || 'Assigned to advance pre-booked quota'
            });
            const effectiveTestId = slotRequest.testId || '5004955';
            const newRequest = await requestRepository_1.RequestRepository.create({
                id: reqId,
                employeeId: emp.id,
                testId: effectiveTestId,
                vendorId: targetVendorId,
                department: department || emp.department || slotRequest.department || 'PMTA',
                status: 'WAITING',
                apptDate: apptDate ? new Date(apptDate) : (slotRequest.needByDate || new Date()),
                needByDate: slotRequest.needByDate,
                note: notePayload,
                createdById: req.user?.id
            });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'HR Coordinator',
                role: req.user?.role || 'HR',
                action: 'ASSIGN_SLOT_EMPLOYEE',
                entityType: 'SlotRequest',
                entityId: id,
                details: `Assigned employee ${emp.name} (${emp.employeeNo}) to slot quota ${id} at ${newRequest.vendor?.name || targetVendorId}`
            });
            return res.status(201).json({
                success: true,
                assignment: {
                    requestId: newRequest.id,
                    employeeNo: emp.employeeNo,
                    name: emp.name,
                    department: newRequest.department,
                    vendorId: newRequest.vendorId,
                    vendorName: newRequest.vendor?.name,
                    testName: newRequest.test.name,
                    status: newRequest.status,
                    apptDate: newRequest.apptDate
                },
                message: `Successfully assigned ${emp.name} to slot ${id} at ${newRequest.vendor?.name || 'clinic'}!`
            });
        }
        catch (e) {
            console.error('Error assigning single employee to slot:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * POST /api/slots/:id/assign-bulk
     * Bulk assign employees to a pre-booked slot reservation
     */
    static async assignBulk(req, res) {
        try {
            const { id } = req.params;
            const { employees, vendorId, apptDate, note } = req.body;
            if (!Array.isArray(employees) || employees.length === 0) {
                return res.status(400).json({ error: 'Array of employees required for bulk slot assignment' });
            }
            const slotRequest = await slotRepository_1.SlotRepository.findById(id);
            if (!slotRequest) {
                return res.status(404).json({ error: `Slot request ${id} not found` });
            }
            // Get existing assignments
            const existingReqs = await requestRepository_1.RequestRepository.findRequestsForSlot(id, false);
            const remainingSlots = Math.max(0, slotRequest.requestedSlots - existingReqs.length);
            if (remainingSlots <= 0) {
                return res.status(400).json({
                    error: `Slot quota for ${id} is already full (${existingReqs.length}/${slotRequest.requestedSlots}). Cannot assign more employees.`
                });
            }
            const activeClinics = slotRequest.allocations.filter(a => a.allocatedSlots > 0);
            const isAutoDistribute = !vendorId || vendorId === 'AUTO';
            // Track clinic counts
            const clinicAllocMap = {};
            activeClinics.forEach(c => {
                const currentAssigned = existingReqs.filter(r => r.vendorId === c.vendorId).length;
                clinicAllocMap[c.vendorId] = {
                    allocated: c.allocatedSlots,
                    assigned: currentAssigned
                };
            });
            const createdList = [];
            const skippedList = [];
            const existingEmpIds = new Set(existingReqs.map(r => r.employeeId));
            const effectiveTestId = slotRequest.testId || '5004955';
            const toProcess = employees.slice(0, remainingSlots);
            for (let i = 0; i < toProcess.length; i++) {
                const item = toProcess[i];
                const empIdentifier = String(item.employeeNo || item.id || '').trim();
                if (!empIdentifier && !item.name) {
                    skippedList.push({ row: i + 1, employeeNo: '', reason: 'Missing badge number and name' });
                    continue;
                }
                let emp = await employeeRepository_1.EmployeeRepository.findByIdOrBadge(empIdentifier);
                if (!emp && item.name) {
                    if (!empIdentifier) {
                        skippedList.push({ row: i + 1, employeeNo: '', reason: 'Badge number or Iqama ID required' });
                        continue;
                    }
                    emp = await employeeRepository_1.EmployeeRepository.create({
                        id: `EMP-${empIdentifier}`,
                        employeeNo: empIdentifier,
                        name: item.name,
                        department: item.department || slotRequest.department || 'PMTA',
                        status: 'Active'
                    });
                }
                if (!emp) {
                    skippedList.push({ row: i + 1, employeeNo: empIdentifier, reason: 'Employee not found in directory' });
                    continue;
                }
                if (existingEmpIds.has(emp.id)) {
                    skippedList.push({ row: i + 1, employeeNo: emp.employeeNo, reason: 'Already assigned to this slot' });
                    continue;
                }
                // Determine vendor
                let assignedVendor = vendorId;
                if (isAutoDistribute) {
                    // Pick clinic that has the largest remaining capacity
                    let bestClinicId = activeClinics[0]?.vendorId || 'V1';
                    let maxRemaining = -Infinity;
                    for (const c of activeClinics) {
                        const stats = clinicAllocMap[c.vendorId];
                        if (stats) {
                            const rem = stats.allocated - stats.assigned;
                            if (rem > maxRemaining) {
                                maxRemaining = rem;
                                bestClinicId = c.vendorId;
                            }
                        }
                    }
                    assignedVendor = bestClinicId;
                    if (clinicAllocMap[assignedVendor]) {
                        clinicAllocMap[assignedVendor].assigned++;
                    }
                }
                const seq = existingReqs.length + createdList.length + 1;
                const reqId = `${id}-${String(seq).padStart(3, '0')}`;
                const notePayload = JSON.stringify({
                    slotRequestId: id,
                    slotTitle: slotRequest.title,
                    assignedBy: req.user?.name || 'HR Coordinator',
                    batchAssigned: true,
                    customNote: note || 'Bulk assigned to advance pre-booked quota'
                });
                const created = await requestRepository_1.RequestRepository.create({
                    id: reqId,
                    employeeId: emp.id,
                    testId: effectiveTestId,
                    vendorId: assignedVendor,
                    department: item.department || emp.department || slotRequest.department || 'PMTA',
                    status: 'WAITING',
                    apptDate: apptDate ? new Date(apptDate) : (slotRequest.needByDate || new Date()),
                    needByDate: slotRequest.needByDate,
                    note: notePayload,
                    createdById: req.user?.id
                });
                existingEmpIds.add(emp.id);
                createdList.push({
                    requestId: created.id,
                    employeeNo: emp.employeeNo,
                    name: emp.name,
                    department: created.department,
                    vendorName: created.vendor?.name
                });
            }
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'HR Coordinator',
                role: req.user?.role || 'HR',
                action: 'BULK_ASSIGN_SLOT_EMPLOYEES',
                entityType: 'SlotRequest',
                entityId: id,
                details: `Bulk assigned ${createdList.length} employees to slot quota ${id} (${slotRequest.title})`
            });
            return res.status(201).json({
                success: true,
                assignedCount: createdList.length,
                skippedCount: skippedList.length,
                skipped: skippedList,
                assignments: createdList,
                message: `Successfully assigned ${createdList.length} employees to slot reservation ${id}!`
            });
        }
        catch (e) {
            console.error('Error bulk assigning employees to slot:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * DELETE /api/slots/:id/assignments/:requestId
     * Unassign an employee from a pre-booked slot reservation
     */
    static async unassignEmployee(req, res) {
        try {
            const { id, requestId } = req.params;
            const reqRecord = await requestRepository_1.RequestRepository.findById(requestId);
            if (!reqRecord) {
                return res.status(404).json({ error: `Medical request ${requestId} not found` });
            }
            // If report already completed/uploaded, do not delete; cancel request
            if (reqRecord.report) {
                await requestRepository_1.RequestRepository.update(requestId, { status: 'CANCELLED' });
            }
            else {
                await requestRepository_1.RequestRepository.deleteById(requestId);
            }
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'HR Coordinator',
                role: req.user?.role || 'HR',
                action: 'UNASSIGN_SLOT_EMPLOYEE',
                entityType: 'SlotRequest',
                entityId: id,
                details: `Unassigned employee ${reqRecord.employee.name} (${reqRecord.employee.employeeNo}) from slot ${id}`
            });
            return res.json({
                success: true,
                message: `Successfully unassigned ${reqRecord.employee.name} from slot ${id}. Slot capacity restored.`
            });
        }
        catch (e) {
            console.error('Error unassigning employee from slot:', e);
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.SlotsController = SlotsController;
