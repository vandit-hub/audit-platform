# Test Case Document - TASK2: Observation Fields & Layout

**Task:** Reorganize observation form into sections, add auditorResponseToAuditee field, remove hodActionPlan field
**Test Method:** Playwright MCP Browser Automation
**Date Created:** 2025-10-01
**Status:** Ready for Execution

---

## Test Environment Setup

**Prerequisites:**
- Application running at `http://localhost:3000`
- Database seeded with users via `npm run db:seed`
- Valid admin and auditor credentials available

**Test Data Required:**
- **Users (Already Seeded):**
  - Admin User: `admin@example.com` / `admin123`
  - Auditor User: `auditor@example.com` / `auditor123`
  - Auditee User: `auditee@example.com` / `auditee123`

- **Additional Test Data (Create if Missing):**
  - At least one plant in the system
  - At least one audit associated with a plant
  - At least one observation in DRAFT status

**IMPORTANT - Test Data Setup:**
If plants, audits, or observations are not present in the database, create them manually using Playwright MCP from the UI before running the test cases:

1. **Create Plant:** Navigate to Plants page → Create new plant with code and name
2. **Create Audit:** Navigate to Audits page → Select plant → Create audit
3. **Create Observation:** Navigate to Observations page → Create observation linked to audit

Use Playwright MCP to automate this test data creation through the UI workflows, not via direct database manipulation or API calls. This ensures the application's creation flows are also validated.

---

## Critical Test Cases

**Before starting:** Ensure test data exists (users are seeded, but create plants/audits/observations via UI using Playwright MCP if missing).

---

### TC1: Verify Three-Section Layout in Observation Detail

**Priority:** HIGH
**Objective:** Verify that the observation form is organized into three distinct sections with proper visual separation

**Precondition:** An observation exists in the system

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as admin or auditor user
3. Navigate to Observations page
4. Click on any observation to open detail view
5. Scroll through the form and verify section structure

**Expected Results:**

The form displays three distinct sections with headers:

**Section 1: "Observation Details"**
- Observation Text *
- Risks Involved
- Risk Category
- Likely Impact
- Concerned Process
- Auditor Person

**Section 2: "Auditee Section"**
- Auditee Person (Tier 1)
- Auditee Person (Tier 2)
- Auditee Feedback
- Auditor Response to Auditee Remarks

**Section 3: "Implementation Details"**
- Target Date
- Person Responsible
- Current Status

**Validation Points:**
- Each section has a visible header with bottom border
- Sections are visually separated (spacing between sections)
- All 13 fields are present across the three sections
- Grid layout shows 2 columns for fields
- No "HOD Action Plan" field is visible anywhere

---

### TC2: Create and Edit Auditor Response to Auditee Field

**Priority:** HIGH
**Objective:** Verify that the new "Auditor Response to Auditee Remarks" field can be populated and saved

**Precondition:** An observation in DRAFT status exists

**Test Data:**
```
Auditee Feedback: "We have reviewed the observation and partially agree. The implementation will require coordination with the IT department."
Auditor Response to Auditee Remarks: "Acknowledged. Please provide a revised timeline after coordination with IT. The core control weakness must be addressed within this quarter."
```

**Steps:**
1. Login as auditor user
2. Navigate to an observation in DRAFT status
3. Scroll to "Auditee Section"
4. Fill in "Auditee Feedback" field with test data
5. Fill in "Auditor Response to Auditee Remarks" field with test data
6. Click "Save" button
7. Wait for success message
8. Refresh the page
9. Verify both fields display the saved data

**Expected Results:**
- Both fields save successfully
- Success message appears: "Observation updated successfully!"
- After refresh, both fields show the entered text
- Text is not truncated or corrupted
- Field is in the Auditee Section, not elsewhere

**Validation Points:**
- Field accepts multi-line text
- No character limit errors
- Data persists after page refresh
- No console errors

---

### TC3: Verify HOD Action Plan Field is Removed

**Priority:** HIGH
**Objective:** Confirm that the HOD Action Plan field no longer exists in the UI or database

**Steps:**
1. Login as admin user
2. Navigate to any observation detail page
3. Inspect all three sections of the form
4. Use browser search (Ctrl+F) to search for "HOD"
5. Use browser search to search for "Action Plan" in the form area
6. Check the field labels helper by viewing locked fields (if any exist)

**Expected Results:**
- No "HOD Action Plan" field exists in any section
- Search for "HOD" finds no matches in the form
- Search for "Action Plan" only finds the "Action Plans" section below the form (separate feature)
- Field label helper does not include "HOD Action Plan"
- No JavaScript errors related to hodActionPlan

**Validation Points:**
- Field completely removed from UI
- No broken references in console
- No null/undefined errors
- Old observations with hodActionPlan data don't cause errors

---

### TC4: Verify Creation Timestamp Display

**Priority:** HIGH
**Objective:** Verify that observation creation timestamp displays correctly in the header

**Precondition:** Multiple observations exist with different creation dates

**Steps:**
1. Login as any user
2. Navigate to Observations page
3. Note the creation date shown in the list (if available)
4. Click on an observation to open detail view
5. Check the header area below the title

**Expected Results:**
- Creation timestamp is displayed below the observation title
- Format: "Created: [date] at [time]" or locale-formatted equivalent
- Example: "Created: 10/1/2024, 2:30:45 PM"
- Timestamp is accurate and matches database data
- Text is gray and smaller than the main title

**Validation Points:**
- Timestamp is human-readable
- Locale-aware formatting (based on browser settings)
- Positioned logically near the title
- Does not interfere with page layout

---

### TC5: Verify Lock Utility Buttons Removed

**Priority:** HIGH
**Objective:** Confirm that the "Lock Sample Fields" and "Lock Text Field" buttons have been removed for admin users

**Precondition:** Logged in as admin user, observation with some locked fields

**Steps:**
1. Login as admin user
2. Navigate to any observation detail page
3. Scroll to the bottom of the form (below the action buttons)
4. Check the admin controls section
5. Verify the lock/unlock UI

**Expected Results:**
- "Lock Sample Fields" button does NOT exist
- "Lock Text Field" button does NOT exist
- Individual field unlock buttons (× buttons) STILL exist on locked field badges
- "Unlock All" button STILL exists if fields are locked
- The locked fields display section still functions correctly

**Validation Points:**
- Only two utility buttons removed, not all lock functionality
- Admin can still unlock individual fields via × button
- Admin can still unlock all fields via "Unlock All" button
- No broken UI or layout issues
- No console errors

---

### TC6: Test Field Locking with New Field

**Priority:** HIGH
**Objective:** Verify that the new auditorResponseToAuditee field can be locked and unlocked

**Precondition:** Admin user with an observation in DRAFT or SUBMITTED status

**Steps:**
1. Login as admin user
2. Open an observation detail page
3. Via browser console or API, lock the auditorResponseToAuditee field:
   ```
   POST /api/v1/observations/{id}/locks
   Body: {"fields": ["auditorResponseToAuditee"], "lock": true}
   ```
4. Refresh the page
5. Verify the field shows locked indicator (🔒 icon)
6. Verify the field has orange background/border
7. Click the × button on the locked field badge
8. Verify the field is unlocked

**Expected Results:**
- Field locks successfully via API
- Locked indicator appears next to field label
- Field background changes to orange-tinted
- Field appears in "Locked Fields" section for admin
- × button unlocks the field successfully
- After unlock, field returns to normal styling

**Validation Points:**
- Field name in locked badge shows: "Auditor Response to Auditee Remarks"
- Lock/unlock functionality works correctly
- No JavaScript errors
- WebSocket broadcasts lock changes (if applicable)

---

### TC7: Search Functionality with New Field

**Priority:** MEDIUM
**Objective:** Verify that search includes the new auditorResponseToAuditee field

**Precondition:** At least one observation has text in auditorResponseToAuditee field

**Test Data:**
```
Create an observation with:
Auditor Response to Auditee Remarks: "UNIQUE_SEARCH_TERM_12345 - This is a test response for search functionality"
```

**Steps:**
1. Login as admin user
2. Create or update an observation with the unique search term above
3. Navigate to Observations page
4. Enter "UNIQUE_SEARCH_TERM_12345" in the search box
5. Submit search
6. Verify results

**Expected Results:**
- Search returns the observation containing the unique term
- Observation appears in search results
- Search is case-insensitive
- Other observations without the term are filtered out

**Validation Points:**
- Search includes auditorResponseToAuditee field
- Search does NOT include hodActionPlan (removed field)
- Search performance is acceptable
- No console errors

---

### TC8: CSV Export with New Field

**Priority:** MEDIUM
**Objective:** Verify that CSV export includes the new field and excludes the old field

**Precondition:** Multiple observations exist with various field values

**Test Data:**
```
Observation 1:
- Auditee Feedback: "Test feedback 1"
- Auditor Response to Auditee Remarks: "Test response 1"

Observation 2:
- Auditee Feedback: "Test feedback 2"
- Auditor Response to Auditee Remarks: "" (empty)
```

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Click the "Export CSV" button (or navigate to export endpoint)
4. Download the CSV file
5. Open CSV in text editor or spreadsheet application
6. Examine headers and data

**Expected Results:**

**CSV Headers should include:**
- ...AuditeeFeedback, AuditorResponse... (NOT ActionPlan or HodActionPlan)

**CSV Data:**
- Observation 1 shows both feedback and response
- Observation 2 shows feedback but empty response cell
- No column for "HOD Action Plan" or similar
- Column header is "AuditorResponse" or similar short name

**Validation Points:**
- CSV structure is valid (no broken formatting)
- New field data exports correctly
- Old field (hodActionPlan) is not present
- Empty values show as empty cells, not "null" or "undefined"

---

### TC9: Field Permissions - Auditor Can Edit Response Field

**Priority:** HIGH
**Objective:** Verify that auditors can edit the auditorResponseToAuditee field (AUDITOR_FIELDS)

**Precondition:** Observation in DRAFT status

**Steps:**
1. Login as auditor user (NOT admin)
2. Navigate to an observation in DRAFT status
3. Attempt to edit "Auditor Response to Auditee Remarks" field
4. Enter text: "Auditor test response"
5. Click "Save"
6. Verify save succeeds

**Expected Results:**
- Auditor can edit the field
- Save succeeds without permission errors
- Success message appears
- Data persists after save

**Validation Points:**
- Field is in AUDITOR_FIELDS permission set
- No 403 Forbidden errors
- Auditor role has proper access
- Field is NOT in AUDITEE_FIELDS

---

### TC10: Field Permissions - Auditee Cannot Edit Response Field

**Priority:** MEDIUM
**Objective:** Verify that auditees CANNOT edit the auditorResponseToAuditee field

**Precondition:**
- Observation in APPROVED and PUBLISHED status (visible to auditee)
- Auditee user credentials available

**Steps:**
1. Login as auditee user (auditee@example.com)
2. Navigate to the published observation
3. Attempt to edit "Auditor Response to Auditee Remarks" field
4. Enter text: "Auditee trying to edit"
5. Click "Save"
6. Observe result

**Expected Results:**
- **Either:**
  - Field is read-only/disabled for auditee user, OR
  - Save fails with permission error
- Auditee can edit their own fields (Auditee Feedback) but not auditor's response
- Error message (if shown): "Field is not permitted" or similar

**Validation Points:**
- Field permission enforcement works
- Auditee can still edit their allowed fields
- No unauthorized data modification
- Proper error handling

---

### TC11: Multi-Section Layout - Visual Consistency

**Priority:** LOW
**Objective:** Verify visual design and spacing of the three-section layout

**Steps:**
1. Login as any user
2. Open an observation detail page
3. View the form at various viewport widths (desktop, tablet, mobile)
4. Check visual consistency

**Expected Results:**
- Section headers are bold and have bottom borders
- Spacing between sections is consistent (appears to be more than within-section spacing)
- At desktop width: 2-column grid for fields
- At mobile width: Single column layout (responsive)
- Section headers remain visible during scroll
- No overlapping or cut-off text

**Validation Points:**
- Professional visual appearance
- Consistent with existing design system
- Good UX (easy to find fields)
- No CSS layout issues

---

### TC12: Form Submission with All Auditee Section Fields

**Priority:** MEDIUM
**Objective:** Verify that all four fields in Auditee Section can be filled and saved together

**Test Data:**
```
Auditee Person (Tier 1): "John Doe - Plant Manager"
Auditee Person (Tier 2): "Jane Smith - Finance Head"
Auditee Feedback: "We acknowledge the observation and agree with the finding. Implementation is in progress."
Auditor Response to Auditee Remarks: "Good progress noted. Please provide evidence of completed controls by end of quarter."
```

**Steps:**
1. Login as admin user
2. Open an observation detail page
3. Fill all four fields in "Auditee Section" with data above
4. Click "Save"
5. Refresh page
6. Verify all data persists

**Expected Results:**
- All four fields save successfully in one operation
- No field data is lost or overwritten
- After refresh, all four fields display saved data
- No truncation or data corruption

**Validation Points:**
- Atomic save operation (all fields saved together)
- No race conditions or data loss
- Proper state management
- No console errors

---

### TC13: Reports API - Verify hodActionPlan Removed

**Priority:** LOW
**Objective:** Verify that the targets report no longer references hodActionPlan field

**Steps:**
1. Login as admin user
2. Navigate to Reports page (if available) or directly call API:
   ```
   GET /api/v1/reports/targets?days=30
   ```
3. Examine the response JSON
4. Check the structure of returned observations

**Expected Results:**
- API response does not include "plan" or "hodActionPlan" field
- Response structure includes: id, plant, targetDate, status, owner
- No null references or undefined errors
- Report data is accurate

**Validation Points:**
- API schema updated correctly
- No broken references in report
- Report still functions as expected
- Clean JSON response

---

## Test Execution Summary Template

| Test Case | Status | Notes | Defects |
|-----------|--------|-------|---------|
| TC1: Three-section layout | | | |
| TC2: Create/edit auditor response field | | | |
| TC3: HOD Action Plan removed | | | |
| TC4: Creation timestamp display | | | |
| TC5: Lock utility buttons removed | | | |
| TC6: Field locking with new field | | | |
| TC7: Search with new field | | | |
| TC8: CSV export with new field | | | |
| TC9: Auditor can edit response | | | |
| TC10: Auditee cannot edit response | | | |
| TC11: Visual consistency | | | |
| TC12: All Auditee section fields | | | |
| TC13: Reports API updated | | | |

**Status Options:** PASS | FAIL | BLOCKED | SKIP

---

## Known Limitations / Out of Scope

1. **Data Loss:** hodActionPlan data from old observations is permanently removed (by design)
2. **Migration:** No data migration from hodActionPlan to ActionPlan model (separate feature)
3. **WebSocket Testing:** Field lock WebSocket notifications not explicitly tested (should work generically)
4. **Field Length Limits:** No maximum length on auditorResponseToAuditee field
5. **Close/Back Enhancement:** ESC key shortcut for closing observation tab not implemented (optional per task)

---

## Playwright MCP Execution Notes

**Navigation:**
- Base URL: `http://localhost:3000`
- Login Page: `http://localhost:3000/login`
- Observations Page: `http://localhost:3000/observations`
- Observation Detail: `http://localhost:3000/observations/{observationId}`
- Reports: `http://localhost:3000/reports` (if applicable)

**Key Selectors:**

**Form Sections:**
- Section 1 header: Text "Observation Details"
- Section 2 header: Text "Auditee Section"
- Section 3 header: Text "Implementation Details"

**Fields in Auditee Section:**
- Label: "Auditee Person (Tier 1)" → `input` field
- Label: "Auditee Person (Tier 2)" → `input` field
- Label: "Auditee Feedback" → `textarea` field
- Label: "Auditor Response to Auditee Remarks" → `textarea` field

**Other Key Elements:**
- Creation timestamp: Text matching pattern "Created: " below title
- Save button: Button with text "Save"
- Success toast: Look for success message after save
- Lock indicator: 🔒 icon next to field labels
- Locked field badge: Orange background with field name
- Unlock button (×): Small button on locked field badges
- "Unlock All" button: Button with text "Unlock All"

**Fields that should NOT exist:**
- Label: "HOD Action Plan" (should not be found)
- Buttons: "Lock Sample Fields", "Lock Text Field" (should not exist)

**Authentication:**
- Admin: admin@example.com / admin123 (full access)
- Auditor: auditor@example.com / auditor123 (can edit auditor fields)
- Auditee: auditee@example.com / auditee123 (limited access)

**API Endpoints for Testing:**
- Field locks: `POST /api/v1/observations/{id}/locks`
- Observation update: `PATCH /api/v1/observations/{id}`
- CSV Export: `GET /api/v1/observations/export`
- Search: `GET /api/v1/observations?q=searchterm`
- Reports: `GET /api/v1/reports/targets`

---

## Dependencies

- Database schema must be updated with auditorResponseToAuditee field
- hodActionPlan field must be removed from database
- Prisma client must be regenerated
- TypeScript must compile without errors
- User roles seeded in database via `npm run db:seed`
- Test data (plants, audits, observations) created via UI using Playwright MCP if not present

---

## Regression Testing Notes

After running these tests, verify:
- Other observation functionality still works (attachments, approvals, notes, action plans)
- Observation creation still works
- Observation search and filtering still work
- Observation list page displays correctly
- Field locking for other fields still works
- Audit functionality not affected
- Reports page still functional
- No console errors on any page
- CSV export for audits still works (separate from observations export)

---

## Pre-Test Checklist

Before executing tests:
- [ ] Run `npm run db:seed` - seed users (admin, auditor, auditee, guest)
- [ ] Run `npm run typecheck` - should pass with no errors
- [ ] Run `npx prisma studio` - verify schema has auditorResponseToAuditee field
- [ ] Run `npx prisma studio` - verify hodActionPlan field is gone
- [ ] Start dev server: `npm run dev`
- [ ] Start WebSocket server: `npm run ws:dev`
- [ ] Verify login page loads at http://localhost:3000
- [ ] Verify test user credentials work (login as admin)
- [ ] **If missing:** Create test data using Playwright MCP via UI:
  - [ ] Create at least one plant
  - [ ] Create at least one audit
  - [ ] Create at least one observation in DRAFT status

---

## Test Data Setup Instructions

**PRIMARY METHOD (Recommended):** Use Playwright MCP to create test data through the UI

**Step-by-step UI-based creation:**
1. **Login:** Navigate to `http://localhost:3000` → Login as admin
2. **Create Plant:** Go to Plants page → Fill form (code: "TEST-01", name: "Test Plant") → Submit
3. **Create Audit:** Go to Audits page → Select "Test Plant" → Fill optional fields → Create audit
4. **Create Observation:** Go to Observations page → Fill form linking to test audit → Create observation

**ALTERNATIVE (API-based):** If UI flow fails, use browser console after logging in as admin:

```javascript
// Create a test observation via API (only if UI method fails)
await fetch('/api/v1/observations', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    auditId: 'YOUR_AUDIT_ID', // Replace with actual audit ID
    observationText: 'Test observation for TASK2 testing',
    auditeePersonTier1: 'Test Tier 1',
    auditeePersonTier2: 'Test Tier 2',
    auditeeFeedback: 'Test feedback',
    // Note: auditorResponseToAuditee will be added via PATCH during tests
  })
}).then(r => r.json()).then(console.log);
```

**Note:** Prefer UI-based creation with Playwright MCP as it also validates the application's creation workflows.

---

## Success Criteria

All HIGH priority test cases (TC1-TC10) must PASS for successful test execution.
At least 80% of all 13 test cases must PASS (minimum 11 PASS).
No critical defects blocking core observation functionality.
