# Test Case Document - TASK1: Audit Fields & Structure

**Task:** Add five new metadata fields to audit creation and display
**Test Method:** Playwright MCP Browser Automation
**Date Created:** 2025-10-01
**Status:** Ready for Execution

---

## Test Environment Setup

**Prerequisites:**
- Application running at `http://localhost:3000`
- Database seeded with test data (plants and users)
- Valid admin credentials available

**Test Data Required:**
- Admin User: `admin@example.com` / `admin123`
- At least one plant in the system

---

## Critical Test Cases

### TC1: Create Audit with All New Fields Populated

**Priority:** HIGH
**Objective:** Verify that all five new fields can be populated and saved when creating an audit

**Test Data:**
```
Plant: Any available plant
Title: "Q4 Financial Audit 2024"
Purpose: "Comprehensive review of financial controls and compliance procedures for the fourth quarter"
Visit Start Date: "2024-12-01"
Visit End Date: "2024-12-15"
Visit Details: "On-site visit with finance team"
Management Response Date: "2025-01-15"
Final Presentation Date: "2025-01-30"
```

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as admin user
3. Navigate to Audits page
4. Fill in the audit creation form with all fields above
5. Click "Create audit" button
6. Wait for success message
7. Verify audit appears in the list

**Expected Results:**
- Form submission succeeds without errors
- Success message displays: "Audit created successfully for [Plant Name]!"
- New audit appears in the audits list table
- Period column shows "12/1/2024 → 12/15/2024"

**Validation Points:**
- No console errors
- HTTP POST returns 200 status
- Form resets after successful creation

---

### TC2: View Audit Detail with All New Fields

**Priority:** HIGH
**Objective:** Verify that all new fields display correctly in the audit detail view

**Precondition:** Audit from TC1 exists in the system

**Steps:**
1. Navigate to Audits page
2. Click "Open" link on the audit created in TC1
3. Verify the Details card shows all fields

**Expected Results:**

Details card displays:
```
Title: Q4 Financial Audit 2024
Purpose: Comprehensive review of financial controls and compliance procedures for the fourth quarter
Status: PLANNED
Visit Dates: 12/1/2024 → 12/15/2024
Visit details: On-site visit with finance team
Management Response Date: 1/15/2025
Final Presentation Date: 1/30/2025
```

**Validation Points:**
- All seven detail fields are visible
- Dates are formatted correctly (locale-aware)
- Multi-line purpose text displays properly
- No "undefined" or "null" text appears

---

### TC3: Create Audit with Only Required Field (Minimal Data)

**Priority:** HIGH
**Objective:** Verify that audits can be created with only the plant selected (all new fields optional)

**Test Data:**
```
Plant: Any available plant
Title: (leave empty)
Purpose: (leave empty)
Visit Start Date: (leave empty)
Visit End Date: (leave empty)
Visit Details: (leave empty)
Management Response Date: (leave empty)
Final Presentation Date: (leave empty)
```

**Steps:**
1. Navigate to Audits page
2. Select a plant from dropdown
3. Leave all other fields empty
4. Click "Create audit" button
5. Wait for success message
6. Click "Open" on the newly created audit

**Expected Results:**
- Audit is created successfully
- Success message appears
- Detail view shows:
  - Title: —
  - Purpose: —
  - Status: PLANNED
  - Visit Dates: — → —
  - Visit details: —
  - Management Response Date: —
  - Final Presentation Date: —

**Validation Points:**
- Empty optional fields show "—" placeholder
- No validation errors for empty optional fields
- Audit list shows "— → —" for Period column

---

### TC4: Create Audit with Partial Field Population

**Priority:** MEDIUM
**Objective:** Verify mixed scenarios where some fields are filled and others are empty

**Test Data:**
```
Plant: Any available plant
Title: "IT Security Audit"
Purpose: (leave empty)
Visit Start Date: "2024-11-10"
Visit End Date: (leave empty)
Visit Details: (leave empty)
Management Response Date: "2024-12-01"
Final Presentation Date: (leave empty)
```

**Steps:**
1. Navigate to Audits page
2. Fill in only the fields listed above
3. Click "Create audit"
4. Open the created audit detail page

**Expected Results:**
- Audit creation succeeds
- Detail view shows:
  - Title: IT Security Audit
  - Purpose: —
  - Visit Dates: 11/10/2024 → —
  - Management Response Date: 12/1/2024
  - Final Presentation Date: —

**Validation Points:**
- Populated fields display correctly
- Empty fields show "—"
- No JavaScript errors in console

---

### TC5: Audit List Table Date Display

**Priority:** MEDIUM
**Objective:** Verify the Period column shows visitStartDate and visitEndDate correctly

**Precondition:** Multiple audits exist with various date combinations

**Steps:**
1. Navigate to Audits page
2. Verify the audits list table
3. Check the Period column for each audit

**Expected Results:**

For audit with both dates:
- Shows: "12/1/2024 → 12/15/2024"

For audit with only start date:
- Shows: "12/1/2024 → —"

For audit with no dates:
- Shows: "— → —"

**Validation Points:**
- Date formatting is consistent
- Arrow separator (→) is present
- Dates align with what was entered in TC1-TC4

---

### TC6: Form Field Reset After Successful Creation

**Priority:** MEDIUM
**Objective:** Verify that all form fields clear after successful audit creation

**Steps:**
1. Navigate to Audits page
2. Fill in all fields in the create audit form
3. Click "Create audit"
4. Wait for success message
5. Verify all form fields are empty

**Expected Results:**
- Plant dropdown resets to "Select plant"
- Title input is empty
- Purpose textarea is empty
- All date inputs are empty
- Visit Details input is empty
- Form is ready for next audit creation

**Validation Points:**
- All state variables are cleared
- No residual data in any field
- User can immediately create another audit

---

### TC7: Long Text in Purpose Field

**Priority:** LOW
**Objective:** Verify that long multi-line text in Purpose field is handled correctly

**Test Data:**
```
Purpose: "This is a comprehensive audit covering multiple aspects including:
1. Financial statement accuracy and completeness
2. Internal control effectiveness assessment
3. Regulatory compliance verification
4. Risk management framework evaluation
5. Process efficiency analysis
6. Documentation and record-keeping review
This audit will involve interviews with key personnel, document review, transaction testing, and control walkthroughs across all major business processes."
```

**Steps:**
1. Navigate to Audits page
2. Create audit with the long purpose text above
3. Open the audit detail page
4. Verify the Purpose field display

**Expected Results:**
- Full text is saved and retrieved
- Text displays without truncation in detail view
- Line breaks are preserved or text wraps appropriately
- No layout breaking or overflow issues

**Validation Points:**
- Complete text is visible
- Detail card expands to accommodate content
- Text remains readable

---

### TC8: Date Validation (Future Enhancement Check)

**Priority:** LOW
**Objective:** Document current behavior for date validation (may not be implemented)

**Test Data:**
```
Visit Start Date: "2024-12-15"
Visit End Date: "2024-12-01" (earlier than start)
```

**Steps:**
1. Navigate to Audits page
2. Enter visit end date before visit start date
3. Attempt to create audit
4. Observe behavior

**Expected Results (Current Implementation):**
- Audit is created (no validation currently implemented)
- Dates are stored as entered
- Detail view shows: "12/15/2024 → 12/1/2024"

**Note:** This documents current behavior. Future enhancement may add validation per TASK1.md notes.

---

## Test Execution Summary Template

| Test Case | Status | Notes | Defects |
|-----------|--------|-------|---------|
| TC1: Create with all fields | | | |
| TC2: View detail with all fields | | | |
| TC3: Create minimal (required only) | | | |
| TC4: Create partial fields | | | |
| TC5: List table date display | | | |
| TC6: Form reset after creation | | | |
| TC7: Long text in purpose | | | |
| TC8: Date validation check | | | |

**Status Options:** PASS | FAIL | BLOCKED | SKIP

---

## Known Limitations / Out of Scope

1. **Optional Enhancement Not Implemented:** Title column in audit list table (subtask 6) was marked optional and not implemented
2. **Date Range Validation:** No validation currently exists to ensure visitEndDate is after visitStartDate
3. **Field Length Limits:** No maximum length validation on text fields (purpose, title, visitDetails)
4. **Migration Data:** Old audits have null values for new fields (expected behavior)

---

## Playwright MCP Execution Notes

**Navigation:**
- Base URL: `http://localhost:3000`
- Login Page: `http://localhost:3000/login`
- Audits Page: `http://localhost:3000/audits`
- Audit Detail: `http://localhost:3000/audits/{auditId}`

**Key Selectors:**
- Plant dropdown: `select` with first option "Select plant"
- Title input: Text input with label "Audit Title"
- Purpose textarea: Textarea with label "Audit Purpose"
- Date inputs: Date type inputs with specific labels
- Create button: Button with text "Create audit"
- Success message: Toast notification or success message element
- Audit table: Table with headers "Plant", "Period", "Status", "Progress", "Auditors"

**Authentication:**
- Login required before accessing /audits
- Use admin@example.com / admin123 for full access
- Session persists during test execution

---

## Dependencies

- Database must have at least one plant record
- Seeded users must include admin account
- Application must be running on localhost:3000
- WebSocket server should be running (may not affect these tests)

---

## Regression Testing Notes

After running these tests, verify:
- Existing observation functionality still works
- Audit assignment features still work
- Other audit-related pages (reports, checklists) still function
- No console errors on any page
