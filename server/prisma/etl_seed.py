import openpyxl
import datetime
import bcrypt
import os

# Helper to escape SQL string
def sql_val(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, datetime.datetime):
        return f"'{v.strftime('%Y-%m-%d %H:%M:%S')}'"
    if isinstance(v, datetime.date):
        return f"'{v.strftime('%Y-%m-%d')}'"
    s = str(v).replace("'", "''")
    return f"'{s}'"

print("Starting ETL Seeding Process...")

# 1. Load Medical_Clearance_Masters.xlsx
wb_masters = openpyxl.load_workbook(r"docs\Medical_Clearance_Masters.xlsx", data_only=True)

sql_lines = []
sql_lines.append("BEGIN;")
sql_lines.append("TRUNCATE TABLE \"AuditLog\", \"InvoiceLineItem\", \"Invoice\", \"MedicalReport\", \"MedicalRequest\", \"ClinicSlot\", \"ContractRate\", \"Contract\", \"Employee\", \"MedicalTest\", \"Vendor\", \"DepartmentMapping\", \"Department\", \"User\" CASCADE;")

# A. Departments
ws_depts = wb_masters["Departments"]
dept_rows = list(ws_depts.iter_rows(values_only=True))
print(f"Loading {len(dept_rows)-1} departments...")
for r in dept_rows[1:]:
    did, dcode, dstatus, demps, dnote = r[0], r[1], r[2], r[3], r[4]
    if did and dcode:
        sql_lines.append(f"INSERT INTO \"Department\" (id, code, name, status, \"cleanupNote\") VALUES ({sql_val(did)}, {sql_val(dcode)}, {sql_val(dcode)}, {sql_val(dstatus or 'Active')}, {sql_val(dnote)});")

# B. Dept Raw Mapping
ws_map = wb_masters["Dept Raw Mapping"]
map_rows = list(ws_map.iter_rows(values_only=True))
print(f"Loading {len(map_rows)-1} department mappings...")
import uuid
for r in map_rows[1:]:
    raw_val, master_code, action, emps = r[0], r[1], r[2], r[3]
    if raw_val and master_code:
        mid = str(uuid.uuid4())
        sql_lines.append(f"INSERT INTO \"DepartmentMapping\" (id, \"rawValue\", \"masterCode\", action) VALUES ({sql_val(mid)}, {sql_val(raw_val)}, {sql_val(master_code)}, {sql_val(action)});")

# C. Medical Tests
ws_tests = wb_masters["Medical Tests"]
test_rows = list(ws_tests.iter_rows(values_only=True))
print(f"Loading {len(test_rows)-1} medical tests...")
for r in test_rows[1:]:
    tcode, tdesc, ttype, tmonths, tvat, tclinics, tsrc, tnotes = r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]
    if tcode and tdesc:
        months_val = int(tmonths) if tmonths is not None else 0
        vat_bool = True if str(tvat).strip().lower() in ['yes', 'true', '1'] else False
        sql_lines.append(f"INSERT INTO \"MedicalTest\" (id, name, \"testType\", \"validityMonths\", \"isVatInclusive\", \"ratedClinics\", \"codeSource\", notes) VALUES ({sql_val(str(tcode))}, {sql_val(tdesc)}, {sql_val(ttype or 'Fitness test')}, {months_val}, {sql_val(vat_bool)}, {sql_val(tclinics)}, {sql_val(tsrc)}, {sql_val(tnotes)});")

# D. Clinics
ws_clinics = wb_masters["Clinics"]
clinic_rows = list(ws_clinics.iter_rows(values_only=True))
print(f"Loading {len(clinic_rows)-1} clinics...")

# Map of clinic code to generated Vendor ID
clinic_id_map = {
    'BAK': 'V1',
    'GAMC': 'V2',
    'JMC': 'V3',
    'ARZ': 'V4',
    'DINA': 'V5'
}

contracts_to_seed = []

for r in clinic_rows[1:]:
    code, name, sap_no, contract_no, quote, c_start, c_end, inv_method, pay_terms, ag_file, rated_tests, c_status, c_notes = r
    if code:
        vid = clinic_id_map.get(str(code).strip(), f"V_{code}")
        cr_no = '2051028391' if code == 'BAK' else ('2050189421' if code == 'GAMC' else '2055001243')
        vat_no = '300412894400003' if code == 'BAK' else ('310198421000003' if code == 'GAMC' else '300184719200003')
        tier = 'Tier 1 Primary' if code in ['BAK', 'GAMC'] else 'Tier 2 Subcontractor'
        saud = 42.5 if code == 'BAK' else (36.8 if code == 'GAMC' else 34.2)
        
        sql_lines.append(f"INSERT INTO \"Vendor\" (id, code, name, \"sapVendorNo\", \"crNumber\", \"vatNumber\", tier, saudization, status, notes, \"isActive\") VALUES ({sql_val(vid)}, {sql_val(code)}, {sql_val(name)}, {sql_val(str(sap_no) if sap_no else None)}, {sql_val(cr_no)}, {sql_val(vat_no)}, {sql_val(tier)}, {saud}, {sql_val(c_status or 'Active')}, {sql_val(c_notes)}, TRUE);")
        
        if contract_no and c_start and c_end:
            cid = str(uuid.uuid4())
            contracts_to_seed.append({
                'cid': cid,
                'vid': vid,
                'code': code,
                'contract_no': str(contract_no),
                'quote': str(quote) if quote else None,
                'start': c_start,
                'end': c_end,
                'inv_method': str(inv_method or 'Ariba portal'),
                'pay_terms': int(pay_terms or 30),
                'ag_file': str(ag_file or ''),
                'notes': [str(c_notes)] if c_notes else []
            })

# E. Contracts & Clinic Rates
ws_rates = wb_masters["Clinic Test Rates"]
rate_rows = list(ws_rates.iter_rows(values_only=True))
print(f"Loading {len(rate_rows)-1} clinic test rates...")

contract_by_clinic = {}
for c in contracts_to_seed:
    contract_by_clinic[c['code']] = c['cid']
    notes_array = "ARRAY[" + ", ".join([sql_val(n) for n in c['notes']]) + "]::text[]" if c['notes'] else "ARRAY[]::text[]"
    sql_lines.append(f"INSERT INTO \"Contract\" (id, \"vendorId\", \"contractNo\", \"quoteNo\", \"startDate\", \"endDate\", \"invoicingType\", \"paymentTerms\", \"fileName\", notes, \"createdAt\") VALUES ({sql_val(c['cid'])}, {sql_val(c['vid'])}, {sql_val(c['contract_no'])}, {sql_val(c['quote'])}, {sql_val(c['start'])}, {sql_val(c['end'])}, {sql_val(c['inv_method'])}, {c['pay_terms']}, {sql_val(c['ag_file'])}, {notes_array}, NOW());")

for r in rate_rows[1:]:
    ccode, cname, sap_code, tdesc, rate, vat_incl, contract_no, vfrom, vto = r
    if ccode in contract_by_clinic and sap_code:
        c_id = contract_by_clinic[ccode]
        crid = str(uuid.uuid4())
        rate_val = float(rate) if rate is not None else 0.0
        vat_bool = True if str(vat_incl).strip().lower() in ['yes', 'true', '1'] else False
        sql_lines.append(f"INSERT INTO \"ContractRate\" (id, \"contractId\", \"testId\", rate, \"includesVat\") VALUES ({sql_val(crid)}, {sql_val(c_id)}, {sql_val(str(sap_code))}, {rate_val}, {sql_val(vat_bool)});")

# 2. Seed Users
print("Generating users with bcrypt password hashes...")
pw_hash = bcrypt.hashpw(b"Exp@2026", bcrypt.gensalt(10)).decode('utf-8')
admin_hash = bcrypt.hashpw(b"Admin@2026", bcrypt.gensalt(10)).decode('utf-8')

users = [
    ('u_hr', 'hr', 'Marcus Sterling', 'HR', None, pw_hash),
    ('u_req', 'requester', 'HSE Coordinator', 'REQUESTER', None, pw_hash),
    ('u_cen', 'central', 'Central Medical Team', 'CENTRAL', None, pw_hash),
    ('u_fin', 'finance', 'Finance Controller', 'FINANCE', None, pw_hash),
    ('u_adm', 'admin', 'System Administrator', 'ADMIN', None, admin_hash),
    ('u_bak', 'badr', 'Badr Al Khaleej Admin', 'CLINIC', 'V1', pw_hash),
    ('u_gamc', 'gulfasian', 'Gulf Asian Clinic Desk', 'CLINIC', 'V2', pw_hash),
    ('u_jmc', 'jubail', 'JMC Coordinator', 'CLINIC', 'V3', pw_hash),
    ('u_arz', 'arrazi', 'Arrazi Reception', 'CLINIC', 'V4', pw_hash),
    ('u_dina', 'dina', 'Dina Health Clinic', 'CLINIC', 'V5', pw_hash)
]

for uid, uname, name, role, vid, phash in users:
    sql_lines.append(f"INSERT INTO \"User\" (id, username, \"passwordHash\", name, role, \"vendorId\", \"isActive\", \"createdAt\", \"updatedAt\") VALUES ({sql_val(uid)}, {sql_val(uname)}, {sql_val(phash)}, {sql_val(name)}, '{role}'::\"Role\", {sql_val(vid)}, TRUE, NOW(), NOW());")

# 3. Load HR Master Data (docs/HR MASTER DATA-EXPERTISE.xlsx)
print("Loading HR Master Data from HR MASTER DATA-EXPERTISE.xlsx...")
wb_hr = openpyxl.load_workbook(r"docs\HR MASTER DATA-EXPERTISE.xlsx", read_only=True, data_only=True)
ws_hr = wb_hr['Active employees list']

emp_count = 0
iqama_seen = set()

# Load first 1200 real employees for lightning fast performance & rich testing
for i, r in enumerate(ws_hr.iter_rows(values_only=True)):
    if i == 0:
        continue
    if emp_count >= 1200:
        break
    
    emp_no, name, pos, div, join_date, dept, job, group, cost_c, cost_desc, ot, daily_hrs, status, gender, nat, iqama, t_prof, w_sched = r
    if not emp_no or not name:
        continue
        
    emp_str_no = str(emp_no).strip()
    iqama_str = str(iqama).strip() if iqama else None
    
    # Calculate representative hourly wage based on job level
    base_wage = 35.0
    pos_lower = str(pos or '').lower()
    if 'manager' in pos_lower:
        base_wage = 65.0
    elif 'engineer' in pos_lower or 'supervisor' in pos_lower:
        base_wage = 48.0
    elif 'technician' in pos_lower or 'welder' in pos_lower or 'rigg' in pos_lower:
        base_wage = 36.5
    elif 'driver' in pos_lower:
        base_wage = 30.0
    else:
        base_wage = 28.5
        
    empid = f"EMP-{emp_str_no}"
    ot_bool = True if ot and str(ot).strip() else False
    daily_h = float(daily_hrs) if daily_hrs else 8.0
    
    sql_lines.append(f"INSERT INTO \"Employee\" (id, \"employeeNo\", name, position, division, department, \"jobDesc\", \"employeeGroup\", \"costCenter\", \"costCenterDesc\", \"otEligible\", \"dailyWorkingHrs\", status, gender, nationality, \"iqamaId\", \"timeProfile\", \"workSchedule\", \"joiningDate\", \"hourlyRate\") VALUES ({sql_val(empid)}, {sql_val(emp_str_no)}, {sql_val(name)}, {sql_val(pos)}, {sql_val(div)}, {sql_val(dept)}, {sql_val(job)}, {sql_val(group)}, {sql_val(str(cost_c))}, {sql_val(cost_desc)}, {sql_val(ot_bool)}, {daily_h}, {sql_val(status or 'Active')}, {sql_val(gender)}, {sql_val(nat)}, {sql_val(iqama_str)}, {sql_val(t_prof)}, {sql_val(w_sched)}, {sql_val(join_date)}, {base_wage});")
    emp_count += 1

print(f"Loaded {emp_count} real employees from HR Master Data.")

# 4. Clinic Capacity Slots
sql_lines.append(f"INSERT INTO \"ClinicSlot\" (id, \"vendorId\", \"totalCapacity\", \"startDate\", \"endDate\", \"createdAt\") VALUES ('slot-gamc-1', 'V2', 75, NOW() - INTERVAL '3 days', NOW() + INTERVAL '14 days', NOW());")
sql_lines.append(f"INSERT INTO \"ClinicSlot\" (id, \"vendorId\", \"totalCapacity\", \"startDate\", \"endDate\", \"createdAt\") VALUES ('slot-bak-1', 'V1', 25, NOW() - INTERVAL '3 days', NOW() + INTERVAL '14 days', NOW());")

# 5. Seed Initial Requests, Reports, and Invoices matching demonstration
# Request 1: Completed Sadara test with FIT Report & Certificate
sql_lines.append(f"INSERT INTO \"MedicalRequest\" (id, \"employeeId\", \"testId\", \"vendorId\", \"slotId\", department, status, \"needByDate\", \"apptDate\", note, \"createdById\", \"createdAt\", \"updatedAt\") VALUES ('MR-2026-0101', 'EMP-11000008', '5004955', 'V2', 'slot-gamc-1', 'Trns & Lgst Dep', 'COMPLETED'::\"RequestStatus\", NOW() + INTERVAL '5 days', NOW() - INTERVAL '4 days', 'Sadara Turnaround clearance', 'u_req', NOW() - INTERVAL '6 days', NOW());")

sql_lines.append(f"INSERT INTO \"MedicalReport\" (id, \"requestId\", \"employeeId\", \"testId\", \"vendorId\", result, \"testDate\", \"validUntil\", remarks, \"createdAt\") VALUES ('REP-0081', 'MR-2026-0101', 'EMP-11000008', '5004955', 'V2', 'FIT'::\"ReportResult\", NOW() - INTERVAL '4 days', NOW() + INTERVAL '361 days', 'Cardiopulmonary clear. Visual acuity 20/20. Audiometry baseline normal. Fit for duty.', NOW() - INTERVAL '3 days');")

# Request 2: Scheduled SABIC test with appointment date
sql_lines.append(f"INSERT INTO \"MedicalRequest\" (id, \"employeeId\", \"testId\", \"vendorId\", \"slotId\", department, status, \"needByDate\", \"apptDate\", note, \"createdById\", \"createdAt\", \"updatedAt\") VALUES ('MR-2026-0102', 'EMP-11000012', '5004959', 'V1', 'slot-bak-1', 'Finance Dept', 'SCHEDULED'::\"RequestStatus\", NOW() + INTERVAL '10 days', NOW() + INTERVAL '2 days', 'SABIC TSH test requirement', 'u_req', NOW() - INTERVAL '2 days', NOW());")

# Request 3 & 4: Pending Waiting Requests for Central Team Triage
sql_lines.append(f"INSERT INTO \"MedicalRequest\" (id, \"employeeId\", \"testId\", department, status, \"needByDate\", note, \"createdById\", \"createdAt\", \"updatedAt\") VALUES ('MR-2026-0103', 'EMP-11000015', '5004964', 'Project Service', 'WAITING'::\"RequestStatus\", NOW() + INTERVAL '8 days', 'Urgent PetroKemya N/S screening', 'u_req', NOW() - INTERVAL '1 day', NOW());")

sql_lines.append(f"INSERT INTO \"MedicalRequest\" (id, \"employeeId\", \"testId\", department, status, \"needByDate\", note, \"createdById\", \"createdAt\", \"updatedAt\") VALUES ('MR-2026-0104', 'EMP-11000008', '5004956', 'Trns & Lgst Dep', 'WAITING'::\"RequestStatus\", NOW() + INTERVAL '12 days', 'Annual Iqama medical renewal', 'u_req', NOW(), NOW());")

# Invoice for Finance Audit: Submitted invoice from GAMC for MR-2026-0101
sql_lines.append(f"INSERT INTO \"Invoice\" (id, \"invoiceNo\", \"vendorId\", \"invoiceDate\", subtotal, \"vatAmount\", \"totalAmount\", status, \"fileUrl\", \"createdAt\") VALUES ('INV-0031', 'GAMC-2026-089', 'V2', NOW() - INTERVAL '2 days', 152.00, 22.80, 174.80, 'SUBMITTED'::\"InvoiceStatus\", 'GAMC-2026-089.pdf', NOW() - INTERVAL '2 days');")

sql_lines.append(f"INSERT INTO \"InvoiceLineItem\" (id, \"invoiceId\", \"requestId\", \"contractRate\", \"billedRate\") VALUES ('line-001', 'INV-0031', 'MR-2026-0101', 152.00, 152.00);")

# Audit Logs
sql_lines.append(f"INSERT INTO \"AuditLog\" (id, timestamp, \"userId\", \"actorName\", role, action, \"entityType\", \"entityId\", details) VALUES ('log-1', NOW() - INTERVAL '6 days', 'u_adm', 'System Master ETL', 'ADMIN'::\"Role\", 'SEED_MASTERS', 'SYSTEM', 'SYS', 'Loaded 27 departments, 34 SAP tests, 5 clinics, 44 rates, and HR master records.');")

sql_lines.append(f"INSERT INTO \"AuditLog\" (id, timestamp, \"userId\", \"actorName\", role, action, \"entityType\", \"entityId\", details) VALUES ('log-2', NOW() - INTERVAL '6 days', 'u_req', 'HSE Coordinator', 'REQUESTER'::\"Role\", 'CREATE_REQUEST', 'MedicalRequest', 'MR-2026-0101', 'Created Sadara test request for Abdul Aziz Sulaiman.');")

sql_lines.append(f"INSERT INTO \"AuditLog\" (id, timestamp, \"userId\", \"actorName\", role, action, \"entityType\", \"entityId\", details) VALUES ('log-3', NOW() - INTERVAL '5 days', 'u_cen', 'Central Medical Team', 'CENTRAL'::\"Role\", 'ASSIGN_CLINIC', 'MedicalRequest', 'MR-2026-0101', 'Assigned request to Gulf Asian Medical Centre (GAMC).');")

sql_lines.append(f"INSERT INTO \"AuditLog\" (id, timestamp, \"userId\", \"actorName\", role, action, \"entityType\", \"entityId\", details) VALUES ('log-4', NOW() - INTERVAL '3 days', 'u_gamc', 'Gulf Asian Clinic Desk', 'CLINIC'::\"Role\", 'ISSUE_REPORT', 'MedicalReport', 'REP-0081', 'Issued FIT Medical Clearance Certificate valid until 2027.');")

sql_lines.append("COMMIT;")

# Write SQL file
sql_file_path = r"server\prisma\seed_masters.sql"
with open(sql_file_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"Generated {sql_file_path} with {len(sql_lines)} SQL statements.")
