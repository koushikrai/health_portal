const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../client/src/views/SlotPortalView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update loadQueueData to default to the 4 clinics shown in screenshot (V4, V1, V5, V2)
const oldLoadTarget = `        // Initialize dynamic rows for each request
        const initialRowsMap: Record<string, AllocationRow[]> = {};

        fetchedQueue.forEach((req) => {
          const active = (req.activeAllocations && req.activeAllocations.length > 0)
            ? req.activeAllocations
            : (req.allocations
                ? Object.entries(req.allocations)
                    .filter(([_, slots]) => (slots as number) > 0)
                    .map(([vId, slots]) => ({
                      vendorId: vId,
                      vendorCode: '',
                      vendorName: '',
                      allocatedSlots: slots as number
                    }))
                : []);

          if (active.length > 0) {
            initialRowsMap[req.id] = active.map(a => ({
              vendorId: a.vendorId,
              slots: a.allocatedSlots
            }));
          } else {
            // If completely unassigned, default to 1-2 clinic rows with dropdowns
            const defaultClinic1 = fetchedClinics[0]?.id || 'V4';
            const defaultClinic2 = fetchedClinics[1]?.id || 'V1';
            initialRowsMap[req.id] = [
              { vendorId: defaultClinic1, slots: 0 },
              { vendorId: defaultClinic2, slots: 0 }
            ];
          }
        });`;

const newLoadReplacement = `        // Initialize dynamic 4-column layout matching screenshot (Ar Raji, Badr Al Khaleej, Dina, Gulf Asian)
        const initialRowsMap: Record<string, AllocationRow[]> = {};
        const primaryClinicIds = ['V4', 'V1', 'V5', 'V2'];

        fetchedQueue.forEach((req) => {
          const allocMap: Record<string, number> = {};
          if (req.allocations) {
            Object.entries(req.allocations).forEach(([vId, val]) => {
              allocMap[vId] = typeof val === 'number' ? val : 0;
            });
          }
          if (req.activeAllocations) {
            req.activeAllocations.forEach(a => {
              allocMap[a.vendorId] = a.allocatedSlots;
            });
          }

          // Build row list starting with the 4 primary clinics
          const rows: AllocationRow[] = primaryClinicIds.map(vId => ({
            vendorId: vId,
            slots: allocMap[vId] || 0
          }));

          // If there are other clinics with allocations not in primaryClinicIds, append them
          Object.entries(allocMap).forEach(([vId, slots]) => {
            if (!primaryClinicIds.includes(vId) && slots > 0) {
              rows.push({ vendorId: vId, slots });
            }
          });

          initialRowsMap[req.id] = rows;
        });`;

if (!content.includes(oldLoadTarget)) {
  console.error("Could not find oldLoadTarget in SlotPortalView.tsx");
  process.exit(1);
}
content = content.replace(oldLoadTarget, newLoadReplacement);

// 2. Add handleAssignAllToThisColumn helper
const oldAssignHelper = `  // Assign ALL slots to a single clinic
  const handleAssignAllToOneClinic = (reqId: string, requestedTotal: number) => {`;

const newAssignHelper = `  // Assign ALL slots to a specific column clinic
  const handleAssignAllToThisColumn = (reqId: string, colIndex: number, requestedTotal: number) => {
    setCardClinicRows(prev => {
      const rows = [...(prev[reqId] || [])].map((r, idx) => ({
        ...r,
        slots: idx === colIndex ? requestedTotal : 0
      }));
      return { ...prev, [reqId]: rows };
    });
    showToast(\`Assigned all \${requestedTotal} slots to column #\${colIndex + 1}. Click 'Confirm allocation' to save.\`);
  };

  // Assign ALL slots to a single clinic
  const handleAssignAllToOneClinic = (reqId: string, requestedTotal: number) => {`;

content = content.replace(oldAssignHelper, newAssignHelper);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated loadQueueData and helpers in SlotPortalView.tsx");
