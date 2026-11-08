"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsController = void 0;
const client_1 = require("@prisma/client");
const auditService_1 = require("../services/auditService");
const requestRepository_1 = require("../repositories/requestRepository");
const employeeRepository_1 = require("../repositories/employeeRepository");
const vendorRepository_1 = require("../repositories/vendorRepository");
const masterRepository_1 = require("../repositories/masterRepository");
class RequestsController {
    static async list(req, res) {
        try {
            const status = req.query.status;
            const vendorId = req.query.vendorId;
            const search = (req.query.search || '').trim();
            const effectiveVendorId = req.user?.role === 'CLINIC'
                ? (req.user.vendorId || '__NO_VENDOR__')
                : vendorId;
            const requests = await requestRepository_1.RequestRepository.list({
                status,
                vendorId: effectiveVendorId,
                search
            });
            return res.json({ requests });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async create(req, res) {
        try {
            const { employeeId, employeeName, department, testId, needByDate, note, batchId } = req.body;
            if (!employeeId || !testId) {
                return res.status(400).json({ error: 'employeeId and testId are required' });
            }
            let emp = await employeeRepository_1.EmployeeRepository.findByIdOrBadge(employeeId);
            if (!emp && employeeName) {
                emp = await employeeRepository_1.EmployeeRepository.create({
                    id: `EMP-${employeeId}`,
                    employeeNo: employeeId,
                    name: employeeName,
                    department: department || 'LOGISTIC',
                    status: 'Active'
                });
            }
            if (!emp)
                return res.status(404).json({ error: 'Employee not found. Please provide employeeName to create new record.' });
            let createdRequest = null;
            let attempts = 0;
            while (!createdRequest && attempts < 5) {
                attempts++;
                let requestId = await requestRepository_1.RequestRepository.getNextRequestId();
                if (batchId) {
                    const batchCount = await requestRepository_1.RequestRepository.count({
                        id: { startsWith: `${batchId}-` }
                    });
                    requestId = `${batchId}-${String(batchCount + attempts).padStart(2, '0')}`;
                }
                try {
                    createdRequest = await requestRepository_1.RequestRepository.create({
                        id: requestId,
                        employeeId: emp.id,
                        testId,
                        department: department || emp.division || emp.department || 'PMTA',
                        status: client_1.RequestStatus.WAITING,
                        needByDate: needByDate ? new Date(needByDate) : null,
                        note: typeof note === 'object' ? JSON.stringify(note) : (note || ''),
                        createdById: req.user?.id
                    });
                }
                catch (err) {
                    if (err.code === 'P2002' && attempts < 5) {
                        continue;
                    }
                    throw err;
                }
            }
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Requester',
                role: req.user?.role || 'REQUESTER',
                action: 'CREATE_REQUEST',
                entityType: 'MedicalRequest',
                entityId: createdRequest.id,
                details: `Created medical request ${createdRequest.id} for employee ${emp.name} (${createdRequest.test.name})`
            });
            return res.status(201).json({ request: createdRequest });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async bulkCreate(req, res) {
        try {
            const { requests, batchName, fileName, plant } = req.body;
            if (!Array.isArray(requests) || requests.length === 0) {
                return res.status(400).json({ error: 'Array of requests required' });
            }
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const existingBatchesCount = await requestRepository_1.RequestRepository.count();
            const batchId = `BULK-${dateStr}-${String(existingBatchesCount + 1).padStart(4, '0')}`;
            const effectiveBatchName = batchName || (fileName ? `Upload: ${fileName}` : `Bulk Batch ${batchId}`);
            const createdList = [];
            const skipped = [];
            let rowIdx = 1;
            for (const item of requests) {
                const empIdentifier = String(item.employeeNo || item.employeeId || '').trim();
                if (!empIdentifier) {
                    skipped.push({ row: rowIdx, employeeNo: '', reason: 'Missing employee number / Iqama ID' });
                    rowIdx++;
                    continue;
                }
                let emp = await employeeRepository_1.EmployeeRepository.findByIdOrBadge(empIdentifier);
                if (!emp && (item.name || item.employeeName)) {
                    emp = await employeeRepository_1.EmployeeRepository.create({
                        id: `EMP-${empIdentifier}`,
                        employeeNo: empIdentifier,
                        name: item.name || item.employeeName,
                        department: item.department || 'LOGISTIC',
                        division: plant || 'ECC Facility',
                        iqamaId: empIdentifier.length === 10 ? empIdentifier : undefined,
                        status: 'Active'
                    });
                }
                if (!emp) {
                    skipped.push({ row: rowIdx, employeeNo: empIdentifier, reason: 'Employee not found in registry' });
                    rowIdx++;
                    continue;
                }
                const reqId = `${batchId}-${String(createdList.length + 1).padStart(2, '0')}`;
                const notePayload = JSON.stringify({
                    batchId,
                    batchName: effectiveBatchName,
                    fileName: fileName || null,
                    plant: plant || emp.division || 'Main Complex',
                    rowNote: item.note || 'Bulk upload request'
                });
                const r = await requestRepository_1.RequestRepository.create({
                    id: reqId,
                    employeeId: emp.id,
                    testId: item.testId || '5004959',
                    department: item.department || emp.division || emp.department || 'PMTA',
                    status: client_1.RequestStatus.WAITING,
                    needByDate: item.needByDate ? new Date(item.needByDate) : null,
                    note: notePayload,
                    createdById: req.user?.id
                });
                createdList.push(r);
                rowIdx++;
            }
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Requester',
                role: req.user?.role || 'REQUESTER',
                action: 'BULK_CREATE_REQUEST',
                entityType: 'MedicalRequest',
                details: `Bulk created ${createdList.length} clearance requests for batch ${effectiveBatchName} (${batchId})`
            });
            return res.json({
                count: createdList.length,
                batchId,
                batchName: effectiveBatchName,
                created: createdList,
                skipped
            });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async listBatches(req, res) {
        try {
            const allRequests = await requestRepository_1.RequestRepository.findAllWithDetails();
            const batchMap = {};
            for (const r of allRequests) {
                let meta = {};
                if (r.note) {
                    try {
                        meta = typeof r.note === 'string' ? JSON.parse(r.note) : r.note;
                    }
                    catch (_) { }
                }
                let bId = meta.batchId || meta.slotRequestId;
                if (!bId) {
                    if (r.id.startsWith('REQ-2026-0104'))
                        bId = 'REQ-2026-0104';
                    else if (r.id.startsWith('REQ-2026-0101'))
                        bId = 'REQ-2026-0101';
                    else if (r.id.startsWith('REQ-2026-0102'))
                        bId = 'REQ-2026-0102';
                    else if (r.id.startsWith('REQ-2026-0103'))
                        bId = 'REQ-2026-0103';
                    else if (r.id.startsWith('BULK-'))
                        bId = r.id.split('-').slice(0, 3).join('-');
                    else if (r.id.startsWith('SR-'))
                        bId = r.id.split('-').slice(0, 2).join('-');
                    else
                        continue;
                }
                if (!batchMap[bId]) {
                    let defaultTitle = meta.slotTitle || meta.batchName || r.test.name;
                    let plant = meta.plant || r.employee.division || r.department || (bId.startsWith('SR-') ? 'Sadara Complex (Jubail)' : 'Main Complex');
                    if (bId === 'REQ-2026-0104') {
                        defaultTitle = 'Yanpet medical test';
                        plant = 'Yanpet Plant';
                    }
                    else if (bId === 'REQ-2026-0101') {
                        defaultTitle = 'Sadara medical test';
                        plant = 'Complex South';
                    }
                    else if (bId === 'REQ-2026-0102') {
                        defaultTitle = 'SABIC medical screening with TSH';
                        plant = 'Jubail Site';
                    }
                    else if (bId === 'REQ-2026-0103') {
                        defaultTitle = 'General medical fitness';
                        plant = 'Logistics Wing';
                    }
                    batchMap[bId] = {
                        id: bId,
                        title: defaultTitle,
                        plant,
                        uploadedAt: r.createdAt,
                        fileName: meta.fileName || null,
                        totalEmployees: 0,
                        doneCount: 0,
                        pendingCount: 0,
                        assignedCount: 0,
                        employees: []
                    };
                }
                const b = batchMap[bId];
                b.totalEmployees++;
                const isDone = r.status === client_1.RequestStatus.COMPLETED || Boolean(r.report);
                if (isDone) {
                    b.doneCount++;
                }
                else {
                    b.pendingCount++;
                }
                if (r.vendorId) {
                    b.assignedCount++;
                }
                b.employees.push({
                    id: r.id,
                    employeeId: r.employee.id,
                    employeeNo: r.employee.employeeNo,
                    employeeName: r.employee.name,
                    iqamaId: r.employee.iqamaId,
                    department: r.department || r.employee.department,
                    testName: r.test.name,
                    status: r.status,
                    isDone,
                    assignedClinic: r.vendor ? r.vendor.name : null,
                    assignedClinicCode: r.vendor ? r.vendor.code : null,
                    apptDate: r.apptDate,
                    reportId: r.report ? r.report.id : null,
                    reportFileUrl: r.report ? r.report.fileUrl : null
                });
            }
            const batches = Object.values(batchMap).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
            return res.json({ batches });
        }
        catch (e) {
            console.error('List batches error:', e);
            return res.status(500).json({ error: e.message });
        }
    }
    static async batchAssign(req, res) {
        try {
            const { requestIds, vendorId, apptDate } = req.body;
            if (!Array.isArray(requestIds) || !vendorId) {
                return res.status(400).json({ error: 'requestIds array and vendorId are required' });
            }
            const vendor = await vendorRepository_1.VendorRepository.findById(vendorId);
            if (!vendor)
                return res.status(404).json({ error: 'Clinic vendor not found' });
            const existingRequests = await requestRepository_1.RequestRepository.findManyByIds(requestIds);
            const foundIds = existingRequests.map(r => r.id);
            const notFound = requestIds.filter(id => !foundIds.includes(id));
            if (foundIds.length === 0) {
                return res.status(400).json({ error: 'None of the provided request IDs exist', notFound });
            }
            // Filter out completed requests
            const assignable = existingRequests.filter(r => r.status !== client_1.RequestStatus.COMPLETED);
            const assignableIds = assignable.map(r => r.id);
            // Find active clinic slot via Data Tier
            const activeSlot = await masterRepository_1.MasterRepository.findLatestClinicSlotByVendor(vendorId);
            const updateData = {
                vendorId,
                slotId: activeSlot?.id,
                status: apptDate ? client_1.RequestStatus.SCHEDULED : client_1.RequestStatus.SUBMITTED
            };
            if (apptDate) {
                updateData.apptDate = new Date(apptDate);
            }
            await requestRepository_1.RequestRepository.updateMany(assignableIds, updateData);
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Central Team',
                role: req.user?.role || 'CENTRAL',
                action: apptDate ? 'BATCH_ASSIGN_AND_SCHEDULE' : 'BATCH_ASSIGN_CLINIC',
                entityType: 'MedicalRequest',
                details: `Assigned ${assignableIds.length} requests (${assignableIds.join(', ')}) to clinic ${vendor.name}${apptDate ? ` scheduled for ${apptDate}` : ''}`
            });
            return res.json({
                message: `Successfully assigned ${assignableIds.length} requests to ${vendor.name}${apptDate ? ` on ${new Date(apptDate).toLocaleDateString()}` : ''}`,
                assignedCount: assignableIds.length,
                notFound
            });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async scheduleAppointment(req, res) {
        try {
            const { id } = req.params;
            const { apptDate, note } = req.body;
            if (!apptDate)
                return res.status(400).json({ error: 'apptDate required' });
            const existing = await requestRepository_1.RequestRepository.findById(id);
            if (!existing)
                return res.status(404).json({ error: 'Request not found' });
            // Guardrail: clinic users cannot schedule for other clinics
            if (req.user?.role === 'CLINIC' && existing.vendorId !== req.user.vendorId) {
                return res.status(403).json({ error: 'Forbidden: Cannot schedule appointments for another clinic' });
            }
            // Ensure request is assigned to a clinic vendor
            if (!existing.vendorId) {
                return res.status(400).json({ error: 'Request must be assigned to a clinic facility before scheduling' });
            }
            const updatePayload = {
                apptDate: new Date(apptDate),
                status: client_1.RequestStatus.SCHEDULED
            };
            if (note) {
                updatePayload.note = note;
            }
            const request = await requestRepository_1.RequestRepository.update(id, updatePayload);
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Medical Coordinator',
                role: req.user?.role || 'CENTRAL',
                action: 'SCHEDULE_APPOINTMENT',
                entityType: 'MedicalRequest',
                entityId: id,
                details: `Scheduled medical exam for ${request.employee.name} on ${new Date(apptDate).toLocaleDateString()}`
            });
            return res.json({ request });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async cancel(req, res) {
        try {
            const { id } = req.params;
            const existing = await requestRepository_1.RequestRepository.findById(id);
            if (!existing)
                return res.status(404).json({ error: 'Request not found' });
            if (existing.status === client_1.RequestStatus.COMPLETED) {
                return res.status(409).json({ error: 'Cannot cancel an already completed clearance request' });
            }
            const request = await requestRepository_1.RequestRepository.update(id, { status: client_1.RequestStatus.CANCELLED });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'User',
                role: req.user?.role || 'REQUESTER',
                action: 'CANCEL_REQUEST',
                entityType: 'MedicalRequest',
                entityId: id,
                details: `Cancelled medical request ${id}`
            });
            return res.json({ request });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async reject(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const existing = await requestRepository_1.RequestRepository.findById(id);
            if (!existing)
                return res.status(404).json({ error: 'Request not found' });
            if (existing.status === client_1.RequestStatus.COMPLETED) {
                return res.status(409).json({ error: 'Cannot reject an already completed clearance request' });
            }
            const request = await requestRepository_1.RequestRepository.update(id, {
                status: client_1.RequestStatus.REJECTED,
                note: reason ? `Rejected: ${reason}` : 'Rejected by Central Team'
            });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Central Team',
                role: req.user?.role || 'CENTRAL',
                action: 'REJECT_REQUEST',
                entityType: 'MedicalRequest',
                entityId: id,
                details: `Rejected request ${id}. Reason: ${reason || 'N/A'}`
            });
            return res.json({ request });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { note, apptDate, status, department, vendorId } = req.body;
            const existing = await requestRepository_1.RequestRepository.findById(id);
            if (!existing)
                return res.status(404).json({ error: 'Request not found' });
            // Guardrail: clinic role cannot update request of another clinic
            if (req.user?.role === 'CLINIC' && existing.vendorId !== req.user.vendorId) {
                return res.status(403).json({ error: 'Forbidden: Cannot update requests for another clinic' });
            }
            const updateData = {};
            if (note !== undefined)
                updateData.note = typeof note === 'object' ? JSON.stringify(note) : String(note);
            if (apptDate !== undefined)
                updateData.apptDate = apptDate ? new Date(apptDate) : null;
            if (department !== undefined)
                updateData.department = department;
            if (vendorId !== undefined) {
                updateData.vendorId = vendorId === null || vendorId === '' ? null : vendorId;
                if (!vendorId) {
                    updateData.slotId = null;
                    if (existing.status !== client_1.RequestStatus.COMPLETED) {
                        updateData.status = client_1.RequestStatus.WAITING;
                    }
                }
                else if (existing.status === client_1.RequestStatus.WAITING) {
                    updateData.status = client_1.RequestStatus.SUBMITTED;
                }
            }
            if (status !== undefined) {
                const validStatuses = Object.values(client_1.RequestStatus);
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({ error: `Invalid status '${status}'. Allowed: ${validStatuses.join(', ')}` });
                }
                if (existing.status === client_1.RequestStatus.COMPLETED && status !== client_1.RequestStatus.COMPLETED) {
                    return res.status(409).json({ error: 'Cannot alter status of an already completed clearance request' });
                }
                updateData.status = status;
            }
            const request = await requestRepository_1.RequestRepository.update(id, updateData);
            return res.json({ request });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.RequestsController = RequestsController;
