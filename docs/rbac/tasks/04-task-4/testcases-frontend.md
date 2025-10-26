# RBAC Task 4: Observation Management - Playwright Browser Test Cases

## Test Summary

This document contains comprehensive end-to-end browser test cases using Playwright for the RBAC v2 Observation Management implementation. These tests validate the complete user workflows, UI interactions, real-time updates, and visual feedback.

**Total Test Cases**: 42
**Coverage Areas**:
- Observation listing and filtering (8 tests)
- Observation creation and editing (10 tests)
- Approval workflow UI (8 tests)
- Auditee assignment and collaboration (6 tests)
- Real-time WebSocket updates (4 tests)
- Audit lock enforcement in UI (6 tests)

**Base URL**: `http://localhost:3005`

**WebSocket URL**: `ws://localhost:3001`

---

## Test Environment Setup

### Prerequisites
1. PostgreSQL database running in Docker: `docker start audit-postgres`
2. Database seeded: `npm run db:seed`
3. Next.js app running: `npm run dev` (port 3005)
4. WebSocket server running: `npm run ws:dev` (port 3001)
5. Playwright installed: `npm install -D @playwright/test`

### Test Data Requirements
- At least 2 plants (Plant A, Plant B)
- At least 2 audits (1 unlocked, 1 locked)
- At least 5 observations in various approval states (DRAFT, SUBMITTED, APPROVED, REJECTED)
- Users: CFO, CXO, Audit Head, Auditor, Auditee, Guest with seeded credentials

### Default Test Credentials
```javascript
const TEST_USERS = {
  CFO: { email: 'cfo@example.com', password: 'cfo123' },
  CXO: { email: 'cxo@example.com', password: 'cxo123' },
  AUDIT_HEAD: { email: 'audithead@example.com', password: 'audithead123' },
  AUDITOR: { email: 'auditor@example.com', password: 'auditor123' },
  AUDITEE: { email: 'auditee@example.com', password: 'auditee123' },
  GUEST: { email: 'guest@example.com', password: 'guest123' }
};
```

---

## Playwright Test Helpers

### Authentication Helper
```javascript
async function login(page, email, password) {
  await page.goto('http://localhost:3005/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/audits', { timeout: 5000 });
}
```

### Logout Helper
```javascript
async function logout(page) {
  await page.click('button[aria-label="User menu"]');
  await page.click('text=Logout');
  await page.waitForURL('**/login');
}
```

---

## Test Group 1: Observation List and Filtering (Role-Based Visibility)

### E2E-001: CFO Sees All Observations
**Objective**: Verify CFO can view all observations in the system regardless of assignments
**Prerequisites**: Login as CFO, multiple observations exist across different audits

**User Actions**:
1. Login as CFO
2. Navigate to Observations page (`/observations`)
3. Verify observation count displayed
4. Check that observations from all audits and plants are visible

**Selectors/Locators**:
- Login form: `input[name="email"]`, `input[name="password"]`, `button[type="submit"]`
- Observations link: `a[href="/observations"]`
- Observation table: `table` or `[data-testid="observations-table"]`
- Observation rows: `tr[data-observation-id]`

**Expected Behavior**:
- Login successful, redirected to dashboard
- Observations page loads with full list
- All observations visible (no filtering applied)
- Count matches total observations in database
- Observations from all plants and audits displayed

**Assertions**:
```javascript
await expect(page.locator('tr[data-observation-id]')).toHaveCount(expectedTotal);
await expect(page.locator('text=No observations found')).not.toBeVisible();
```

---

### E2E-002: Auditor Sees Only Assigned Audit Observations
**Objective**: Verify AUDITOR sees only observations from audits with AuditAssignment
**Prerequisites**: Login as Auditor, AuditAssignment exists for specific audits

**User Actions**:
1. Login as Auditor
2. Navigate to Observations page
3. Verify only observations from assigned audits are visible
4. Check that unassigned audit observations are hidden

**Expected Behavior**:
- Only observations from audits with AuditAssignment displayed
- Observation count reflects filtered results
- No observations from unassigned audits visible

**Assertions**:
```javascript
const visibleObs = await page.locator('tr[data-observation-id]').all();
for (const obs of visibleObs) {
  const auditId = await obs.getAttribute('data-audit-id');
  expect(assignedAuditIds).toContain(auditId);
}
```

---

### E2E-003: Auditee Sees Only Assigned Observations
**Objective**: Verify AUDITEE sees only observations with ObservationAssignment
**Prerequisites**: Login as Auditee, ObservationAssignment exists for specific observations

**User Actions**:
1. Login as Auditee
2. Navigate to Observations page
3. Verify only assigned observations are visible
4. Check observation count

**Expected Behavior**:
- Only observations with ObservationAssignment displayed
- Observations from other audits/auditees hidden
- Badge or indicator shows "Assigned to me"

**Assertions**:
```javascript
await expect(page.locator('tr[data-observation-id]')).toHaveCount(assignedCount);
await expect(page.locator('[data-testid="assigned-badge"]')).toBeVisible();
```

---

### E2E-004: Guest Sees Only Published and Approved Observations
**Objective**: Verify GUEST sees only observations with `isPublished = true` and `approvalStatus = APPROVED`
**Prerequisites**: Login as Guest, mix of published/unpublished observations exist

**User Actions**:
1. Login as Guest
2. Navigate to Observations page
3. Verify only published and approved observations visible
4. Check that draft/submitted observations are hidden

**Expected Behavior**:
- Only published + approved observations displayed
- All visible observations show "Published" and "Approved" badges
- No draft or unpublished observations visible

**Assertions**:
```javascript
const observations = await page.locator('tr[data-observation-id]').all();
for (const obs of observations) {
  await expect(obs.locator('[data-testid="approval-status"]')).toHaveText('APPROVED');
  await expect(obs.locator('[data-testid="published-badge"]')).toBeVisible();
}
```

---

### E2E-005: Filter Observations by Plant
**Objective**: Verify plant filter correctly filters observation list
**Prerequisites**: Login as CFO, observations from multiple plants exist

**User Actions**:
1. Login as CFO
2. Navigate to Observations page
3. Click plant filter dropdown
4. Select specific plant
5. Verify filtered results

**Selectors/Locators**:
- Plant filter: `select[name="plantId"]` or `[data-testid="plant-filter"]`
- Plant option: `option[value="<plant_id>"]`

**Expected Behavior**:
- Filter dropdown shows list of plants
- Selecting plant updates observation list
- Only observations from selected plant displayed
- URL or filter state reflects selection

**Assertions**:
```javascript
await page.selectOption('select[name="plantId"]', plantId);
await page.waitForLoadState('networkidle');
await expect(page.locator('tr[data-observation-id][data-plant-id="' + plantId + '"]')).toHaveCount(expectedCount);
```

---

### E2E-006: Filter Observations by Risk Category
**Objective**: Verify risk category filter works correctly
**Prerequisites**: Login as CFO, observations with different risk categories exist

**User Actions**:
1. Navigate to Observations page
2. Click risk category filter
3. Select "Risk A"
4. Verify only Risk A observations displayed

**Expected Behavior**:
- Risk filter shows options: A, B, C
- Filtered observations all have selected risk category
- Badge shows risk level visually

**Assertions**:
```javascript
await page.click('button[data-testid="risk-filter"]');
await page.click('text=Risk A');
await expect(page.locator('[data-testid="risk-badge"]:has-text("A")')).toHaveCount(expectedCount);
```

---

### E2E-007: Search Observations by Text
**Objective**: Verify search functionality filters by observation text
**Prerequisites**: Login as CFO, observations with searchable text exist

**User Actions**:
1. Navigate to Observations page
2. Enter search term in search box
3. Press Enter or click search button
4. Verify search results

**Selectors/Locators**:
- Search input: `input[name="q"]` or `[data-testid="observation-search"]`
- Search button: `button[type="submit"]`

**Expected Behavior**:
- Search input accepts text
- Results update after search
- Visible observations contain search term in text fields
- Search term highlighted or emphasized

**Assertions**:
```javascript
await page.fill('input[name="q"]', 'compliance');
await page.press('input[name="q"]', 'Enter');
await page.waitForLoadState('networkidle');
const results = await page.locator('tr[data-observation-id]').all();
expect(results.length).toBeGreaterThan(0);
```

---

### E2E-008: Sort Observations by Created Date
**Objective**: Verify sorting functionality changes observation order
**Prerequisites**: Login as CFO, multiple observations exist

**User Actions**:
1. Navigate to Observations page
2. Click "Created Date" column header
3. Verify sort order (ascending)
4. Click again to toggle descending
5. Verify sort order changed

**Selectors/Locators**:
- Sort column header: `th[data-sort="createdAt"]` or `button[aria-label="Sort by created date"]`

**Expected Behavior**:
- First click: Sort ascending (oldest first)
- Second click: Sort descending (newest first)
- Sort indicator (arrow icon) updates
- Observation list reorders correctly

**Assertions**:
```javascript
await page.click('th[data-sort="createdAt"]');
const firstDate = await page.locator('tr[data-observation-id]:first-child [data-testid="created-date"]').textContent();
const lastDate = await page.locator('tr[data-observation-id]:last-child [data-testid="created-date"]').textContent();
expect(new Date(firstDate) <= new Date(lastDate)).toBeTruthy();
```

---

## Test Group 2: Observation Creation and Editing

### E2E-009: Auditor Can Create New Observation
**Objective**: Verify AUDITOR can create observation from assigned audit
**Prerequisites**: Login as Auditor, assigned to audit

**User Actions**:
1. Login as Auditor
2. Navigate to specific audit detail page (`/audits/[id]`)
3. Click "Create Observation" button
4. Fill observation form:
   - Observation text: "Test observation for compliance issue"
   - Risk category: "B"
   - Concerned process: "P2P"
5. Click "Save" or "Create" button
6. Verify success message
7. Verify redirected to observation detail page

**Selectors/Locators**:
- Create button: `button:has-text("Create Observation")` or `[data-testid="create-observation-btn"]`
- Form fields:
  - `textarea[name="observationText"]`
  - `select[name="riskCategory"]`
  - `select[name="concernedProcess"]`
- Submit button: `button[type="submit"]` or `button:has-text("Create")`

**Expected Behavior**:
- Create button visible for auditor
- Form opens (modal or new page)
- All required fields present
- Form submits successfully
- Success toast/notification appears
- Observation created with `approvalStatus = DRAFT`
- User redirected to observation detail page

**Assertions**:
```javascript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page).toHaveURL(/\/observations\/[a-z0-9]+/);
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('DRAFT');
```

---

### E2E-010: Auditor Can Edit Draft Observation
**Objective**: Verify AUDITOR can edit observation with `approvalStatus = DRAFT`
**Prerequisites**: Login as Auditor, draft observation from assigned audit exists

**User Actions**:
1. Login as Auditor
2. Navigate to draft observation detail page
3. Click "Edit" button
4. Modify observation text
5. Change risk category
6. Click "Save" button
7. Verify changes saved

**Selectors/Locators**:
- Edit button: `button:has-text("Edit")` or `[data-testid="edit-observation-btn"]`
- Form fields: same as creation
- Save button: `button:has-text("Save")`

**Expected Behavior**:
- Edit button visible for draft observation
- Form pre-populated with current values
- Changes can be made to auditor fields only
- Save successful with success message
- Page updates with new values
- Audit trail updated (verify timestamp)

**Assertions**:
```javascript
const newText = 'Updated observation text';
await page.fill('textarea[name="observationText"]', newText);
await page.click('button:has-text("Save")');
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="observation-text"]')).toHaveText(newText);
```

---

### E2E-011: Auditor Cannot Edit Submitted Observation
**Objective**: Verify AUDITOR cannot edit observation with `approvalStatus = SUBMITTED`
**Prerequisites**: Login as Auditor, submitted observation exists

**User Actions**:
1. Login as Auditor
2. Navigate to submitted observation detail page
3. Verify "Edit" button is disabled or hidden
4. If visible, attempt to click and verify error message

**Expected Behavior**:
- Edit button disabled or hidden
- Observation fields read-only
- Badge shows "SUBMITTED" status
- Message indicates "Waiting for approval" or similar

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Edit")')).toBeDisabled();
// Or
await expect(page.locator('button:has-text("Edit")')).not.toBeVisible();
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('SUBMITTED');
```

---

### E2E-012: Auditor Cannot Edit Approved Observation
**Objective**: Verify AUDITOR cannot edit observation with `approvalStatus = APPROVED`
**Prerequisites**: Login as Auditor, approved observation exists

**User Actions**:
1. Login as Auditor
2. Navigate to approved observation detail page
3. Verify "Edit" button disabled/hidden
4. Verify "Request Change" button visible (if change request feature active)

**Expected Behavior**:
- Edit button disabled/hidden
- Observation fields read-only
- Badge shows "APPROVED" status
- "Request Change" button may be visible for change request workflow

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Edit")')).not.toBeVisible();
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('APPROVED');
// Change request button may be visible
// await expect(page.locator('button:has-text("Request Change")')).toBeVisible();
```

---

### E2E-013: Auditee Can Edit Auditee Fields on Assigned Observation
**Objective**: Verify AUDITEE can edit auditee fields when assigned
**Prerequisites**: Login as Auditee, ObservationAssignment exists

**User Actions**:
1. Login as Auditee
2. Navigate to assigned observation detail page
3. Click "Edit" or "Provide Response" button
4. Fill auditee fields:
   - Auditee feedback: "We will implement corrective measures"
   - Target date: "2025-12-31"
   - Person responsible: "Jane Doe"
5. Click "Save" button
6. Verify success message

**Selectors/Locators**:
- Auditee section: `[data-testid="auditee-section"]`
- Feedback field: `textarea[name="auditeeFeedback"]`
- Target date: `input[name="targetDate"]`
- Responsible person: `input[name="personResponsibleToImplement"]`

**Expected Behavior**:
- Auditee can edit only auditee fields
- Auditor fields are read-only
- Save successful
- Changes reflected immediately
- Status may auto-transition (PENDING_MR → MR_UNDER_REVIEW)

**Assertions**:
```javascript
await page.fill('textarea[name="auditeeFeedback"]', feedback);
await page.click('button:has-text("Save")');
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="auditee-feedback"]')).toHaveText(feedback);
```

---

### E2E-014: Auditee Can Edit Even When Observation Approved
**Objective**: Verify AUDITEE can edit auditee fields even when `approvalStatus = APPROVED`
**Prerequisites**: Login as Auditee, assigned observation with approved status, audit not locked

**User Actions**:
1. Login as Auditee
2. Navigate to approved assigned observation
3. Verify edit capability for auditee fields
4. Make changes
5. Save successfully

**Expected Behavior**:
- Auditee fields editable despite APPROVED status
- Auditor fields remain read-only
- Save successful
- Observation remains APPROVED (no status change)

**Assertions**:
```javascript
await expect(page.locator('textarea[name="auditeeFeedback"]')).not.toBeDisabled();
await page.fill('textarea[name="auditeeFeedback"]', 'Update on approved observation');
await page.click('button:has-text("Save")');
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('APPROVED');
```

---

### E2E-015: Auditee Cannot Edit Auditor Fields
**Objective**: Verify AUDITEE cannot modify auditor fields
**Prerequisites**: Login as Auditee, assigned observation exists

**User Actions**:
1. Login as Auditee
2. Navigate to assigned observation detail page
3. Verify auditor fields are read-only or disabled
4. Attempt to edit (if possible) should fail or be blocked

**Expected Behavior**:
- Observation text, risk category, process fields read-only
- Only auditee section editable
- Visual distinction between editable and read-only sections

**Assertions**:
```javascript
await expect(page.locator('textarea[name="observationText"]')).toBeDisabled();
await expect(page.locator('select[name="riskCategory"]')).toBeDisabled();
```

---

### E2E-016: CFO Can Edit Any Field Regardless of Status
**Objective**: Verify CFO short-circuit allows editing all fields
**Prerequisites**: Login as CFO, approved observation exists

**User Actions**:
1. Login as CFO
2. Navigate to approved observation
3. Click "Edit" button
4. Modify both auditor and auditee fields
5. Save successfully

**Expected Behavior**:
- All fields editable for CFO
- No restrictions based on approval status
- Save successful
- Changes reflected immediately

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Edit")')).toBeEnabled();
await page.click('button:has-text("Edit")');
await expect(page.locator('textarea[name="observationText"]')).not.toBeDisabled();
await expect(page.locator('textarea[name="auditeeFeedback"]')).not.toBeDisabled();
```

---

### E2E-017: Locked Audit Prevents Editing (Auditor)
**Objective**: Verify audit lock blocks all editing for non-CFO users
**Prerequisites**: Login as Auditor, observation in locked audit

**User Actions**:
1. Login as Auditor
2. Navigate to observation from locked audit
3. Verify edit button disabled/hidden
4. Verify "Audit Locked" indicator visible

**Expected Behavior**:
- Edit button disabled or hidden
- Lock icon or badge displayed
- Message: "Audit is locked. No modifications allowed."
- All form fields disabled

**Assertions**:
```javascript
await expect(page.locator('[data-testid="audit-locked-badge"]')).toBeVisible();
await expect(page.locator('button:has-text("Edit")')).toBeDisabled();
await expect(page.locator('[data-testid="lock-message"]')).toHaveText(/Audit is locked/);
```

---

### E2E-018: CFO Can Edit Observation in Locked Audit
**Objective**: Verify CFO bypasses audit lock in UI
**Prerequisites**: Login as CFO, observation in locked audit

**User Actions**:
1. Login as CFO
2. Navigate to observation from locked audit
3. Verify edit button is enabled
4. Make changes and save successfully

**Expected Behavior**:
- Lock badge visible but edit button enabled
- CFO override message or indicator
- Edit and save successful

**Assertions**:
```javascript
await expect(page.locator('[data-testid="audit-locked-badge"]')).toBeVisible();
await expect(page.locator('button:has-text("Edit")')).toBeEnabled();
await expect(page.locator('[data-testid="cfo-override-indicator"]')).toBeVisible();
```

---

## Test Group 3: Approval Workflow UI

### E2E-019: Auditor Can Submit Draft Observation
**Objective**: Verify AUDITOR can submit observation for approval via UI
**Prerequisites**: Login as Auditor, draft observation from assigned audit exists

**User Actions**:
1. Login as Auditor
2. Navigate to draft observation detail page
3. Click "Submit for Approval" button
4. Confirm submission (if confirmation dialog)
5. Verify status changes to SUBMITTED
6. Verify success message

**Selectors/Locators**:
- Submit button: `button:has-text("Submit for Approval")` or `[data-testid="submit-observation-btn"]`
- Confirmation dialog: `[role="dialog"]` or `[data-testid="confirm-dialog"]`
- Confirm button: `button:has-text("Confirm")`

**Expected Behavior**:
- Submit button visible for draft observation
- Confirmation dialog appears (optional)
- Status changes from DRAFT to SUBMITTED
- Badge updates to "SUBMITTED"
- Success notification appears
- Edit button becomes disabled
- Timeline/history shows submission event

**Assertions**:
```javascript
await page.click('button:has-text("Submit for Approval")');
// If confirmation dialog
// await page.click('button:has-text("Confirm")');
await expect(page.locator('[data-testid="success-toast"]')).toHaveText(/submitted/i);
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('SUBMITTED');
await expect(page.locator('button:has-text("Edit")')).toBeDisabled();
```

---

### E2E-020: Audit Head Can Approve Submitted Observation
**Objective**: Verify AUDIT_HEAD can approve observation from assigned audit
**Prerequisites**: Login as Audit Head, submitted observation where they are audit head

**User Actions**:
1. Login as Audit Head
2. Navigate to submitted observation detail page
3. Click "Approve" button
4. Enter optional approval comment in dialog
5. Click "Confirm Approval" button
6. Verify status changes to APPROVED
7. Verify success message

**Selectors/Locators**:
- Approve button: `button:has-text("Approve")` or `[data-testid="approve-btn"]`
- Comment field: `textarea[name="comment"]` in dialog
- Confirm button: `button:has-text("Confirm Approval")`

**Expected Behavior**:
- Approve button visible for submitted observation
- Approval dialog appears with optional comment field
- Status changes from SUBMITTED to APPROVED
- Badge updates to "APPROVED" (green color)
- Success notification appears
- Approval history updated with timestamp and actor
- Timeline shows approval event

**Assertions**:
```javascript
await page.click('button:has-text("Approve")');
await page.fill('textarea[name="comment"]', 'Approved for implementation');
await page.click('button:has-text("Confirm Approval")');
await expect(page.locator('[data-testid="success-toast"]')).toHaveText(/approved/i);
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('APPROVED');
await expect(page.locator('[data-testid="approval-badge"]')).toHaveClass(/bg-green/);
```

---

### E2E-021: Audit Head Can Reject Submitted Observation
**Objective**: Verify AUDIT_HEAD can reject observation with feedback
**Prerequisites**: Login as Audit Head, submitted observation exists

**User Actions**:
1. Login as Audit Head
2. Navigate to submitted observation detail page
3. Click "Reject" button
4. Enter rejection comment: "Needs more detail on financial impact"
5. Click "Confirm Rejection" button
6. Verify status changes to REJECTED
7. Verify rejection comment visible

**Selectors/Locators**:
- Reject button: `button:has-text("Reject")` or `[data-testid="reject-btn"]`
- Comment field: `textarea[name="comment"]` (required for rejection)
- Confirm button: `button:has-text("Confirm Rejection")`

**Expected Behavior**:
- Reject button visible for submitted observation
- Rejection dialog appears with comment field
- Comment field may be required
- Status changes from SUBMITTED to REJECTED
- Badge updates to "REJECTED" (red color)
- Rejection comment displayed prominently
- Auditor can see rejection feedback
- Edit button re-enabled for auditor

**Assertions**:
```javascript
await page.click('button:has-text("Reject")');
await page.fill('textarea[name="comment"]', 'Needs more detail');
await page.click('button:has-text("Confirm Rejection")');
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('REJECTED');
await expect(page.locator('[data-testid="rejection-comment"]')).toHaveText(/Needs more detail/);
```

---

### E2E-022: Auditor Cannot Approve Observation
**Objective**: Verify AUDITOR role cannot see approve/reject buttons
**Prerequisites**: Login as Auditor, submitted observation exists

**User Actions**:
1. Login as Auditor
2. Navigate to submitted observation detail page (created by same auditor)
3. Verify approve/reject buttons not visible

**Expected Behavior**:
- Approve button not visible
- Reject button not visible
- Status badge shows "SUBMITTED"
- Message: "Waiting for approval from audit head"

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Approve")')).not.toBeVisible();
await expect(page.locator('button:has-text("Reject")')).not.toBeVisible();
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('SUBMITTED');
```

---

### E2E-023: Audit Head Cannot Approve Draft Observation
**Objective**: Verify approve button hidden/disabled for draft observations
**Prerequisites**: Login as Audit Head, draft observation exists

**User Actions**:
1. Login as Audit Head
2. Navigate to draft observation
3. Verify approve/reject buttons not visible
4. Verify message about submission requirement

**Expected Behavior**:
- Approve/reject buttons not visible
- Status shows "DRAFT"
- Message: "Observation must be submitted before approval"

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Approve")')).not.toBeVisible();
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('DRAFT');
```

---

### E2E-024: Audit Head Cannot Approve From Different Audit
**Objective**: Verify audit head cannot approve observation from audit they don't lead
**Prerequisites**: Login as Audit Head, observation from different audit head's audit

**User Actions**:
1. Login as Audit Head
2. Attempt to navigate to observation from different audit head's audit
3. Verify 404 or access denied (observation not in list)

**Expected Behavior**:
- Observation not visible in list (filtered out)
- Direct URL access returns 404 or access denied
- No approve/reject buttons

**Assertions**:
```javascript
await page.goto('http://localhost:3005/observations/' + otherAuditObservationId);
await expect(page.locator('text=Not found')).toBeVisible();
// Or redirected
await expect(page).toHaveURL(/\/observations$/);
```

---

### E2E-025: Locked Audit Prevents Approval Actions
**Objective**: Verify audit lock disables approve/reject buttons
**Prerequisites**: Login as Audit Head, submitted observation in locked audit

**User Actions**:
1. Login as Audit Head (who is audit head for this audit)
2. Navigate to observation from locked audit
3. Verify approve/reject buttons disabled
4. Verify lock message displayed

**Expected Behavior**:
- Approve/reject buttons disabled or hidden
- Lock badge visible
- Message: "Audit is locked. Approval actions unavailable."

**Assertions**:
```javascript
await expect(page.locator('[data-testid="audit-locked-badge"]')).toBeVisible();
await expect(page.locator('button:has-text("Approve")')).toBeDisabled();
await expect(page.locator('button:has-text("Reject")')).toBeDisabled();
```

---

### E2E-026: CFO Can Approve Observation in Locked Audit
**Objective**: Verify CFO can approve despite audit lock
**Prerequisites**: Login as CFO, submitted observation in locked audit

**User Actions**:
1. Login as CFO
2. Navigate to observation from locked audit
3. Verify approve button enabled
4. Approve observation successfully

**Expected Behavior**:
- Lock badge visible but approve button enabled
- CFO override indicator visible
- Approval successful

**Assertions**:
```javascript
await expect(page.locator('[data-testid="audit-locked-badge"]')).toBeVisible();
await expect(page.locator('button:has-text("Approve")')).toBeEnabled();
await page.click('button:has-text("Approve")');
await page.click('button:has-text("Confirm Approval")');
await expect(page.locator('[data-testid="approval-status"]')).toHaveText('APPROVED');
```

---

## Test Group 4: Auditee Assignment and Collaboration

### E2E-027: Audit Head Can Assign Auditee to Observation
**Objective**: Verify AUDIT_HEAD can assign auditee via UI
**Prerequisites**: Login as Audit Head, observation exists, auditee user exists

**User Actions**:
1. Login as Audit Head
2. Navigate to observation detail page
3. Click "Assign Auditee" button or link
4. Select auditee from dropdown or search
5. Click "Assign" button
6. Verify success message
7. Verify auditee appears in assigned list

**Selectors/Locators**:
- Assign button: `button:has-text("Assign Auditee")` or `[data-testid="assign-auditee-btn"]`
- User dropdown: `select[name="auditeeId"]` or autocomplete input
- Assign confirm: `button:has-text("Assign")`
- Assigned list: `[data-testid="assigned-auditees"]`

**Expected Behavior**:
- Assign button visible
- User selection UI appears (dropdown/search/modal)
- Only AUDITEE role users shown in list
- Assignment succeeds
- Success notification appears
- Auditee name appears in assigned list with badge
- Notification sent to auditee (verify via bell icon or email)

**Assertions**:
```javascript
await page.click('button:has-text("Assign Auditee")');
await page.selectOption('select[name="auditeeId"]', auditeeUserId);
await page.click('button:has-text("Assign")');
await expect(page.locator('[data-testid="success-toast"]')).toHaveText(/assigned/i);
await expect(page.locator('[data-testid="assigned-auditees"]')).toContainText(auditeeName);
```

---

### E2E-028: Auditor Can Assign Auditee
**Objective**: Verify AUDITOR can assign auditee to observation
**Prerequisites**: Login as Auditor, observation from assigned audit

**User Actions**:
1. Login as Auditor
2. Navigate to observation detail page
3. Assign auditee (same steps as E2E-027)
4. Verify assignment successful

**Expected Behavior**:
- Same as E2E-027
- Auditor has permission to assign

**Assertions**:
```javascript
// Same as E2E-027
```

---

### E2E-029: CXO Team Can Assign Auditee
**Objective**: Verify CXO_TEAM can assign auditee to observation
**Prerequisites**: Login as CXO Team member, observation exists

**User Actions**:
1. Login as CXO Team
2. Navigate to observation detail page
3. Assign auditee
4. Verify assignment successful

**Expected Behavior**:
- CXO Team has assignment permission
- Assignment succeeds

**Assertions**:
```javascript
// Same as E2E-027
```

---

### E2E-030: Auditee Cannot Assign Auditee
**Objective**: Verify AUDITEE role cannot assign auditees
**Prerequisites**: Login as Auditee, assigned observation

**User Actions**:
1. Login as Auditee
2. Navigate to assigned observation
3. Verify "Assign Auditee" button not visible

**Expected Behavior**:
- Assign button not visible
- Auditee can only see themselves in assigned list

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Assign Auditee")')).not.toBeVisible();
await expect(page.locator('[data-testid="assigned-auditees"]')).toContainText('You');
```

---

### E2E-031: Cannot Assign Non-Auditee User
**Objective**: Verify user selection only shows AUDITEE role users
**Prerequisites**: Login as Audit Head, observation exists

**User Actions**:
1. Login as Audit Head
2. Navigate to observation
3. Click "Assign Auditee"
4. Check user dropdown/search
5. Verify only AUDITEE role users shown

**Expected Behavior**:
- Dropdown only shows users with AUDITEE role
- Auditor, CFO, CXO users not in list
- If search, filtering shows only auditees

**Assertions**:
```javascript
await page.click('button:has-text("Assign Auditee")');
const options = await page.locator('select[name="auditeeId"] option').all();
for (const option of options) {
  const userRole = await option.getAttribute('data-role');
  expect(userRole).toBe('AUDITEE');
}
```

---

### E2E-032: Duplicate Assignment Shows Error
**Objective**: Verify duplicate assignment is prevented
**Prerequisites**: Login as Audit Head, observation already has auditee assigned

**User Actions**:
1. Login as Audit Head
2. Navigate to observation with existing auditee assignment
3. Try to assign same auditee again
4. Verify error message

**Expected Behavior**:
- Assignment attempt blocked
- Error message: "This auditee is already assigned to this observation"
- No duplicate assignments created

**Assertions**:
```javascript
await page.click('button:has-text("Assign Auditee")');
await page.selectOption('select[name="auditeeId"]', alreadyAssignedAuditeeId);
await page.click('button:has-text("Assign")');
await expect(page.locator('[data-testid="error-toast"]')).toHaveText(/already assigned/i);
```

---

## Test Group 5: Real-Time WebSocket Updates

### E2E-033: Real-Time Observation Update Notification
**Objective**: Verify WebSocket updates when another user edits observation
**Prerequisites**: Two browser sessions (Auditor 1 and Auditor 2), shared observation

**User Actions**:
**Session 1 (Auditor 1)**:
1. Login and navigate to observation detail page
2. Keep page open

**Session 2 (Auditor 2)**:
1. Login and navigate to same observation
2. Edit observation text
3. Save changes

**Back to Session 1**:
4. Verify real-time notification appears
5. Verify observation updates without page refresh

**Expected Behavior**:
- Session 1 receives WebSocket notification
- Toast notification: "Observation updated by [user]"
- Observation content updates in real-time
- No page refresh required

**Assertions**:
```javascript
// In Session 1 (Playwright context 1)
await context1Page.waitForSelector('[data-testid="update-notification"]', { timeout: 5000 });
await expect(context1Page.locator('[data-testid="observation-text"]')).toHaveText(updatedText);
```

---

### E2E-034: Real-Time Approval Status Change
**Objective**: Verify WebSocket notification when observation approved/rejected
**Prerequisites**: Two sessions (Auditor viewing, Audit Head approving)

**User Actions**:
**Session 1 (Auditor)**:
1. Login and view submitted observation

**Session 2 (Audit Head)**:
1. Login and approve same observation

**Back to Session 1**:
4. Verify status badge updates in real-time
5. Verify approval notification appears

**Expected Behavior**:
- Status badge updates from SUBMITTED to APPROVED without refresh
- Notification toast appears
- Edit button becomes disabled in real-time
- Approval history updates

**Assertions**:
```javascript
await context1Page.waitForSelector('[data-testid="approval-status"]:has-text("APPROVED")', { timeout: 5000 });
await expect(context1Page.locator('button:has-text("Edit")')).toBeDisabled();
```

---

### E2E-035: Real-Time Auditee Assignment Notification
**Objective**: Verify auditee receives notification when assigned
**Prerequisites**: Two sessions (Audit Head assigning, Auditee viewing)

**User Actions**:
**Session 1 (Auditee)**:
1. Login and view observations list

**Session 2 (Audit Head)**:
1. Login and assign auditee to observation

**Back to Session 1**:
3. Verify new observation appears in list
4. Verify notification bell icon shows new count

**Expected Behavior**:
- New observation appears in auditee's list without refresh
- Notification badge updates
- Toast notification: "You have been assigned to an observation"

**Assertions**:
```javascript
await context1Page.waitForSelector('[data-observation-id="' + newObsId + '"]', { timeout: 5000 });
await expect(context1Page.locator('[data-testid="notification-count"]')).toHaveText('1');
```

---

### E2E-036: Presence Indicator Shows Active Users
**Objective**: Verify user presence indicators show who is viewing observation
**Prerequisites**: Two sessions viewing same observation

**User Actions**:
**Session 1 (Auditor 1)**:
1. Login and navigate to observation detail

**Session 2 (Auditor 2)**:
1. Login and navigate to same observation

**Both Sessions**:
3. Verify presence indicators show both users

**Expected Behavior**:
- Presence avatars or indicators visible
- Shows users currently viewing observation
- Updates when user joins/leaves

**Assertions**:
```javascript
await context1Page.waitForSelector('[data-testid="presence-indicator"]', { timeout: 5000 });
const presenceUsers = await context1Page.locator('[data-testid="presence-avatar"]').count();
expect(presenceUsers).toBeGreaterThanOrEqual(2);
```

---

## Test Group 6: Audit Lock Enforcement in UI

### E2E-037: Lock Badge Visible for Locked Audits
**Objective**: Verify lock badge prominently displayed for locked audit observations
**Prerequisites**: Observation in locked audit exists

**User Actions**:
1. Login as any user
2. Navigate to observation from locked audit
3. Verify lock badge visible

**Expected Behavior**:
- Lock icon/badge prominently displayed near audit title
- Tooltip or message explains lock status
- Lock timestamp and who locked visible

**Assertions**:
```javascript
await expect(page.locator('[data-testid="audit-locked-badge"]')).toBeVisible();
await expect(page.locator('[data-testid="audit-locked-badge"]')).toHaveAttribute('title', /locked/i);
```

---

### E2E-038: All Edit Actions Disabled for Locked Audit (Auditor)
**Objective**: Verify all mutation actions disabled for auditor in locked audit
**Prerequisites**: Login as Auditor, observation in locked audit

**User Actions**:
1. Login as Auditor
2. Navigate to observation from locked audit
3. Verify all action buttons disabled

**Expected Behavior**:
- Edit button disabled
- Submit button disabled (if visible)
- Delete button disabled
- Lock message visible

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Edit")')).toBeDisabled();
await expect(page.locator('button:has-text("Submit")')).toBeDisabled();
await expect(page.locator('[data-testid="lock-message"]')).toBeVisible();
```

---

### E2E-039: All Edit Actions Disabled for Locked Audit (Audit Head)
**Objective**: Verify audit head also blocked by lock
**Prerequisites**: Login as Audit Head, observation in locked audit

**User Actions**:
1. Login as Audit Head (who is audit head for this audit)
2. Navigate to observation from locked audit
3. Verify approve/reject/edit/delete all disabled

**Expected Behavior**:
- All mutation actions disabled
- Only CFO can override

**Assertions**:
```javascript
await expect(page.locator('button:has-text("Edit")')).toBeDisabled();
await expect(page.locator('button:has-text("Approve")')).toBeDisabled();
await expect(page.locator('button:has-text("Delete")')).toBeDisabled();
```

---

### E2E-040: CFO Override Indicator for Locked Audit
**Objective**: Verify CFO sees override indicator and can edit
**Prerequisites**: Login as CFO, observation in locked audit

**User Actions**:
1. Login as CFO
2. Navigate to observation from locked audit
3. Verify lock badge visible but actions enabled
4. Verify CFO override message

**Expected Behavior**:
- Lock badge visible
- All action buttons enabled for CFO
- Message: "CFO Override - You can edit locked audits"
- Visual distinction (e.g., warning color)

**Assertions**:
```javascript
await expect(page.locator('[data-testid="audit-locked-badge"]')).toBeVisible();
await expect(page.locator('[data-testid="cfo-override-indicator"]')).toBeVisible();
await expect(page.locator('button:has-text("Edit")')).toBeEnabled();
```

---

### E2E-041: Locked Audit Observations Read-Only for Auditee
**Objective**: Verify auditee cannot edit auditee fields in locked audit
**Prerequisites**: Login as Auditee, assigned observation in locked audit

**User Actions**:
1. Login as Auditee
2. Navigate to assigned observation from locked audit
3. Verify auditee fields disabled
4. Verify lock message

**Expected Behavior**:
- Auditee feedback fields disabled
- Lock message visible
- No save button visible

**Assertions**:
```javascript
await expect(page.locator('textarea[name="auditeeFeedback"]')).toBeDisabled();
await expect(page.locator('[data-testid="lock-message"]')).toHaveText(/locked/i);
```

---

### E2E-042: Visual Indicator Distinguishes Locked vs Unlocked
**Objective**: Verify clear visual distinction between locked and unlocked audits
**Prerequisites**: Observations from both locked and unlocked audits

**User Actions**:
1. Login as any user
2. Navigate to observations list
3. Compare locked vs unlocked observations

**Expected Behavior**:
- Locked observations have lock icon in list
- Color-coded badges (e.g., red for locked, green for active)
- Clear visual hierarchy

**Assertions**:
```javascript
const lockedObs = page.locator('[data-observation-id][data-audit-locked="true"]');
await expect(lockedObs.locator('[data-testid="lock-icon"]')).toBeVisible();

const unlockedObs = page.locator('[data-observation-id][data-audit-locked="false"]').first();
await expect(unlockedObs.locator('[data-testid="lock-icon"]')).not.toBeVisible();
```

---

## Additional Integration Scenarios

### E2E-INT-001: Complete Observation Lifecycle Workflow
**Objective**: Test full end-to-end observation lifecycle

**User Actions**:
1. Login as Auditor
2. Create new observation (DRAFT)
3. Edit observation details
4. Submit for approval (DRAFT → SUBMITTED)
5. Logout and login as Audit Head
6. Approve observation (SUBMITTED → APPROVED)
7. Logout and login as Audit Head
8. Assign auditee to observation
9. Logout and login as Auditee
10. Provide auditee feedback
11. Verify all history and audit trail visible

**Expected Behavior**:
- All steps succeed
- Status transitions correctly
- All roles can perform their actions
- Audit trail shows complete history
- Timeline shows all events in order

---

### E2E-INT-002: Rejection and Resubmission Cycle
**Objective**: Test rejection workflow end-to-end

**User Actions**:
1. Login as Auditor, submit observation
2. Login as Audit Head, reject with comment
3. Login as Auditor, view rejection feedback
4. Edit observation to address feedback
5. Resubmit observation
6. Login as Audit Head, approve

**Expected Behavior**:
- Rejection comment visible to auditor
- Auditor can edit after rejection
- Resubmission succeeds
- Approval succeeds after resubmission

---

### E2E-INT-003: Multi-User Real-Time Collaboration
**Objective**: Test multiple users interacting with same observation

**User Actions** (3 browser contexts):
1. Auditor viewing observation
2. Audit Head approving observation
3. Auditee providing feedback

**Expected Behavior**:
- All users see real-time updates
- No conflicts or race conditions
- Presence indicators show all users
- Notifications appear correctly

---

## Test Execution Environment

### Playwright Configuration
```javascript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false, // Run serially for WebSocket tests
  workers: 1,
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Test Data Cleanup
After each test suite, clean up test data:
```javascript
afterAll(async () => {
  // Delete test observations
  // Reset audit lock status
  // Clear test user sessions
});
```

---

## Test Execution Checklist

- [ ] Database seeded with test users and data
- [ ] Next.js app running on port 3005
- [ ] WebSocket server running on port 3001
- [ ] All 42 E2E test cases executed
- [ ] Role-based filtering verified in UI
- [ ] Field-level permissions enforced in forms
- [ ] Approval workflow UI validated
- [ ] Auditee assignment working correctly
- [ ] Real-time WebSocket updates confirmed
- [ ] Audit lock enforcement verified in UI
- [ ] CFO override behavior validated
- [ ] Error handling and user feedback tested
- [ ] Screenshots captured for failures
- [ ] Test execution report generated

---

## Notes

- Tests assume seeded database with default credentials
- WebSocket tests require stable connection to port 3001
- Some tests require multiple browser contexts for real-time features
- Visual regression testing can be added using Playwright screenshots
- Tests should be run against clean database state for consistency
- Consider adding accessibility tests (ARIA labels, keyboard navigation)
- Performance tests can validate page load times and API response times
