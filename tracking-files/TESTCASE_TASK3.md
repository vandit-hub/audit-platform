# Test Case Document - TASK3: Action Plans & Observation Status

**Task:** Enhance action plans with status dropdown, retest field, and auto-triggers. Update observation status workflow with new values and auto-transitions.
**Test Method:** Playwright MCP Browser Automation
**Date Created:** 2025-10-02
**Status:** Ready for Execution

---

## Test Environment Setup

**Prerequisites:**
- Application running at `http://localhost:3000`
- Database seeded with users via `npm run db:seed`
- Valid admin, auditor, and auditee credentials available

**Test Data Required:**
- **Users (Already Seeded):**
  - Admin User: `admin@example.com` / `admin123`
  - Auditor User: `auditor@example.com` / `auditor123`
  - Auditee User: `auditee@example.com` / `auditee123`

- **Additional Test Data (Create if Missing):**
  - At least one plant in the system
  - At least one audit associated with a plant
  - At least one observation in DRAFT status with currentStatus = PENDING_MR

**IMPORTANT - Test Data Setup:**
If plants, audits, or observations are not present in the database, create them manually using Playwright MCP from the UI before running the test cases:

1. **Create Plant:** Navigate to Plants page → Create new plant with code and name
2. **Create Audit:** Navigate to Audits page → Select plant → Create audit
3. **Create Observation:** Navigate to Observations page → Create observation linked to audit

Use Playwright MCP to automate this test data creation through the UI workflows, not via direct database manipulation or API calls.

---

## Critical Test Cases

**Before starting:** Ensure test data exists (users are seeded, but create plants/audits/observations via UI using Playwright MCP if missing). If already logged in for the first time, sign out and log in again.

---

### TC1: Verify Action Plan UI Updates - Target Date Label and Status Dropdown

**Priority:** HIGH
**Objective:** Verify that action plan form shows "Target Date" label and status dropdown with Pending/Completed options

**Precondition:** An observation exists in the system

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as admin or auditor user
3. Navigate to Observations page
4. Click on any observation to open detail view
5. Scroll to "Action Plans" section at the bottom
6. Examine the action plan input form

**Expected Results:**
- Action plan form displays 4-6 input fields (depending on user role):
  - Plan (text input with placeholder "Plan...")
  - Owner (text input with placeholder "Owner")
  - **Target Date** (date input - verify label/placeholder says "Target Date")
  - Status (dropdown/select with options)
  - Retest (dropdown - visible only for ADMIN/AUDITOR)
  - "Add Action Plan" button

**Status Dropdown Validation:**
- Field is a `<select>` element, NOT a text input
- Default option shows "Status" (blank value)
- Option 1: "Pending"
- Option 2: "Completed"
- No other options exist

**Validation Points:**
- Date field clearly labeled as "Target Date"
- Status is a dropdown, not free text
- Dropdown has exactly 2 options plus blank
- Grid layout properly displays all fields
- "Add Action Plan" button is present and enabled

---

### TC2: Verify Retest Dropdown Visibility Based on User Role

**Priority:** HIGH
**Objective:** Verify that retest dropdown is visible only for ADMIN and AUDITOR roles, hidden for AUDITEE

**Test Data:**
```
Test observation ID: (any existing observation)
```

**Steps:**
1. **Test as AUDITOR:**
   - Login as `auditor@example.com`
   - Navigate to an observation detail page
   - Scroll to Action Plans section
   - Count the number of input fields in the form
   - Verify retest dropdown exists

2. **Test as ADMIN:**
   - Login as `admin@example.com`
   - Navigate to same observation
   - Verify retest dropdown exists

3. **Test as AUDITEE:**
   - Login as `auditee@example.com`
   - Navigate to a published observation
   - Scroll to Action Plans section
   - Verify retest dropdown does NOT exist

**Expected Results:**

**For ADMIN and AUDITOR:**
- Retest dropdown is visible
- Dropdown shows options:
  - "" (blank/default - shows "Retest")
  - "RETEST_DUE" (displays as "Retest due")
  - "PASS" (displays as "Pass")
  - "FAIL" (displays as "Fail")

**For AUDITEE:**
- Retest dropdown is NOT visible
- Form shows only: Plan, Owner, Target Date, Status, Add button

**Validation Points:**
- RBAC enforcement at UI level
- Dropdown only visible to authorized roles
- Options correctly labeled
- No console errors for any role

---

### TC3: Auto-Trigger - Status "Completed" Sets Retest to "Retest due"

**Priority:** HIGH
**Objective:** Verify that when action plan status is set to "Completed", retest automatically sets to "Retest due" if not explicitly provided

**Precondition:** Logged in as admin or auditor

**Test Scenario 1: Auto-trigger on Create**

**Steps:**
1. Login as admin user
2. Navigate to an observation detail page
3. In Action Plans section, fill in:
   - Plan: "Test auto-trigger action plan"
   - Owner: "Test Owner"
   - Target Date: (select tomorrow's date)
   - Status: Select "Completed"
   - Retest: Leave blank (do not select)
4. Click "Add Action Plan"
5. Wait for success message
6. Examine the newly created action plan in the list

**Expected Results:**
- Action plan is created successfully
- Success message appears: "Action plan added successfully!"
- In the action plan list, the new item displays:
  - Plan: "Test auto-trigger action plan"
  - Owner: "Test Owner"
  - Target: (tomorrow's date)
  - Status: "Completed"
  - **Retest: "Retest due"** ← Auto-set by system

**Test Scenario 2: Manual retest overrides auto-trigger**

**Steps:**
1. Create another action plan with:
   - Plan: "Manual retest test"
   - Status: "Completed"
   - Retest: Manually select "Pass"
2. Click "Add Action Plan"
3. Verify the created plan

**Expected Results:**
- Retest shows "Pass" (manual selection respected)
- Auto-trigger did NOT override manual selection

**Validation Points:**
- Auto-trigger only fires when retest is blank
- Manual selection takes precedence
- No console errors
- Database correctly stores RETEST_DUE enum value

---

### TC4: Action Plan Retest Field Display with Formatting

**Priority:** HIGH
**Objective:** Verify that retest values display correctly in action plan list with user-friendly labels

**Precondition:** Multiple action plans with different retest values exist

**Setup:**
Create 4 action plans with different retest values:
1. Plan: "Plan 1", Status: "Completed", Retest: (auto "Retest due")
2. Plan: "Plan 2", Status: "Pending", Retest: manually set to "Pass"
3. Plan: "Plan 3", Status: "Completed", Retest: manually set to "Fail"
4. Plan: "Plan 4", Status: "Pending", Retest: blank

**Steps:**
1. Login as admin user
2. Navigate to observation with the 4 action plans created above
3. Scroll to Action Plans section
4. Examine each action plan's display line

**Expected Results:**

**Plan 1 displays:**
- "Owner: ... · Target: ... · Status: Completed · **Retest: Retest due**"

**Plan 2 displays:**
- "Owner: ... · Target: ... · Status: Pending · **Retest: Pass**"

**Plan 3 displays:**
- "Owner: ... · Target: ... · Status: Completed · **Retest: Fail**"

**Plan 4 displays:**
- "Owner: ... · Target: ... · Status: Pending · **Retest: —**" (em dash for empty)

**Validation Points:**
- Enum values formatted as user-friendly labels:
  - RETEST_DUE → "Retest due"
  - PASS → "Pass"
  - FAIL → "Fail"
- Empty/null values show "—" (em dash)
- All fields separated by " · " (middle dot)
- No raw enum values displayed (e.g., not "RETEST_DUE")

---

### TC5: RBAC - Auditee Cannot Set Retest Field via API

**Priority:** HIGH
**Objective:** Verify that AUDITEE role cannot set or update retest field even via direct API call

**Precondition:**
- Observation exists
- Auditee user credentials available

**Steps:**
1. Login as auditee user in browser
2. Navigate to a published observation
3. Open browser DevTools Console
4. Attempt to create action plan with retest via API:
   ```javascript
   await fetch('/api/v1/observations/{observationId}/actions', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       plan: "Auditee trying to set retest",
       retest: "PASS"
     })
   }).then(r => r.json()).then(console.log);
   ```
5. Examine the API response

**Expected Results:**
- API returns error response
- Status code: 403 Forbidden
- Error message: "Only admin/auditor can set retest" or similar
- Action plan is NOT created, or created WITHOUT retest value
- No database changes for retest field

**Validation Points:**
- RBAC enforced at API level (not just UI)
- Clear error message for unauthorized action
- Security: auditee cannot bypass UI restrictions
- Admin/auditor can successfully set retest (verify with admin login)

---

### TC6: Observation Status Dropdown with New Values

**Priority:** HIGH
**Objective:** Verify that observation "Current Status" dropdown displays all 5 new status values with correct labels

**Precondition:** An observation exists in DRAFT status

**Steps:**
1. Login as admin or auditor user
2. Navigate to an observation detail page
3. Scroll to "Implementation Details" section
4. Locate the "Current Status" dropdown field
5. Click on the dropdown to expand options
6. Examine all available options

**Expected Results:**

**Current Status Dropdown Options (in order):**
1. "Pending MR" (value: PENDING_MR)
2. "MR under review" (value: MR_UNDER_REVIEW)
3. "Referred back for MR" (value: REFERRED_BACK)
4. "Observation finalised" (value: OBSERVATION_FINALISED)
5. "Resolved" (value: RESOLVED)

**Validation Points:**
- Exactly 5 options (no old PENDING, IN_PROGRESS options)
- Labels are user-friendly (not raw enum values)
- "MR" appears in first 3 options
- Default for new observations is "Pending MR"
- Dropdown is a `<select>` element
- No console errors

**Additional Check:**
- Hover or click on "MR" - verify tooltip/hint if implemented (optional)
- Verify MR = Management Response

---

### TC7: Auto-Transition - Auditee Feedback Changes Status to "MR under review"

**Priority:** HIGH
**Objective:** Verify that when auditee provides feedback and current status is "Pending MR", status automatically changes to "MR under review"

**Precondition:**
- Observation exists with currentStatus = "PENDING_MR"
- Observation is APPROVED and PUBLISHED (visible to auditee)

**Setup:**
1. Login as admin
2. Create or find an observation
3. Ensure currentStatus is "Pending MR"
4. Approve and publish the observation (if not already)
5. Logout

**Steps:**
1. Login as `auditee@example.com`
2. Navigate to the published observation
3. Scroll to "Auditee Section"
4. Fill in "Auditee Feedback" field:
   ```
   We have reviewed this observation and are working on implementing the recommended controls. Expected completion by end of month.
   ```
5. Click "Save" button
6. Wait for success message
7. Refresh the page
8. Scroll to "Implementation Details" section
9. Check the "Current Status" field

**Expected Results:**
- Save succeeds with success message
- After refresh, "Current Status" displays: **"MR under review"**
- Status changed automatically from "Pending MR" to "MR under review"
- Auditee Feedback is saved correctly
- No manual status change was required

**Validation Points:**
- Auto-transition triggers on auditee feedback
- Only triggers when status is PENDING_MR
- Transition is atomic (happens in same save operation)
- Audit trail logs the status change (check if visible)
- WebSocket broadcasts the update (verify real-time if possible)

---

### TC8: Auto-Transition Does NOT Trigger for Non-Pending MR Status

**Priority:** MEDIUM
**Objective:** Verify that auto-transition only works when current status is "Pending MR", not for other statuses

**Precondition:** Observation with currentStatus = "MR_UNDER_REVIEW" or "RESOLVED"

**Steps:**
1. Login as admin
2. Find or create observation
3. Set currentStatus to "MR under review" manually
4. Save and verify
5. Login as auditee
6. Navigate to same observation
7. Update "Auditee Feedback" field:
   ```
   Additional feedback after MR review
   ```
8. Click "Save"
9. Refresh page
10. Check "Current Status"

**Expected Results:**
- Save succeeds
- Auditee Feedback updates correctly
- **Current Status remains "MR under review"** (NO auto-transition)
- Status does NOT change to anything else
- System only auto-transitions from PENDING_MR, not from other statuses

**Validation Points:**
- Auto-transition has proper condition check
- No unintended status changes
- Business logic correctly implemented
- Status can still be changed manually by authorized users

---

### TC9: Action Plan Update with Auto-Trigger

**Priority:** MEDIUM
**Objective:** Verify that updating an existing action plan's status to "Completed" triggers retest auto-set

**Precondition:** An existing action plan with status "Pending" and no retest value

**Setup:**
1. Create action plan with:
   - Plan: "Initial plan"
   - Status: "Pending"
   - Retest: (blank)

**Steps:**
1. Note the action plan ID or identify it in the list
2. Use browser console or API to update status:
   ```javascript
   await fetch('/api/v1/observations/{obsId}/actions/{actionId}', {
     method: 'PATCH',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       status: "Completed"
     })
   }).then(r => r.json()).then(console.log);
   ```
3. Refresh the observation page
4. Check the updated action plan

**Expected Results:**
- Action plan status updates to "Completed"
- Retest field automatically sets to "Retest due"
- Display shows: "Status: Completed · Retest: Retest due"
- No manual retest selection was needed

**Alternative UI Method:**
- If action plans have edit UI, update via form
- Same expected result: auto-set retest to RETEST_DUE

**Validation Points:**
- Auto-trigger works on UPDATE (not just CREATE)
- API PATCH handler includes auto-trigger logic
- Database stores correct enum value
- No errors in console or server logs

---

### TC10: Display All New Fields Together in Action Plan

**Priority:** MEDIUM
**Objective:** Verify that action plans display all fields including the new retest field in the list view

**Precondition:** Multiple action plans exist with various field values

**Test Data:**
Create 2 action plans:
```
Plan 1:
- Plan: "Implement new control procedure"
- Owner: "John Doe"
- Target Date: 2025-10-15
- Status: "Completed"
- Retest: "Pass" (set manually)

Plan 2:
- Plan: "Review quarterly reports"
- Owner: (empty)
- Target Date: (empty)
- Status: "Pending"
- Retest: (empty)
```

**Steps:**
1. Login as admin user
2. Navigate to observation with both action plans
3. Examine the display of each action plan in the list

**Expected Results:**

**Plan 1 displays:**
```
Implement new control procedure
Owner: John Doe · Target: 10/15/2025 · Status: Completed · Retest: Pass
[timestamp]
```

**Plan 2 displays:**
```
Review quarterly reports
Owner: — · Target: — · Status: Pending · Retest: —
[timestamp]
```

**Validation Points:**
- All 4 metadata fields displayed: Owner, Target, Status, Retest
- Fields separated by " · " (middle dot)
- Empty values show "—" (em dash), not "null" or blank
- Date formats correctly (locale-aware)
- Retest shows user-friendly label
- No layout issues or text overflow

---

### TC11: Observation Status Workflow - Manual Status Changes

**Priority:** MEDIUM
**Objective:** Verify that authorized users can manually change observation status to any of the 5 values

**Precondition:** Observation in DRAFT status

**Steps:**
1. Login as admin user
2. Navigate to an observation
3. For each status value, perform:
   a. Select status from dropdown
   b. Click "Save"
   c. Refresh page
   d. Verify status persisted

**Status Values to Test:**
1. "Pending MR" → Save → Verify
2. "MR under review" → Save → Verify
3. "Referred back for MR" → Save → Verify
4. "Observation finalised" → Save → Verify
5. "Resolved" → Save → Verify

**Expected Results:**
- Each status change saves successfully
- After refresh, dropdown shows the selected status
- No validation errors
- All 5 statuses are selectable and saveable
- Status persists in database

**Validation Points:**
- Manual status changes work independently of auto-transitions
- All enum values are valid and accepted by API
- No restrictions on manual admin changes
- UI and database stay in sync

---

### TC12: CSV Export with New Fields

**Priority:** LOW
**Objective:** Verify that CSV export includes retest field for action plans and updated observation status

**Precondition:** Observations with action plans containing retest data exist

**Steps:**
1. Login as admin user
2. Ensure at least one observation has action plans with retest values
3. Navigate to Observations page
4. Click "Export CSV" button
5. Download the CSV file
6. Open CSV in text editor or spreadsheet

**Expected Results:**

**Observation CSV should show:**
- Column: "CurrentStatus" with values like "PENDING_MR", "MR_UNDER_REVIEW", etc.
- Old status values (PENDING, IN_PROGRESS) should not appear
- All observation data exports correctly

**Action Plans (if exported separately or included):**
- Column: "Retest" or similar
- Values: "RETEST_DUE", "PASS", "FAIL", or empty
- All action plan data exports correctly

**Validation Points:**
- CSV format is valid (no broken rows)
- New fields present in export
- Enum values exported (may be raw enum or formatted)
- No null/undefined errors in CSV
- Export completes without errors

---

## Test Execution Summary Template

| Test Case | Status | Notes | Defects |
|-----------|--------|-------|---------|
| TC1: Action plan UI - Target Date & Status dropdown | | | |
| TC2: Retest dropdown visibility (RBAC) | | | |
| TC3: Auto-trigger - Completed → Retest due | | | |
| TC4: Retest field display formatting | | | |
| TC5: RBAC - Auditee cannot set retest | | | |
| TC6: Observation status dropdown - 5 values | | | |
| TC7: Auto-transition - Feedback → MR under review | | | |
| TC8: Auto-transition condition check | | | |
| TC9: Action plan update auto-trigger | | | |
| TC10: Display all fields in action plan | | | |
| TC11: Manual observation status changes | | | |
| TC12: CSV export with new fields | | | |

**Status Options:** PASS | FAIL | BLOCKED | SKIP

---

## Known Limitations / Out of Scope

1. **Data Migration:** Old observations with PENDING/IN_PROGRESS status were updated to RESOLVED during schema migration
2. **Retest History:** No audit trail for retest value changes (uses generic action plan audit events)
3. **Status Transition Validation:** No restrictions on status flow (e.g., can go from RESOLVED back to PENDING_MR)
4. **Email Notifications:** Status changes do not trigger email notifications
5. **Bulk Operations:** Cannot bulk update action plan status or retest values

---

## Playwright MCP Execution Notes

**Navigation:**
- Base URL: `http://localhost:3000`
- Login Page: `http://localhost:3000/login`
- Observations Page: `http://localhost:3000/observations`
- Observation Detail: `http://localhost:3000/observations/{observationId}`

**Key Selectors:**

**Action Plan Form:**
- Plan input: `input[placeholder="Plan..."]`
- Owner input: `input[placeholder="Owner"]`
- Target Date input: `input[type="date"][placeholder="Target Date"]`
- Status dropdown: `select` (look for options "Pending", "Completed")
- Retest dropdown: `select` (look for options "Retest due", "Pass", "Fail")
- Add button: `button` with text "Add Action Plan"

**Action Plan Display:**
- Action plan list: Look for `<li>` elements in action plans section
- Display format: "Owner: ... · Target: ... · Status: ... · Retest: ..."

**Observation Status:**
- Status dropdown: `select` within "Implementation Details" section
- Options: "Pending MR", "MR under review", "Referred back for MR", "Observation finalised", "Resolved"

**Auditee Section:**
- Auditee Feedback: `textarea` or `input` with corresponding label

**Authentication:**
- Admin: `admin@example.com` / `admin123` (full access)
- Auditor: `auditor@example.com` / `auditor123` (can create action plans, set retest)
- Auditee: `auditee@example.com` / `auditee123` (cannot see/set retest)

**API Endpoints for Testing:**
- Create action plan: `POST /api/v1/observations/{id}/actions`
- Update action plan: `PATCH /api/v1/observations/{id}/actions/{actionId}`
- Update observation: `PATCH /api/v1/observations/{id}`
- Get action plans: `GET /api/v1/observations/{id}/actions`

---

## Dependencies

- Database schema updated with:
  - ActionPlan.retest field (ActionPlanRetest enum)
  - ObservationStatus enum updated (5 new values)
  - Default currentStatus = PENDING_MR
- Prisma client regenerated
- TypeScript compiles without errors
- Both dev servers running (Next.js on 3000, WebSocket on 3001)
- User roles seeded via `npm run db:seed`
- Test data (plants, audits, observations) created via UI

---

## Regression Testing Notes

After running these tests, verify:
- Other observation functionality still works (attachments, approvals, notes)
- Observation creation still works
- Observation list and filtering still work
- Old action plans (without retest) display correctly
- Other action plan features work (delete, etc.)
- Field locking still works
- Reports page reflects new status values
- No console errors on any page

---

## Pre-Test Checklist

Before executing tests:
- [ ] Run `npm run db:seed` - seed users
- [ ] Run `npm run typecheck` - should pass
- [ ] Run `npx prisma studio` - verify ActionPlan has retest field
- [ ] Run `npx prisma studio` - verify ObservationStatus has 5 values
- [ ] Start dev server: `npm run dev` (port 3000)
- [ ] Start WebSocket server: `npm run ws:dev` (port 3001)
- [ ] Verify login page loads at http://localhost:3000
- [ ] Verify admin login works
- [ ] **If missing:** Create test data via Playwright MCP:
  - [ ] Create at least one plant
  - [ ] Create at least one audit
  - [ ] Create at least one observation with status PENDING_MR
  - [ ] Create at least one published observation for auditee testing

---

## Test Data Setup Instructions

**PRIMARY METHOD:** Use Playwright MCP to create test data through the UI

**Step-by-step:**
1. **Login:** Navigate to `http://localhost:3000` → Login as admin
2. **Create Plant:** Plants page → Fill form (code: "TST-AP", name: "Action Plan Test Plant") → Submit
3. **Create Audit:** Audits page → Select plant → Create audit
4. **Create Observation:** Observations page → Link to audit → Create with status "Pending MR"
5. **Publish Observation (for auditee tests):** Approve and publish one observation

---

## Success Criteria

All HIGH priority test cases (TC1-TC7) must PASS for successful test execution.
At least 75% of all 12 test cases must PASS (minimum 9 PASS).
No critical defects blocking action plan or observation status functionality.
