# Sorted Feedback on 1st MVP

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

## Action Items - Observation Fields & Layout

### O1: Restructure Auditee Section
- From "Auditee Person (Tier 1)"- this should appear in a different section. In this section, there should be 1 more field as "Auditor response to Auditee remarks"

### O2: Remove Redundant HOD Section
- From "HOD action plan" onwards- these look as repeat of "Action plans" section given below- which are looking more appropriate. So this section may be removed

### O3: Remove Lock Fields Feature
- Remove "Lock sample fields" and "lock text field" options to simplify

### O4: Add Observation Creation Timestamp
- Observation creation time stamp should be there

### O5: Add Close Option for Observation Tab
- Observation tab close- option should be there

---

## Action Items - Action Plans

### AP1: Rename Date Field
- In the action plans section- date field should be titled as Target Date

### AP2: Add Status Dropdown with Auto-trigger
- Status field should have drop down- Pending (default), Completed. Once this status is changed to completed, re-test field should automatically change to "Retest due"

### AP3: Add Retest Options per Action Plan
- Against each action plan- auditor should be able to select Retest due, pass or fail

---

## Action Items - Observation Status

### OS1: Update Current Status Options
- "Current Status" field in observations tab should have following options: Pending MR (Default option), MR under review (this should automatically be selected once Auditee gives feedback), Referred back for MR, Observation finalised, Resolved. Note: MR- stands for Management Response

---

## Action Items - Reports Section

### R1: Fix Risk Count Logic
- In the report section: Number of risks- should count all except those resolved

### R2: Update "Due Soon" Label and Logic
- "Due soon" at the bottom right of reports window- should read "Action plan due in (next xx days)"- this should have the log of "Action plans" populated through the observation box (given in the bottom of the box)

### R3: Add Retest Status to Reports
- Re-test status due pass fail should also populate in the reports section

### R4: Add Filters to Reports Page
- Reports page: should have same filters as observations page

---

## Action Items - Filtering & Sorting

### F1: Add Filters to Observations Page
- Observations page: Audit period, audit title filter at the top section should be there

### F2: Add Sorting Option
- Sorting option in observations tab should be there

---

## Action Items - Download Capabilities

### D1: Period Report with All Fields
- Report of different periods with all the observation fields in a table

### D2: Retest Report
- Retest report

---

## Summary by Category

**Questions/Clarifications:** 6 items (Q1-Q6)
**Role & Permissions:** 5 items (P1-P5)
**✅ Audit Fields:** 3 items (A1-A3) - **COMPLETED** (2025-10-01)
**Observation Fields:** 5 items (O1-O5)
**Action Plans:** 3 items (AP1-AP3)
**Observation Status:** 1 item (OS1)
**Reports:** 4 items (R1-R4)
**Filtering & Sorting:** 2 items (F1-F2)
**Downloads:** 2 items (D1-D2)

**Total:** 31 feedback items
**Completed:** 3 items (9.7%)
