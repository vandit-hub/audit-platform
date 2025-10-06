# Test Case Document - TASK7: Auditor View Restrictions & Auditee Field Restrictions

**Task:** Implement auditor audit filtering and auditee field disabling
**Test Method:** Playwright MCP Browser Automation
**Date Created:** 2025-10-06
**Status:** Ready for Execution (Blocked - Database Required)

---

## Test Environment Setup

**Prerequisites:**
- PostgreSQL database running at `localhost:5432`
- Application running at `http://localhost:3000`
- Database seeded with users via `npm run db:seed`
- Valid admin, auditor, and auditee credentials available

**Test Data Required:**
- **Users (Already Seeded):**
  - Admin User: `admin@example.com` / `admin123`
  - Auditor User: `auditor@example.com` / `auditor123`
  - Auditee User: `auditee@example.com` / `auditee123`

- **Additional Test Data (Create if Missing):**
  - At least 2 plants in the system
  - At least 3 audits with different assignments:
    - Audit A: Assigned to auditor@example.com
    - Audit B: Assigned to auditor@example.com
    - Audit C: NOT assigned to auditor@example.com (unassigned or assigned to different auditor)
  - At least 5 observations:
    - 2 observations in Audit A
    - 2 observations in Audit B
    - 1 observation in Audit C
  - Each observation should have:
    - Various field values filled (observationText, risksInvolved, riskCategory, etc.)
    - Mix of auditor-only fields and auditee-editable fields populated

**IMPORTANT - Test Data Setup:**
If plants, audits, or observations are not present in the database, create them manually using Playwright MCP from the UI before running the test cases:

1. **Create Plants:** Navigate to Plants page → Create plants with codes and names
2. **Create Audits:** Navigate to Audits page → Select plants → Create audits → Assign auditor via audit assignment
3. **Create Observations:** Navigate to Observations page → Create observations with various properties

Use Playwright MCP to automate this test data creation through the UI workflows, not via direct database manipulation or API calls.

---

## Critical Test Cases

**Before starting:** Ensure test data exists (users are seeded, but create plants/audits/observations via UI using Playwright MCP if missing). If already logged in from the start, log out and then log in again. **Database must be running at localhost:5432.**

---

### TC1: Verify Auditor Only Sees Assigned Audits

**Priority:** HIGH
**Objective:** Verify that AUDITOR role only sees audits where they are assigned via AuditAssignment

**Precondition:**
- Audit A: Assigned to auditor@example.com (via AuditAssignment table)
- Audit B: Assigned to auditor@example.com
- Audit C: NOT assigned to auditor@example.com
- Admin user can see all 3 audits

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as auditor user (`auditor@example.com` / `auditor123`)
3. Navigate to Audits page (`/audits`)
4. Note the number of audits displayed in the table
5. Verify only Audit A and Audit B are visible
6. Verify Audit C is NOT visible in the table
7. Logout
8. Login as admin user (`admin@example.com` / `admin123`)
9. Navigate to Audits page
10. Verify all 3 audits (A, B, C) are visible

**Expected Results:**
- Auditor sees only 2 audits (Audit A and Audit B)
- Auditor does NOT see Audit C
- Table heading shows "My Assigned Audits" for auditor
- Admin sees all 3 audits
- Table heading shows "All Audits" for admin
- No 403 errors or crashes
- Backend filtering prevents data leakage (check Network tab)

**Validation Points:**
- GET /api/v1/audits includes `assignments.some(auditorId)` filter for AUDITOR role
- API response contains only assigned audits for auditor
- Admin API response contains all audits
- No client-side filtering - security enforced at backend
- Audit count matches expected values

---

### TC2: Verify Auditor Cannot Create Audits (UI)

**Priority:** HIGH
**Objective:** Verify that AUDITOR role does not see the audit creation form

**Precondition:**
- User logged in as auditor

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as auditor user (`auditor@example.com` / `auditor123`)
3. Navigate to Audits page (`/audits`)
4. Verify the audit creation form is NOT visible
5. Verify a blue informational message appears: "You can view audits assigned to you below."
6. Logout
7. Login as admin user (`admin@example.com` / `admin123`)
8. Navigate to Audits page
9. Verify the audit creation form IS visible with title "Create an audit (Admin only)"

**Expected Results:**
- Auditor does NOT see audit creation form
- Informational message visible for auditor
- Admin sees audit creation form
- Form label says "Admin only" for admin
- UI matches role permissions

**Validation Points:**
- `useSession` hook provides correct role
- Conditional rendering based on `role === "ADMIN"`
- No form elements exposed to auditor
- Helpful message displayed to auditor

---

### TC3: Verify Auditor Cannot Create Audits (API)

**Priority:** HIGH
**Objective:** Verify that AUDITOR role receives 403 Forbidden when attempting to create audits via API

**Precondition:**
- User logged in as auditor
- Browser DevTools Network tab open

**Steps:**
1. Login as auditor user (`auditor@example.com` / `auditor123`)
2. Open browser DevTools → Network tab
3. Attempt to POST to `/api/v1/audits` endpoint (can simulate via curl or Postman if needed)
4. Expected payload:
   ```json
   {
     "plantId": "<valid-plant-id>",
     "title": "Test Audit",
     "purpose": "Testing"
   }
   ```
5. Observe the API response

**Expected Results:**
- API returns `403 Forbidden` status
- Response body contains error: `{"error": "Forbidden"}`
- AUDITOR role cannot bypass UI restriction via direct API call
- Backend enforces `assertAdmin` permission check

**Validation Points:**
- POST /api/v1/audits uses `assertAdmin(session?.user?.role)`
- Not using `assertAdminOrAuditor` anymore
- 403 status code returned
- Security enforced at API level

**Note:** This test may require using curl/Postman or browser console fetch to simulate the API call, as UI hides the form.

---

### TC4: Verify Auditee Field Restrictions in Observation Detail

**Priority:** HIGH
**Objective:** Verify that AUDITEE role sees disabled/frozen fields they cannot edit

**Precondition:**
- At least 1 observation exists
- User logged in as auditee

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as auditee user (`auditee@example.com` / `auditee123`)
3. Navigate to Observations page (`/observations`)
4. Click on any observation to open detail page
5. Verify the following fields are DISABLED (grayed out, cursor: not-allowed):
   - Observation Text (textarea)
   - Risks Involved (textarea)
   - Risk Category (select)
   - Likely Impact (select)
   - Concerned Process (select)
   - Auditor Person (input)
   - Auditor Response to Auditee Remarks (textarea)
6. Verify the following fields are ENABLED (editable):
   - Auditee Person (Tier 1) (input)
   - Auditee Person (Tier 2) (input)
   - Auditee Feedback (textarea)
   - Target Date (date input)
   - Person Responsible (input)
   - Current Status (select)
7. Try to click on a disabled field
8. Verify cursor shows "not-allowed" and field does not accept input
9. Verify disabled fields have gray background (bg-gray-50)
10. Verify locked fields (if any) have orange background (bg-orange-50)

**Expected Results:**
- 7 auditor-only fields are disabled for auditee
- 6 auditee-editable fields are enabled
- Disabled fields have visual styling: gray background, gray border
- Disabled fields show cursor: not-allowed
- Auditee can interact with enabled fields
- No 403 errors when opening observation
- Clean UX - no confusing error messages on save

**Validation Points:**
- `AUDITEE_EDITABLE_FIELDS` constant includes correct field names
- `isFieldDisabled()` function returns true for non-editable fields
- `disabled` attribute applied to 13 observation form fields
- Visual styling applied via `getFieldClassName()`
- Locked fields take precedence over disabled styling

---

### TC5: Verify Admin Full Access Maintained

**Priority:** HIGH
**Objective:** Verify that ADMIN role retains full access to all functionality

**Precondition:**
- Multiple audits exist (some assigned to auditors, some not)
- Multiple observations exist
- User logged in as admin

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as admin user (`admin@example.com` / `admin123`)
3. Navigate to Audits page
4. Verify ALL audits are visible (no filtering)
5. Verify audit creation form is visible
6. Verify can create a new audit successfully
7. Navigate to Observations page
8. Click on any observation to open detail
9. Verify ALL fields are enabled (not disabled)
10. Verify can edit any field (observationText, risksInvolved, auditeePersonTier1, etc.)
11. Make changes to multiple fields
12. Click "Save"
13. Verify changes saved successfully
14. Verify admin-only features still work (approve, publish, lock/unlock fields)

**Expected Results:**
- Admin sees all audits without filtering
- Admin can create audits
- Admin can edit all observation fields
- No fields are disabled for admin
- All existing admin functionality works
- No regression in admin capabilities

**Validation Points:**
- `isAdmin` check allows all operations
- `isFieldDisabled()` returns false for all fields when admin
- Backend does not filter audits for admin role
- Admin RBAC permissions unchanged

---

### TC6: Verify Auditor Field Access in Observations

**Priority:** HIGH
**Objective:** Verify that AUDITOR role can edit their designated fields and sees disabled auditee fields

**Precondition:**
- At least 1 observation exists
- User logged in as auditor

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as auditor user (`auditor@example.com` / `auditor123`)
3. Navigate to Observations page
4. Click on any observation to open detail
5. Verify the following fields are ENABLED (editable):
   - Observation Text (textarea)
   - Risks Involved (textarea)
   - Risk Category (select)
   - Likely Impact (select)
   - Concerned Process (select)
   - Auditor Person (input)
   - Auditor Response to Auditee Remarks (textarea in Auditee Section)
6. Verify the following fields are DISABLED (grayed out):
   - Auditee Person (Tier 1) (input)
   - Auditee Person (Tier 2) (input)
   - Auditee Feedback (textarea)
   - Target Date (date input)
   - Person Responsible (input)
   - Current Status (select)
7. Edit an auditor field (e.g., Observation Text)
8. Click "Save"
9. Verify changes saved successfully
10. Verify no 403 errors

**Expected Results:**
- Auditor can edit 7 auditor-designated fields
- Auditor cannot edit 6 auditee-designated fields
- Auditee fields are visually disabled (gray background)
- Auditor can save changes to auditor fields
- Good UX - clear which fields are editable
- No permission errors when saving

**Validation Points:**
- `isAuditor` check in `isFieldDisabled()` function
- Auditee fields disabled except `auditorResponseToAuditee`
- Backend RBAC enforces field-level permissions
- Frontend disabling prevents confusion

---

### TC7: Verify Auditee Cannot Edit Auditor Fields (Backend Enforcement)

**Priority:** HIGH
**Objective:** Verify that backend rejects attempts to edit restricted fields even if frontend is bypassed

**Precondition:**
- At least 1 observation exists
- User logged in as auditee
- Browser DevTools open

**Steps:**
1. Login as auditee user (`auditee@example.com` / `auditee123`)
2. Navigate to observation detail page
3. Open browser console
4. Attempt to PATCH observation with auditor-only field:
   ```javascript
   fetch('/api/v1/observations/<observation-id>', {
     method: 'PATCH',
     headers: {'content-type': 'application/json'},
     body: JSON.stringify({observationText: 'Hacked value'})
   })
   ```
5. Observe the API response

**Expected Results:**
- API returns `403 Forbidden` or filters out restricted fields
- Auditor-only fields are NOT updated in database
- Backend RBAC enforcement prevents field modification
- Frontend disabling is UX enhancement, not security mechanism

**Validation Points:**
- `/api/v1/observations/[id]/route.ts` enforces field-level RBAC
- `AUDITEE_FIELDS` set used in backend
- Restricted fields ignored or rejected
- Security not dependent on frontend

---

### TC8: Verify Locked Fields Take Precedence Over Role-Based Disabling

**Priority:** MEDIUM (included as edge case)
**Objective:** Verify that explicitly locked fields show orange styling, not gray disabled styling

**Precondition:**
- At least 1 observation exists with locked fields
- Admin locks a field (e.g., observationText)
- User logged in as auditee

**Steps:**
1. Login as admin user
2. Navigate to observation detail
3. Lock "Observation Text" field using lock button
4. Logout
5. Login as auditee user
6. Navigate to same observation detail
7. Verify "Observation Text" field shows:
   - Orange background (bg-orange-50)
   - Orange border (border-orange-300)
   - Lock icon (🔒)
   - "Locked" label
   - NOT gray background

**Expected Results:**
- Locked fields show orange styling (not gray)
- Lock icon and label visible
- Locked fields take precedence in `getFieldClassName()`
- Visual distinction between locked vs role-disabled fields
- Both prevent editing, but styling indicates reason

**Validation Points:**
- `isFieldLocked()` check happens before `isFieldDisabled()`
- Locked field styling applied first
- Orange styling for locks, gray for role-based disabling
- Clear visual feedback to user

---

### TC9: Verify Observations List Filters by Auditor's Audits

**Priority:** HIGH
**Objective:** Verify that observations list is filtered to show only observations from auditor's assigned audits

**Precondition:**
- Audit A: Assigned to auditor@example.com (2 observations)
- Audit B: Assigned to auditor@example.com (2 observations)
- Audit C: NOT assigned to auditor@example.com (1 observation)
- Total: 5 observations

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as auditor user (`auditor@example.com` / `auditor123`)
3. Navigate to Observations page (`/observations`)
4. Count the number of observations in the table
5. Verify only 4 observations are shown (from Audit A and B)
6. Verify observation from Audit C is NOT shown
7. Open browser DevTools → Network tab
8. Observe the API call to `/api/v1/observations`
9. Logout
10. Login as admin user
11. Navigate to Observations page
12. Verify all 5 observations are shown

**Expected Results:**
- Auditor sees only 4 observations (from assigned audits)
- Auditor does NOT see observation from Audit C
- Admin sees all 5 observations
- Backend filtering enforced (check API response)
- No data leakage

**Validation Points:**
- Observations API filters by audit assignments
- Backend joins Observation → Audit → AuditAssignment
- Where clause includes auditor assignment check
- API response matches filtered data

**Note:** This test requires backend implementation to filter observations by auditor's assigned audits. Implementation may be needed in `/api/v1/observations/route.ts`.

---

### TC10: Verify Reports Page Filters by Auditor's Audits

**Priority:** HIGH
**Objective:** Verify that reports page also filters data by auditor's assigned audits

**Precondition:**
- Same audit/observation setup as TC9
- User logged in as auditor

**Steps:**
1. Login as auditor user (`auditor@example.com` / `auditor123`)
2. Navigate to Reports page (`/reports`)
3. Verify observation count shows only observations from assigned audits
4. Verify risk counts exclude observations from non-assigned audits
5. Verify "Action plan due" section only shows assigned audits' data
6. Logout
7. Login as admin user
8. Navigate to Reports page
9. Verify all observations and audits included in reports

**Expected Results:**
- Reports data filtered for auditor
- Only assigned audits' observations included
- Risk counts accurate for filtered data
- Admin sees complete reports
- Consistent filtering across all pages

**Validation Points:**
- `/api/v1/reports/observations` endpoint filters by assignments
- Risk aggregation uses filtered data
- Action plan queries filtered
- Consistent RBAC enforcement

**Note:** This test requires backend implementation in reports endpoints.

---

## Test Execution Summary Template

| Test Case | Status | Notes | Defects |
|-----------|--------|-------|---------|
| TC1: Auditor sees only assigned audits | | | |
| TC2: Auditor cannot create audits (UI) | | | |
| TC3: Auditor cannot create audits (API) | | | |
| TC4: Auditee field restrictions | | | |
| TC5: Admin full access maintained | | | |
| TC6: Auditor field access in observations | | | |
| TC7: Backend enforces auditee restrictions | | | |
| TC8: Locked fields precedence | | | |
| TC9: Observations list filtered for auditor | | | |
| TC10: Reports page filtered for auditor | | | |

**Status Options:** PASS | FAIL | BLOCKED | SKIP

---

## Known Limitations / Out of Scope

1. **Observations/Reports Filtering:** TC9 and TC10 require additional backend implementation to filter observations and reports by auditor's assigned audits. This was not explicitly in TASK7 scope but is logical extension.
2. **Multiple Auditor Assignments:** Testing assumes single auditor per audit; multiple auditors assigned to same audit not extensively tested.
3. **Guest Role:** Guest user field restrictions not tested (out of scope for TASK7).
4. **Change Request Workflow:** Auditor change request workflow with locked observations not tested.
5. **Field Locking:** Comprehensive testing of field locking interaction with role-based disabling limited to TC8.

---

## Playwright MCP Execution Notes

**Navigation:**
- Base URL: `http://localhost:3000`
- Login Page: `http://localhost:3000/login`
- Audits Page: `http://localhost:3000/audits`
- Observations Page: `http://localhost:3000/observations`
- Observation Detail: `http://localhost:3000/observations/[id]`
- Reports Page: `http://localhost:3000/reports`

**Key Selectors:**

**Login Page:**
- Email input: `input[type="email"]`
- Password input: `input[type="password"]`
- Sign in button: `button` with text "Sign in"

**Audits Page:**
- Audit creation form: `form` element (should be visible for admin, hidden for auditor)
- Informational message: Text "You can view audits assigned to you below."
- Audits table: `table` element
- Table heading: `h2` with text "All Audits" or "My Assigned Audits"
- Audit rows: `tr` elements in `tbody`

**Observation Detail Page:**
- Observation Text: `textarea` for "Observation Text"
- Risk Category: `select` for "Risk Category"
- Auditee Person Tier 1: `input` for "Auditee Person (Tier 1)"
- Auditee Feedback: `textarea` for "Auditee Feedback"
- Save button: `button` with text "Save"
- Disabled fields: Look for `disabled` attribute on inputs/selects/textareas
- Locked fields: Look for orange background class `bg-orange-50`
- Role-disabled fields: Look for gray background class `bg-gray-50`

**Authentication:**
- Admin: admin@example.com / admin123 (full access)
- Auditor: auditor@example.com / auditor123 (assigned audits only, cannot create)
- Auditee: auditee@example.com / auditee123 (restricted field access)

**API Endpoints for Testing:**
- Audits list: `GET /api/v1/audits`
- Audit create: `POST /api/v1/audits` (should return 403 for auditor)
- Observations list: `GET /api/v1/observations`
- Observation update: `PATCH /api/v1/observations/[id]`
- Reports: `GET /api/v1/reports/observations`

---

## Dependencies

- PostgreSQL database running at localhost:5432
- Users seeded via `npm run db:seed`
- Audits created with AuditAssignment records linking to auditor users
- Observations created and linked to audits
- NextAuth session management working
- RBAC permissions enforced in backend
- Frontend useSession hook provides correct role
- Prisma client regenerated after schema changes

---

## Pre-Test Checklist

Before executing tests:
- [ ] Start PostgreSQL database (required)
- [ ] Run `npm run db:seed` - seed users
- [ ] Run `npm run typecheck` - should pass with no errors
- [ ] Start dev server: `npm run dev`
- [ ] Verify login page loads at http://localhost:3000
- [ ] Verify test user credentials work (login as admin)
- [ ] **If missing:** Create test data using Playwright MCP via UI:
  - [ ] Create at least 2 plants
  - [ ] Create at least 3 audits
  - [ ] Assign Audit A and B to auditor@example.com
  - [ ] Leave Audit C unassigned or assign to different auditor
  - [ ] Create at least 5 observations across the 3 audits
  - [ ] Fill observation fields with test data

---

## Test Data Setup Instructions

**PRIMARY METHOD (Recommended):** Use Playwright MCP to create test data through the UI

**Step-by-step UI-based creation:**

1. **Login:** Navigate to `http://localhost:3000` → Login as admin

2. **Create Plants:**
   - Go to Plants page → Create "Plant A" (code: "PA-01")
   - Create "Plant B" (code: "PB-01")

3. **Create Audits:**
   - Go to Audits page → Create Audit A for Plant A
   - Create Audit B for Plant A
   - Create Audit C for Plant B

4. **Assign Auditors:**
   - Open each audit detail page
   - Assign auditor@example.com to Audit A and Audit B
   - Leave Audit C unassigned or assign to different auditor

5. **Create Observations:**
   - Go to Observations page
   - Create 2 observations for Audit A
   - Create 2 observations for Audit B
   - Create 1 observation for Audit C
   - Fill various fields:
     - Observation Text (auditor field)
     - Risk Category (auditor field)
     - Auditee Person Tier 1 (auditee field)
     - Auditee Feedback (auditee field)

**Note:** Prefer UI-based creation with Playwright MCP as it validates the application's workflows.

---

## Success Criteria

- All 10 HIGH priority test cases (TC1-TC10) must PASS for successful test execution
- No critical defects blocking auditor view restrictions or auditee field restrictions
- Backend security enforced (not just frontend hiding)
- Clean UX with proper visual feedback for disabled fields
- Admin functionality not regressed
- All role-based access control working correctly
