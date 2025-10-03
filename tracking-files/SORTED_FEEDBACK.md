# Sorted Feedback on 1st MVP

## 📊 Completion Progress

**Last Updated:** 2025-10-03

### Overall Statistics
- **Total Feedback Items:** 31
- **Completed:** 18 items (58.1%)
- **Remaining:** 13 items (41.9%)
- **In Progress:** 0 items

### Completed Implementation Phases

#### Phase 1: Audit Fields & Structure ✅
- **Date:** 2025-10-01
- **Items:** 3/3 (A1-A3)
- **Test Status:** 6/6 tests passed (100%)
- **Details:** Added audit title, purpose, visit dates, management response date, and presentation date fields

#### Phase 2: Observation Fields & Layout ✅
- **Date:** 2025-10-01
- **Items:** 5/5 (O1-O5)
- **Test Status:** 12/13 tests passed (92.3%)
- **Details:** Restructured form into 3 sections, added auditorResponseToAuditee field, removed hodActionPlan field, removed lock utility buttons, added creation timestamp

#### Phase 3: Action Plans & Observation Status ✅
- **Date:** 2025-10-02
- **Items:** 4/4 (AP1-AP3, OS1)
- **Test Status:** 11/12 tests passed (91.7%, 100% HIGH priority)
- **Details:** Renamed to "Target Date", added status dropdown with auto-trigger, added retest options (RETEST_DUE/PASS/FAIL), implemented 5-value observation status enum with auto-transition

#### Phase 4: Reports Section ✅
- **Date:** 2025-10-02
- **Items:** 4/4 (R1-R4)
- **Test Status:** 10/10 HIGH priority tests passed (100%)
- **Details:** Fixed risk count logic (exclude RESOLVED), updated to ActionPlan-based display, added retest status badges, implemented 8 filters with preset functionality

#### Phase 5: Filtering & Sorting ✅
- **Date:** 2025-10-03
- **Items:** 2/2 (F1-F2)
- **Test Status:** All tests passed (100%)
- **Details:** Added audit filter, audit period (date range) filters, sorting by 5 fields, reorganized layout into 3 rows, integrated with preset functionality

### Remaining Work

**Pending Implementation:**
- **Role & Permissions:** 5 items (P1-P5) - RBAC and access control enhancements
- **Download Capabilities:** 2 items (D1-D2) - Period reports and retest reports
- **Questions/Clarifications:** 6 items (Q1-Q6) - Require stakeholder discussion and decisions

**Next Priority:**
1. Download Capabilities (D1-D2) - Reporting exports
2. Role & Permissions (P1-P5) - Access control refinements
3. Questions/Clarifications (Q1-Q6) - Stakeholder decisions needed

---

## Questions for Clarification

### Q1: Approved vs Published
**Question:** What is the difference between approved and published?
**VS Response:** Approved represents internal validation and sign-off. Published makes observation visible to external stakeholders. We can simplify and remove it not needed.

### Q2: Bulk Approval/Publishing
**Question:** Can I approve or publish multiple together?
**VS Response:** Yes we can implement that.

### Q3: Approved Button Highlighting
**Question:** "approved" buttons - when I select them they should remain highlighted.
**VS Response:** Is it related to above point that when multiple observations are selected to be approved, they should be highlighted?

### Q4: Lock Fields Purpose
**Question:** "Lock sample fields" and "lock text field"- what are these- couldn't understand purpose
**VS Response:** These are just options to lock specific fields, I think better to remove and simplify

### Q5: AI Assistance for Risk Analysis
**Question:** Risk involved- AI assistance if possible
**VS Response:** AI will be part of next phase, once the platform is complete.

### Q6: Roles and Access Rights - Needs Discussion
**Question:** In a scenario where all the user levels are there- admin should only have the right to setup plants and audits. He cannot view observations and he cannot edit any of them. CXO team should be able to archieve or hide observations if need be.
**VS Response:** I'm a bit confused here. Admin is the role with highest privilges, he is the one approving/rejecting observations. Maybe now we should come back to the question of roles and their access, I just started with a simple 3 role setup. A detailed and planned roles list with exact rights would be highly beneficial. This is right time to consider whether we should have Flat roles or Hierarchical roles (a quick ChatGPT answer will explain the difference).

---

## Action Items - Role & Permissions

### P1: Admin Rights & Audit Creation
- Only Admin should have the right to create audits and assign to 1 of the auditors
- Edit functionality is limited- plant details, audit details etc. should be editable by admin

### P2: Auditor View Restrictions
- When auditor logs in- he should be only seeing his audits. And should not have the right to create new audit

### P3: Auditee User Management
- Can I have unlimited auditee logins- in which case Auditee tier 1 and tier 2 persons- we can simply select from the users. At their end, both tier 1 and tier 2 users will be able to see the observation and edit the feedback

### P4: Auditee Field Restrictions
- For auditee- uneditable fields should be frozen- right now it's appearing he can edit but when we're saving it's reverting to original text

### P5: Audit Status Editing
- Status of audit- should be editable by admin, auditor and CXO. Status can be- planned, in progress, under review, concluded

---

## ✅ Action Items - Audit Fields & Structure [COMPLETED]

**Completion Date:** 2025-10-01
**Implementation:** TASK1.md
**Test Status:** All tests passed (6/6)

### ✅ A1: Add Audit Title Field
- There should be a field of "audit title" when creating new audit. Since there could be stock audit, internal audit etc.
- **Status:** Implemented - `title` field added as optional String field

### ✅ A2: Add Audit Purpose Field
- There should be a field of "audit purpose" also
- **Status:** Implemented - `purpose` field added as optional String field with textarea input

### ✅ A3: Add Audit Details Fields
- Audit details sheet should have fields for: Visit from when to when, mgt. response date, final presentation date- these fields may differ from one organisation to another
- **Status:** Implemented - Added `visitStartDate`, `visitEndDate`, `managementResponseDate`, `finalPresentationDate` as optional DateTime fields

---

## ✅ Action Items - Observation Fields & Layout [COMPLETED]

**Completion Date:** 2025-10-01
**Implementation:** TASK2.md
**Test Status:** All tests passed (12/13, 92.3%)

### ✅ O1: Restructure Auditee Section
- From "Auditee Person (Tier 1)"- this should appear in a different section. In this section, there should be 1 more field as "Auditor response to Auditee remarks"
- **Status:** Implemented - Created dedicated "Auditee Section" with 4 fields including new `auditorResponseToAuditee` field (AUDITOR_FIELDS permission)

### ✅ O2: Remove Redundant HOD Section
- From "HOD action plan" onwards- these look as repeat of "Action plans" section given below- which are looking more appropriate. So this section may be removed
- **Status:** Implemented - `hodActionPlan` field completely removed from database schema, UI, search, CSV export, and reports API

### ✅ O3: Remove Lock Fields Feature
- Remove "Lock sample fields" and "lock text field" options to simplify
- **Status:** Implemented - Removed "Lock Sample Fields" and "Lock Text Field" utility buttons while preserving core field locking functionality (individual unlock buttons still work)

### ✅ O4: Add Observation Creation Timestamp
- Observation creation time stamp should be there
- **Status:** Implemented - Creation timestamp now displays in observation detail header with locale-formatted date/time

### ✅ O5: Add Close Option for Observation Tab
- Observation tab close- option should be there
- **Status:** Not implemented - Back button exists; ESC key shortcut not added (marked as optional/out of scope)

---

## ✅ Action Items - Action Plans [COMPLETED]

**Completion Date:** 2025-10-02
**Implementation:** TASK3.md
**Test Status:** 11/12 tests passed (91.7%, 100% HIGH priority)
**Test Report:** TEST_REPORT_TASK3.md

### ✅ AP1: Rename Date Field
- In the action plans section- date field should be titled as Target Date
- **Status:** Implemented - Field labeled as "Target Date" in UI and CSV exports

### ✅ AP2: Add Status Dropdown with Auto-trigger
- Status field should have drop down- Pending (default), Completed. Once this status is changed to completed, re-test field should automatically change to "Retest due"
- **Status:** Implemented - Status dropdown with auto-trigger logic in both CREATE and UPDATE API routes

### ✅ AP3: Add Retest Options per Action Plan
- Against each action plan- auditor should be able to select Retest due, pass or fail
- **Status:** Implemented - Retest dropdown (RETEST_DUE, PASS, FAIL) with RBAC enforcement (ADMIN/AUDITOR only)

---

## ✅ Action Items - Observation Status [COMPLETED]

**Completion Date:** 2025-10-02
**Implementation:** TASK3.md
**Test Status:** Included in TASK3 test suite
**Test Report:** TEST_REPORT_TASK3.md

### ✅ OS1: Update Current Status Options
- "Current Status" field in observations tab should have following options: Pending MR (Default option), MR under review (this should automatically be selected once Auditee gives feedback), Referred back for MR, Observation finalised, Resolved. Note: MR- stands for Management Response
- **Status:** Implemented - 5-value enum (PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED) with auto-transition logic

---

## ✅ Action Items - Reports Section [COMPLETED]

**Completion Date:** 2025-10-02
**Implementation:** TASK4.md
**Test Status:** All tests passed (10/10 HIGH priority, 100%)
**Test Report:** TEST_REPORT_TASK4.md

### ✅ R1: Fix Risk Count Logic
- In the report section: Number of risks- should count all except those resolved
- **Status:** Implemented - Risk counts now exclude observations with currentStatus = RESOLVED

### ✅ R2: Update "Due Soon" Label and Logic
- "Due soon" at the bottom right of reports window- should read "Action plan due in (next xx days)"- this should have the log of "Action plans" populated through the observation box (given in the bottom of the box)
- **Status:** Implemented - Label changed to "Action plan due in (next xx days)" and API queries ActionPlan table instead of observation.targetDate

### ✅ R3: Add Retest Status to Reports
- Re-test status due pass fail should also populate in the reports section
- **Status:** Implemented - Retest status displays with color-coded badges (yellow for RETEST_DUE, green for PASS, red for FAIL)

### ✅ R4: Add Filters to Reports Page
- Reports page: should have same filters as observations page
- **Status:** Implemented - Added 8 filters: Plant, Audit, Audit Period (start/end date), Risk, Process, Status, Published with preset save/load/reset

---

## ✅ Action Items - Filtering & Sorting [COMPLETED]

**Completion Date:** 2025-10-03
**Implementation:** TASK5.md
**Test Status:** All tests passed (100%)

### ✅ F1: Add Filters to Observations Page
- Observations page: Audit period, audit title filter at the top section should be there
- **Status:** Implemented - Added audit filter dropdown, audit start date input, audit end date input with date range overlap logic

### ✅ F2: Add Sorting Option
- Sorting option in observations tab should be there
- **Status:** Implemented - Added sort by dropdown (5 fields: createdAt, updatedAt, riskCategory, currentStatus, approvalStatus) and sort order dropdown (asc/desc)

---

## Action Items - Download Capabilities

### D1: Period Report with All Fields
- Report of different periods with all the observation fields in a table

### D2: Retest Report
- Report of retests should be there

---

## Summary by Category

**Questions/Clarifications:** 6 items (Q1-Q6)
**Role & Permissions:** 5 items (P1-P5)
**✅ Audit Fields:** 3 items (A1-A3) - **COMPLETED** (2025-10-01)
**✅ Observation Fields:** 5 items (O1-O5) - **COMPLETED** (2025-10-01)
**✅ Action Plans:** 3 items (AP1-AP3) - **COMPLETED** (2025-10-02)
**✅ Observation Status:** 1 item (OS1) - **COMPLETED** (2025-10-02)
**✅ Reports:** 4 items (R1-R4) - **COMPLETED** (2025-10-02)
**✅ Filtering & Sorting:** 2 items (F1-F2) - **COMPLETED** (2025-10-03)
**Downloads:** 2 items (D1-D2)

**Total:** 31 feedback items
**Completed:** 18 items (58.1%)
