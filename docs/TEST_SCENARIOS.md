# Expertise Healthcare Portal — End-to-End Test Scenarios & QA Suite

## Seeded Credentials Quick Reference

| Role | Username | Password | Purpose / Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `Admin@2026` | Master access, User IAM, Settings, Role switching |
| **HR Coordinator** | `hr` | `Exp@2026` | Intake, Pre-booking Slots, Workforce Assignment, Reports |
| **HSE Requester** | `requester` | `Exp@2026` | Single & Batch Intake, Requests tracking |
| **Central Medical Team** | `central` | `Exp@2026` | Quota allocation, Clinic dispatch, Price comparison |
| **Clinic Desk (Badr Al Khaleej)** | `badr` | `Exp@2026` | Scoped to Clinic `V1` (`BAK`): Exams, Reports, Invoices |
| **Clinic Desk (Gulf Asian)** | `gulfasian` | `Exp@2026` | Scoped to Clinic `V2` (`GAMC`): Exams, Reports, Invoices |
| **Clinic Desk (Dina)** | `dina` | `Exp@2026` | Scoped to Clinic `V5` (`DINA`): Exams, Reports, Invoices |
| **Finance Controller** | `finance` | `Exp@2026` | 3-Way matching, Invoice clearance, SES posting |

---

## Scenario 1: Authentication, Session Management & RBAC Guardrails

### TS-1.1: Core Login & Session Persistence
* **Pre-conditions**: Browser at `http://localhost:5173/login`.
* **Steps**:
  1. Attempt login with `admin` / `wrongPassword`.
  2. Attempt login with backdoor passwords (`admin123`, `password123`).
  3. Enter valid credentials: `admin` / `Admin@2026` and submit.
  4. Refresh the browser page (`F5`).
* **Expected Result**:
  * Invalid/backdoor passwords fail with `401 Unauthorized`.
  * Valid login saves JWT token to `localStorage` and redirects to `/admin`.
  * Browser refresh preserves authenticated session (`GET /api/auth/me`).

### TS-1.2: Role-Based Access Control (RBAC) URL Guardrails
* **Pre-conditions**: Logged in as `hr` (HR Coordinator).
* **Steps**:
  1. Manually type `http://localhost:5173/admin` into the address bar.
  2. Manually type `http://localhost:5173/finance` into the address bar.
  3. Attempt an unauthorized direct API call via curl/Postman:
     `GET http://localhost:5000/api/admin/overview` with `hr`'s JWT.
* **Expected Result**:
  * Frontend renders the `<AccessRestrictedGuardrail />` component with options to return to authorized modules.
  * Backend returns HTTP `403 Forbidden` (`Role not authorized for this resource`).

### TS-1.3: Administrator Role Impersonation / Role Switching
* **Pre-conditions**: Logged in as `admin`.
* **Steps**:
  1. Click the top header role switcher or sidebar switcher.
  2. Switch to **Central Medical Team** (`CENTRAL`).
  3. Verify sidebar navigation and dashboard change to Central Medical Team view.
  4. Switch back to **System Administrator** (`ADMIN`).
* **Expected Result**:
  * Server endpoint `POST /api/auth/switch-role` issues a scoped impersonation JWT token without requiring the target user's password.
  * Non-admins attempting `POST /api/auth/switch-role` receive HTTP `403 Forbidden`.

---

## Scenario 2: Clearance Intake (Single & Bulk)

### TS-2.1: Single Employee Clearance Request Intake
* **Pre-conditions**: Logged in as `hr` or `admin`; navigate to `/intake`.
* **Steps**:
  1. In the **Single Employee Intake** tab, search for an employee (e.g., `11000008` or `Abdul Aziz Sulaiman`).
  2. Select the employee from the autocomplete results.
  3. Verify the **Clearance Eligibility** alert appears (green "Eligible" or yellow warning if active test exists).
  4. Select Department: `PMTA`, Test Package: `5004955 (Sadara medical test)`, Site: `Sadara Complex`.
  5. Click **Submit Medical Clearance Request**.
* **Expected Result**:
  * Request is sent via `POST /api/requests`.
  * Response returns HTTP `201 Created` with a new Request ID (e.g., `MR-2026-XXXX`).
  * Request immediately appears in `/requests` in `SUBMITTED` or `WAITING` status.

### TS-2.2: Bulk Excel / CSV Employee Intake
* **Pre-conditions**: Logged in as `hr`; navigate to `/intake` -> **Bulk Batch Upload** tab.
* **Steps**:
  1. Download the Sample Excel Template provided on screen.
  2. Add 3 valid employee numbers (`11000008`, `11000012`, `11000016`) and 1 invalid number (`INVALID999`).
  3. Upload the `.xlsx` file.
  4. Verify the pre-validation table on screen displays 3 valid rows and highlights the invalid row.
  5. Click **Process Bulk Clearance Batch**.
* **Expected Result**:
  * Payload is sent via `POST /api/requests/bulk`.
  * The 3 valid employees are created in PostgreSQL with a batch tag; invalid row is skipped and reported in the success/error summary toast.

---

## Scenario 3: Advance Capacity Slot Pre-Booking & Workforce Allocation

### TS-3.1: Pre-Book Slots for Unassigned Workforce (HR Mode)
* **Pre-conditions**: Logged in as `hr` or `central`; navigate to `/slots`.
* **Steps**:
  1. Click the **+ Pre-Book Slots** button.
  2. Enter Number of Slots Needed: `25`.
  3. Select Medical Package: `5004955 - Sadara medical test`.
  4. Department: `PMTA`, Facility: `Sadara Complex (Jubail)`.
  5. Need-By Date: 14 days in future; enter Note: `Turnaround crew advance reservation`.
  6. Click **Send Request for 25 Slots**.
* **Expected Result**:
  * Sends `POST /api/slots/request`.
  * Generates a new Slot Request (e.g., `SR-1008`) with `25` requested slots and `0` allocated.
  * Visible immediately in the Central Allocation Queue.

### TS-3.2: Multi-Clinic Quota Allocation & Split (Central Team Mode)
* **Pre-conditions**: Logged in as `central` (Central Medical Team); navigate to `/slots`.
* **Steps**:
  1. In the **Allocation Queue** tab, click on the newly created slot request (`SR-1008`).
  2. Use the clinic dropdowns to select Clinic 1: `Badr Al Khaleej (V1)` and Clinic 2: `Dina Medical (V5)`.
  3. Click the **Split evenly** button (or enter `13` slots for `V1`, `12` slots for `V5`).
  4. Verify the status pill changes to `25 of 25 allocated` (Green).
  5. Click **Confirm allocation**.
* **Expected Result**:
  * Sends `POST /api/slots/SR-1008/allocate`.
  * Database records `allocatedSlots: 25`, status becomes `CONFIRMED`.
  * Navigating to the **Allocations by clinic** tab reflects `+13` slots under Badr Al Khaleej and `+12` slots under Dina.

### TS-3.3: Assigning Named Workers to the Booked Slot Quota
* **Pre-conditions**: In `/slots`, locate `SR-1008`.
* **Steps**:
  1. Click the **Workforce (0/25)** button on the card to open `<SlotAssignmentModal />`.
  2. In the **Assign One by One** tab:
     * Search for `11000008` (`Abdul Aziz Sulaiman`).
     * Set Target Clinic: `Badr Al Khaleej`.
     * Click **Assign Employee to Slot Quota**.
  3. In the **Assign Bulk List** tab:
     * Switch to **Select from Company Roster**.
     * Select 3 employees from the table.
     * Strategy: `Auto-Assign to Available Clinic`.
     * Click **Assign Employees**.
  4. Switch to the **Assigned Employees** tab in the modal.
* **Expected Result**:
  * Quota fulfillment updates to `4 / 25 Assigned` (16% progress bar).
  * 4 individual clearance requests linked to `SR-1008` are created in PostgreSQL with assigned clinic vendors.

---

## Scenario 4: Central Medical Team Triage & Scheduling

### TS-4.1: Batch Clinic Assignment in Requests Queue
* **Pre-conditions**: Logged in as `central`; navigate to `/requests`.
* **Steps**:
  1. Select batch `REQ-2026-0104` (Yanpet medical test).
  2. Select 2 unassigned workers using the row checkboxes.
  3. In the floating dispatch bar, choose target clinic: `Badr Al Khaleej Polyclinic Co. (BAK)`.
  4. Click **Dispatch to Clinic**.
* **Expected Result**:
  * Sends `PATCH /api/requests/batch-assign`.
  * Requests are updated in PostgreSQL with `vendorId: "V1"` and status `SCHEDULED`.
  * Clinic badge reflects `BAK` and row changes to dispatched state.

### TS-4.2: Cancelling or Rejecting a Request
* **Pre-conditions**: Logged in as `central` or `hr`; in `/requests`.
* **Steps**:
  1. Locate a request in `SUBMITTED` or `WAITING` status.
  2. Click **Cancel Request** and confirm.
* **Expected Result**:
  * Sends `PATCH /api/requests/:id/cancel`.
  * Status transitions to `CANCELLED`.
  * Attempting to cancel an already `COMPLETED` request returns HTTP `409 Conflict`.

---

## Scenario 5: Clinic Examination, Lab Data Entry & Certificate Issuance

### TS-5.1: Clinic Scoped Isolation Check
* **Pre-conditions**: Logged in as `badr` (Clinic `V1` - Badr Al Khaleej); navigate to `/clinic`.
* **Steps**:
  1. Verify the queue only displays requests assigned to `vendorId: "V1"`.
  2. Attempt an API call using `badr`'s JWT to submit diagnostic results for a request assigned to `V4` (Arrazi):
     `POST /api/reports` with `{ requestId: "<V4-Request-Id>", result: "FIT" }`.
* **Expected Result**:
  * Requests belonging to other clinics (`V2`, `V3`, `V4`, `V5`) are never returned in `GET /api/requests`.
  * Cross-clinic submission attempt is rejected with HTTP `403 Forbidden` (`Forbidden: Cannot submit medical report for another clinic`).

### TS-5.2: Examination Workflow, Structured Lab Data & PDF Upload
* **Pre-conditions**: Logged in as `badr`; in `/clinic`.
* **Steps**:
  1. Locate an employee on the roster whose status is `SCHEDULED`.
  2. Click **Enter Results / Complete Examination**.
  3. Set Fitness Outcome: `FIT`.
  4. Enter Lab Values:
     * Blood Pressure: `120/80`
     * Heart Rate: `72 bpm`
     * Audiometry: `Normal bilateral (20 dB)`
     * Vision: `20/20 corrected`
     * Validity Term: `1_YEAR`
  5. Attach a valid PDF report file (`sample.pdf`).
  6. Submit examination.
* **Expected Result**:
  * Sends `POST /api/reports` (or multipart upload).
  * Backend verifies the `%PDF` magic bytes of the file.
  * Request transitions to `COMPLETED`.
  * Structured `labData` JSONB and `validityTerm` persist in `MedicalReport` in PostgreSQL.
  * An official QR-authenticated Fitness Certificate is generated.

### TS-5.3: Certificate & Protected PDF Download
* **Pre-conditions**: Logged in as `hr` or `central`; navigate to `/reports`.
* **Steps**:
  1. Find the newly completed clearance record.
  2. Click **View Certificate** -> Opens `<CertificateModal />`.
  3. Verify QR code, employee Iqama, test parameters, and validity period match what the clinic entered.
  4. Click **Download Official PDF**.
  5. Attempt an unauthenticated direct browser download in an incognito window: `GET http://localhost:5000/api/reports/:id/file`.
* **Expected Result**:
  * Authenticated user receives PDF stream as an authenticated blob (`GET /api/reports/:id/file`).
  * Unauthenticated incognito request returns HTTP `401 Unauthorized` (Public static directory `/uploads` is disabled).

---

## Scenario 6: Finance 3-Way Match & Invoice Clearance

### TS-6.1: Clinic Invoice Submission
* **Pre-conditions**: Logged in as `badr` (Clinic Desk); in `/clinic` -> **Invoice Dispatch** tab.
* **Steps**:
  1. Click **Create & Submit Monthly Invoice**.
  2. Enter Invoice Number: `INV-2026-BAK-009`.
  3. Attach the completed clearance request IDs as billing line items.
  4. Enter Total Amount (SAR): Matches the contracted rate (e.g. `110.00`).
  5. Click **Submit to Finance Controller**.
* **Expected Result**:
  * Sends `POST /api/invoices`.
  * Invoice created with status `SUBMITTED`.

### TS-6.2: Finance 3-Way Match Audit Verification
* **Pre-conditions**: Logged in as `finance` (Finance Controller); navigate to `/finance`.
* **Steps**:
  1. Find invoice `INV-2026-BAK-009` in the Pending Clearances queue.
  2. Click **Audit 3-Way Match**.
  3. Inspect the 3 match points displayed on screen:
     * **Point 1**: Clearance Request ID and HR Authorization.
     * **Point 2**: Completed Medical Report and Signed Certificate.
     * **Point 3**: Negotiated SAP Contract Rate Card comparison.
* **Expected Result**:
  * Audit endpoint `GET /api/invoices/:id/audit` returns `matchStatus: "MATCHED"`.
  * Discrepancy indicator is `0.00 SAR` (Green matched indicator).

### TS-6.3: Invoice Approval & SES Posting
* **Pre-conditions**: In `/finance` modal for `INV-2026-BAK-009`.
* **Steps**:
  1. Click **Approve & Clear Invoice (SES Entry)**.
  2. Enter optional SES reference: `SES-450009812`.
  3. Confirm clearance.
* **Expected Result**:
  * Sends `POST /api/invoices/:id/clear`.
  * Invoice status updates to `CLEARED` with clearance timestamp and SES number.
  * Audit log logs `CLEAR_INVOICE` event.

---

## Scenario 7: Clinic, SAP Contract & Rate Card Governance

### TS-7.1: Accredited Clinic Onboarding & SAP Contract Creation
* **Pre-conditions**: Logged in as `admin`; navigate to `/admin` -> **Clinics, Contracts & Rates** tab.
* **Steps**:
  1. Click **Onboard New Clinic**.
  2. Code: `ALMANA`, Name: `Al Mana General Hospital`, SAP Vendor ID: `1001920`, CR: `2051028391`, VAT: `310123456700003`.
  3. Click **Onboard Clinic**.
  4. On the newly created Al Mana card, click **+ Contract**.
  5. Contract No: `4600008899`, Terms: `30` days, Invoicing: `Ariba portal`.
  6. Click **Record Contract**.
* **Expected Result**:
  * Persists to `Vendor` and `Contract` tables via `POST /api/admin/clinics` and `POST /api/admin/contracts`.
  * Real-time counter increments across `/suppliers`, `/admin`, and `/rates`.

### TS-7.2: Add & Edit Contract Rate Cards
* **Pre-conditions**: In `/admin` or `/rates` under Al Mana Contract `4600008899`.
* **Steps**:
  1. Click **+ Add Rate**.
  2. Select Test: `5004955 (Sadara medical test)`.
  3. Set Negotiated Rate: `105.00` SAR; Check `VAT Included`.
  4. Submit rate card.
* **Expected Result**:
  * Sends `POST /api/admin/rates`.
  * Rate persists in `ContractRate` table.
  * Navigating to `/rates` -> **Clinic SAP Rate Cards** immediately lists the new rate at `SAR 105.00`.

---

## Scenario 8: Advance Slot Expiry & System Settings Governance

### TS-8.1: Configure Slot Auto-Disappearance Retention SLA
* **Pre-conditions**: Logged in as `admin`; navigate to `/admin` -> **Slot Governance & Expiry** tab.
* **Steps**:
  1. Change the Auto-Disappear Threshold from `7` Days to `3` Days using the preset pill.
  2. Ensure **Enable Auto-Disappearance Filter** is checked.
  3. Click **Save Slot Governance Settings**.
* **Expected Result**:
  * Sends `PATCH /api/admin/settings`.
  * Value persists in the `SystemSetting` table in Neon PostgreSQL (`id: "SYSTEM_DEFAULT"`).
  * Navigating to `/slots` shows the top governance banner reading: `Pre-booked slots automatically disappear in 3 days`.

### TS-8.2: Force Expire & Restore Slot Requests
* **Pre-conditions**: In `/admin` -> **Slot Governance & Expiry** tab -> **Slot Lifecycle Audit Roster**.
* **Steps**:
  1. Locate an active slot request and click **Expire Now**.
  2. Navigate to `/slots`. Confirm the slot request has disappeared from the active queue.
  3. Return to `/admin` and click **Restore / Extend 3d**.
  4. Return to `/slots`.
* **Expected Result**:
  * Calling `POST /api/admin/slots/:id/expire` marks the slot as expired; active allocation queue excludes it.
  * Calling `POST /api/admin/slots/:id/restore` resets the lifecycle window; the slot reappears in the active allocation queue.

---

## Scenario 9: System Telemetry & Regulatory Audit Trail

### TS-9.1: Live 3-Tier Latency Telemetry
* **Pre-conditions**: Any page while logged in.
* **Steps**:
  1. Inspect the top-right header capsule: `PostgreSQL (Neon) [Healthy • XXms]`.
  2. Open browser Network tab and observe calls to `GET /api/health`.
* **Expected Result**:
  * Displays database connection health and live round-trip query latency (typically 100–350ms to Neon).

### TS-9.2: Regulatory Audit Log Verification & Search
* **Pre-conditions**: Logged in as `admin`, `hr`, or `finance`; navigate to `/audit`.
* **Steps**:
  1. Search for recent actions performed in Scenarios 2–7 (e.g. `CREATE_REQUEST`, `ALLOCATE_SLOTS`, `SUBMIT_REPORT`, `CLEAR_INVOICE`).
  2. Filter by Actor Role: `CLINIC` or `FINANCE`.
  3. Click **Export Audit Trail (CSV)**.
* **Expected Result**:
  * Every mutation across controllers logs actor username, role, target entity ID, and details in `AuditLog` table.
  * CSV file downloads with complete compliance columns.

---

## Automated QA Suite Execution

Run the full automated 37-test backend QA suite directly via terminal:

```bash
cd server
npx tsx scripts/e2e-audit.ts
```
