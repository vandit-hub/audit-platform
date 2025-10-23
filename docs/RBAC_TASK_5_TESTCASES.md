# RBAC Task 5: Playwright Browser Test Cases

**Test Suite**: RBAC v2 UI Testing (End-to-End)
**Date Created**: 2025-01-23
**Test Environment**: Development (localhost:3005)
**Test Framework**: Playwright
**Browser**: Chromium, Firefox, WebKit

## Test Summary

- **Total Test Cases**: 48
- **Coverage Areas**:
  - Navigation and Menu Visibility (6 tests)
  - Audit Management UI (10 tests)
  - Observation Management UI (15 tests)
  - Assignment Management UI (7 tests)
  - Workflow Testing (10 tests)

---

## Prerequisites

### Environment Setup
```bash
# Start development servers
npm run dev          # Next.js on port 3005
npm run ws:dev       # WebSocket server on port 3001

# Seed test data
npm run db:seed

# Install Playwright (if not already installed)
npx playwright install
```

### Test Data
All tests use seeded data with default credentials:
- **CFO**: cfo@example.com / cfo123
- **CXO Team**: cxo@example.com / cxo123
- **Audit Head**: audithead@example.com / audithead123
- **Auditor**: auditor@example.com / auditor123
- **Auditee**: auditee@example.com / auditee123

### Playwright Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially for state consistency
  use: {
    baseURL: 'http://localhost:3005',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

---

## Test Cases

### Category 1: Navigation and Menu Visibility

#### E2E-001: CFO Navigation Menu
**Test ID**: E2E-001
**Objective**: Verify CFO sees all navigation menu items
**Role**: CFO
**Prerequisites**:
- Application running on localhost:3005
- CFO user exists in database

**User Actions**:
1. Navigate to http://localhost:3005/login
2. Enter email: cfo@example.com
3. Enter password: cfo123
4. Click "Sign In" button
5. Verify redirect to dashboard
6. Inspect navigation bar

**Selectors/Locators**:
- Login email input: `input[name="email"]` or `input[type="email"]`
- Login password input: `input[name="password"]` or `input[type="password"]`
- Sign in button: `button[type="submit"]` with text "Sign In"
- Nav links: `nav a` within header

**Expected Behavior**:
- Successfully logged in
- Redirected to dashboard page (/)
- Navigation bar displays:
  - ✅ Plants link (`a[href="/plants"]`)
  - ✅ Audits link (`a[href="/audits"]`)
  - ✅ Observations link (`a[href="/observations"]`)
  - ✅ Reports link (`a[href="/reports"]`)
  - ✅ Users link (`a[href="/admin/users"]`)
- Role badge displays "CFO"
- User email visible in nav bar

**Assertions**:
```typescript
await expect(page.locator('a[href="/plants"]')).toBeVisible();
await expect(page.locator('a[href="/audits"]')).toBeVisible();
await expect(page.locator('a[href="/observations"]')).toBeVisible();
await expect(page.locator('a[href="/reports"]')).toBeVisible();
await expect(page.locator('a[href="/admin/users"]')).toBeVisible();
await expect(page.getByText('CFO')).toBeVisible();
```

---

#### E2E-002: CXO Team Navigation Menu
**Test ID**: E2E-002
**Objective**: Verify CXO_TEAM sees management navigation items
**Role**: CXO_TEAM
**Prerequisites**: CXO_TEAM user exists

**User Actions**:
1. Login as cxo@example.com / cxo123
2. Verify navigation menu items

**Expected Behavior**:
- Navigation shows: Plants, Audits, Observations, Reports, Users
- Same visibility as CFO

**Assertions**:
```typescript
await expect(page.locator('a[href="/plants"]')).toBeVisible();
await expect(page.locator('a[href="/audits"]')).toBeVisible();
await expect(page.locator('a[href="/observations"]')).toBeVisible();
await expect(page.locator('a[href="/reports"]')).toBeVisible();
await expect(page.locator('a[href="/admin/users"]')).toBeVisible();
await expect(page.getByText('CXO Team')).toBeVisible();
```

---

#### E2E-003: Audit Head Navigation Menu
**Test ID**: E2E-003
**Objective**: Verify AUDIT_HEAD sees restricted navigation
**Role**: AUDIT_HEAD
**Prerequisites**: AUDIT_HEAD user exists

**User Actions**:
1. Login as audithead@example.com / audithead123
2. Verify navigation menu items

**Expected Behavior**:
- Navigation shows: Audits, Observations, Reports
- Does NOT show: Plants, Users

**Assertions**:
```typescript
await expect(page.locator('a[href="/plants"]')).not.toBeVisible();
await expect(page.locator('a[href="/audits"]')).toBeVisible();
await expect(page.locator('a[href="/observations"]')).toBeVisible();
await expect(page.locator('a[href="/reports"]')).toBeVisible();
await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible();
await expect(page.getByText('Audit Head')).toBeVisible();
```

---

#### E2E-004: Auditor Navigation Menu
**Test ID**: E2E-004
**Objective**: Verify AUDITOR sees minimal navigation
**Role**: AUDITOR
**Prerequisites**: AUDITOR user exists

**User Actions**:
1. Login as auditor@example.com / auditor123
2. Verify navigation menu items

**Expected Behavior**:
- Navigation shows: Audits, Observations
- Does NOT show: Plants, Reports, Users

**Assertions**:
```typescript
await expect(page.locator('a[href="/plants"]')).not.toBeVisible();
await expect(page.locator('a[href="/audits"]')).toBeVisible();
await expect(page.locator('a[href="/observations"]')).toBeVisible();
await expect(page.locator('a[href="/reports"]')).not.toBeVisible();
await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible();
await expect(page.getByText('Auditor')).toBeVisible();
```

---

#### E2E-005: Auditee Navigation Menu
**Test ID**: E2E-005
**Objective**: Verify AUDITEE sees only Observations
**Role**: AUDITEE
**Prerequisites**: AUDITEE user exists

**User Actions**:
1. Login as auditee@example.com / auditee123
2. Verify navigation menu items

**Expected Behavior**:
- Navigation shows: Observations only
- Does NOT show: Plants, Audits, Reports, Users

**Assertions**:
```typescript
await expect(page.locator('a[href="/plants"]')).not.toBeVisible();
await expect(page.locator('a[href="/audits"]')).not.toBeVisible();
await expect(page.locator('a[href="/observations"]')).toBeVisible();
await expect(page.locator('a[href="/reports"]')).not.toBeVisible();
await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible();
await expect(page.getByText('Auditee')).toBeVisible();
```

---

#### E2E-006: Navigation Link Functionality
**Test ID**: E2E-006
**Objective**: Verify navigation links work correctly
**Role**: CFO (has access to all pages)
**Prerequisites**: Logged in as CFO

**User Actions**:
1. Login as CFO
2. Click "Plants" navigation link
3. Verify URL is /plants
4. Click "Audits" navigation link
5. Verify URL is /audits
6. Click "Observations" navigation link
7. Verify URL is /observations
8. Click "Reports" navigation link
9. Verify URL is /reports
10. Click "Users" navigation link
11. Verify URL is /admin/users

**Expected Behavior**:
- Each click navigates to correct page
- URL updates correctly
- Page content loads
- Active navigation item is highlighted

**Assertions**:
```typescript
await page.click('a[href="/plants"]');
await expect(page).toHaveURL(/\/plants/);

await page.click('a[href="/audits"]');
await expect(page).toHaveURL(/\/audits/);

// etc for all navigation items
```

---

### Category 2: Audit Management UI

#### E2E-007: Create Audit Form Visibility - CFO
**Test ID**: E2E-007
**Objective**: Verify CFO sees audit creation form
**Role**: CFO
**Prerequisites**: Logged in as CFO, at least one plant exists

**User Actions**:
1. Login as CFO
2. Navigate to /audits
3. Scroll to "Create Audit" section

**Expected Behavior**:
- "Create Audit (CFO/CXO Team)" heading visible
- Form fields visible:
  - Plant selector (dropdown)
  - Audit Title input
  - Audit Purpose textarea
  - Visit Start Date input
  - Visit End Date input
  - Management Response Date input
  - Final Presentation Date input
  - Visit Details input
- "Create Audit" button visible and enabled

**Assertions**:
```typescript
await expect(page.getByText('Create Audit (CFO/CXO Team)')).toBeVisible();
await expect(page.locator('select[name="plantId"]')).toBeVisible();
await expect(page.locator('input[name="title"]')).toBeVisible();
await expect(page.locator('button[type="submit"]').filter({hasText: 'Create Audit'})).toBeVisible();
```

---

#### E2E-008: Create Audit Form Hidden - Auditor
**Test ID**: E2E-008
**Objective**: Verify AUDITOR does NOT see audit creation form
**Role**: AUDITOR
**Prerequisites**: Logged in as AUDITOR

**User Actions**:
1. Login as AUDITOR
2. Navigate to /audits
3. Look for "Create Audit" section

**Expected Behavior**:
- "Create Audit" form is NOT visible
- Informational message displays: "You can view audits assigned to you below. Only CFO and CXO Team can create new audits."
- Audits list table is visible

**Assertions**:
```typescript
await expect(page.getByText('Create Audit (CFO/CXO Team)')).not.toBeVisible();
await expect(page.getByText('Only CFO and CXO Team can create new audits')).toBeVisible();
await expect(page.locator('table')).toBeVisible(); // Can see audit list
```

---

#### E2E-009: Create Audit Workflow - Success
**Test ID**: E2E-009
**Objective**: Verify successful audit creation
**Role**: CXO_TEAM
**Prerequisites**: Logged in as CXO_TEAM, plant exists

**User Actions**:
1. Login as CXO_TEAM
2. Navigate to /audits
3. Select plant from dropdown
4. Enter audit title: "Test Audit E2E-009"
5. Enter purpose: "E2E testing audit creation"
6. Set visit start date: tomorrow's date
7. Set visit end date: 7 days from tomorrow
8. Click "Create Audit" button
9. Wait for success message

**Expected Behavior**:
- Form submits successfully
- Success toast notification appears: "Audit created successfully for [Plant Name]!"
- Form fields are cleared
- New audit appears in the audits list table
- Audit status is "PLANNED"
- Lock status is "Open"

**Assertions**:
```typescript
await page.selectOption('select[name="plantId"]', {index: 1});
await page.fill('input[name="title"]', 'Test Audit E2E-009');
await page.fill('textarea[name="purpose"]', 'E2E testing audit creation');
await page.click('button[type="submit"]');

await expect(page.getByText(/Audit created successfully/i)).toBeVisible();
await expect(page.locator('table').getByText('Test Audit E2E-009')).toBeVisible();
await expect(page.locator('table').getByText('Open')).toBeVisible();
```

---

#### E2E-010: Audit Lock Status Indicators in List
**Test ID**: E2E-010
**Objective**: Verify lock status badges display correctly in audit list
**Role**: CFO
**Prerequisites**:
- Logged in as CFO
- Three audits exist: one open, one locked, one completed

**User Actions**:
1. Login as CFO
2. Navigate to /audits
3. Examine "Lock Status" column in audits table

**Expected Behavior**:
- Open audit shows badge: "Open" (neutral/gray styling)
- Locked audit shows badge: "🔒 Locked" (warning/orange styling)
- Completed audit shows badge: "Completed" (success/green styling)
- Lock icon visible for locked audits

**Assertions**:
```typescript
const lockStatusCells = page.locator('table tbody td:nth-child(5)'); // Lock Status column

// Check for different badge types
await expect(lockStatusCells.filter({hasText: 'Open'})).toHaveCount(1);
await expect(lockStatusCells.filter({hasText: 'Locked'})).toHaveCount(1);
await expect(lockStatusCells.filter({hasText: 'Completed'})).toHaveCount(1);

// Verify lock icon present
await expect(page.locator('svg').filter({has: page.locator('path[d*="M12 15v2m-6 4h12"]')})).toBeVisible();
```

---

#### E2E-011: Audit Detail Page - Lock Controls Visible
**Test ID**: E2E-011
**Objective**: Verify CFO/CXO sees audit lock controls
**Role**: CFO
**Prerequisites**:
- Logged in as CFO
- Unlocked audit exists with known ID

**User Actions**:
1. Login as CFO
2. Navigate to /audits
3. Click "Open →" link for unlocked audit
4. Examine "Audit Controls" card

**Expected Behavior**:
- "Audit Controls" section visible
- Current state badge shows "Open" (blue)
- Two buttons visible:
  - "Lock Audit" button (warning/orange)
  - "Mark Complete" button (success/green)
- Informational note about locking visible

**Assertions**:
```typescript
await page.click('table tbody tr:first-child a:has-text("Open →")');
await expect(page.getByText('Audit Controls')).toBeVisible();
await expect(page.getByRole('button', {name: 'Lock Audit'})).toBeVisible();
await expect(page.getByRole('button', {name: 'Mark Complete'})).toBeVisible();
await expect(page.getByText(/Locking an audit restricts most operations/i)).toBeVisible();
```

---

#### E2E-012: Lock Audit Operation
**Test ID**: E2E-012
**Objective**: Verify audit can be locked via UI
**Role**: CXO_TEAM
**Prerequisites**:
- Logged in as CXO_TEAM
- Unlocked audit exists

**User Actions**:
1. Login as CXO_TEAM
2. Navigate to specific audit detail page
3. Click "Lock Audit" button
4. Confirm in dialog
5. Wait for success message

**Expected Behavior**:
- Confirmation dialog appears
- After confirming, success toast: "Audit locked successfully!"
- Page refreshes
- Current state badge changes to "Locked" (orange)
- "Lock Audit" button is hidden
- "Unlock Audit" button now visible
- Lock metadata displayed (locked date/time)

**Assertions**:
```typescript
await page.click('button:has-text("Lock Audit")');
// Handle confirmation dialog if present
await page.click('button:has-text("OK")');

await expect(page.getByText(/Audit locked successfully/i)).toBeVisible();
await expect(page.getByText('Current State:').locator('..').getByText('Locked')).toBeVisible();
await expect(page.getByRole('button', {name: 'Unlock Audit'})).toBeVisible();
await expect(page.getByText(/Locked:/)).toBeVisible();
```

---

#### E2E-013: Unlock Audit Operation
**Test ID**: E2E-013
**Objective**: Verify locked audit can be unlocked
**Role**: CFO
**Prerequisites**:
- Logged in as CFO
- Locked audit exists (can use result from E2E-012)

**User Actions**:
1. Login as CFO
2. Navigate to locked audit detail page
3. Click "Unlock Audit" button
4. Wait for success message

**Expected Behavior**:
- Success toast: "Audit unlocked successfully!"
- Page refreshes
- Current state badge changes to "Open" (blue)
- "Lock Audit" and "Mark Complete" buttons visible again
- Lock metadata still visible for audit trail

**Assertions**:
```typescript
await page.click('button:has-text("Unlock Audit")');
await expect(page.getByText(/Audit unlocked successfully/i)).toBeVisible();
await expect(page.getByText('Current State:').locator('..').getByText('Open')).toBeVisible();
await expect(page.getByRole('button', {name: 'Lock Audit'})).toBeVisible();
```

---

#### E2E-014: Complete Audit Operation
**Test ID**: E2E-014
**Objective**: Verify audit can be marked complete
**Role**: CXO_TEAM
**Prerequisites**:
- Logged in as CXO_TEAM
- Unlocked audit exists

**User Actions**:
1. Login as CXO_TEAM
2. Navigate to audit detail page
3. Click "Mark Complete" button
4. Confirm in dialog
5. Wait for success message

**Expected Behavior**:
- Confirmation dialog with warning text
- Success toast: "Audit marked as complete!"
- Current state badge shows "Completed" (green)
- Audit is automatically locked (isLocked = true)
- Completion date displayed
- Only "Unlock Audit" button visible

**Assertions**:
```typescript
await page.click('button:has-text("Mark Complete")');
await page.click('button:has-text("OK")'); // Confirm dialog

await expect(page.getByText(/Audit marked as complete/i)).toBeVisible();
await expect(page.getByText('Current State:').locator('..').getByText('Completed')).toBeVisible();
await expect(page.getByText(/Completed:/)).toBeVisible();
await expect(page.getByRole('button', {name: 'Unlock Audit'})).toBeVisible();
```

---

#### E2E-015: Audit Head Assignment Section
**Test ID**: E2E-015
**Objective**: Verify audit head assignment interface
**Role**: CFO
**Prerequisites**:
- Logged in as CFO
- Audit exists without audit head assigned
- AUDIT_HEAD user exists

**User Actions**:
1. Login as CFO
2. Navigate to audit detail page
3. Scroll to "Assignments" card
4. Verify "Audit Head" section at top
5. Select audit head from dropdown
6. Click "Assign" button
7. Wait for success message

**Expected Behavior**:
- "Audit Head" section displayed prominently (above auditors)
- Warning badge: "⚠️ No audit head assigned to this audit."
- Dropdown populated with AUDIT_HEAD role users
- After assignment:
  - Success toast with audit head name
  - Audit head displayed with avatar, name, and "Audit Head" badge
  - Large prominent styling
  - "Change" button visible
- Separator line between audit head and auditors section

**Assertions**:
```typescript
await expect(page.getByText('Audit Head').first()).toBeVisible();
await expect(page.getByText('No audit head assigned')).toBeVisible();

await page.selectOption('select', {index: 1}); // Select first audit head
await page.click('button:has-text("Assign")');

await expect(page.getByText(/assigned as Audit Head/i)).toBeVisible();
await expect(page.locator('.bg-primary-600').first()).toBeVisible(); // Avatar
await expect(page.getByText('Audit Head').nth(1)).toBeVisible(); // Badge
```

---

#### E2E-016: Visibility Configuration Panel
**Test ID**: E2E-016
**Objective**: Verify audit visibility configuration interface
**Role**: CXO_TEAM
**Prerequisites**:
- Logged in as CXO_TEAM
- Audit exists

**User Actions**:
1. Login as CXO_TEAM
2. Navigate to audit detail page
3. Scroll to "Audit Visibility Configuration" card
4. Examine current visibility setting
5. Select "Last 12 Months Only" from dropdown
6. Click "Apply" button
7. Wait for success message

**Expected Behavior**:
- "Audit Visibility Configuration" card visible
- Current visibility badge displayed
- Three preset options in dropdown:
  - Show All Audits
  - Last 12 Months Only
  - Hide All Historical Audits
- Explanation text visible for each option
- After applying:
  - Success toast: "Visibility rules updated successfully!"
  - Current setting badge updates
  - Note about CFO/CXO full visibility present

**Assertions**:
```typescript
await expect(page.getByText('Audit Visibility Configuration')).toBeVisible();
await expect(page.getByText('Current Visibility Setting:')).toBeVisible();

await page.selectOption('select', {label: 'Last 12 Months Only'});
await page.click('button:has-text("Apply")');

await expect(page.getByText(/Visibility rules updated/i)).toBeVisible();
await expect(page.getByText('Last 12 Months Only')).toBeVisible();
```

---

### Category 3: Observation Management UI

#### E2E-017: Observation List - Audit Lock Status Column
**Test ID**: E2E-017
**Objective**: Verify audit lock status displayed in observations list
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Observations exist with different audit statuses

**User Actions**:
1. Login as AUDITOR
2. Navigate to /observations
3. Examine "Audit Status" column in table

**Expected Behavior**:
- "Audit Status" column present
- Observations with locked audits show: "🔒 Locked" badge (warning/orange)
- Observations with open audits show: "Open" badge (neutral)
- Lock icon visible for locked audits

**Assertions**:
```typescript
const auditStatusColumn = page.locator('table thead th:has-text("Audit Status")');
await expect(auditStatusColumn).toBeVisible();

const lockedBadges = page.locator('table tbody td').filter({hasText: 'Locked'});
await expect(lockedBadges.first()).toBeVisible();

// Verify lock icon present
await expect(page.locator('svg path[d*="M12 15v2m-6 4h12"]')).toBeVisible();
```

---

#### E2E-018: Create Observation Form Visibility - Auditor
**Test ID**: E2E-018
**Objective**: Verify AUDITOR sees observation creation form
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Audits exist

**User Actions**:
1. Login as AUDITOR
2. Navigate to /observations
3. Scroll to "Create Observation" section

**Expected Behavior**:
- "Create Observation (Admin/Auditor)" heading visible
- Form fields visible:
  - Audit selector (dropdown with audits)
  - Observation text input
- "Create Observation" button visible and enabled

**Assertions**:
```typescript
await expect(page.getByText('Create Observation (Admin/Auditor)')).toBeVisible();
await expect(page.locator('select[name="auditId"]')).toBeVisible();
await expect(page.locator('input[name="observationText"]')).toBeVisible();
await expect(page.getByRole('button', {name: /Create Observation/i})).toBeVisible();
```

---

#### E2E-019: Create Observation Form Hidden - Auditee
**Test ID**: E2E-019
**Objective**: Verify AUDITEE does NOT see observation creation form
**Role**: AUDITEE
**Prerequisites**: Logged in as AUDITEE

**User Actions**:
1. Login as AUDITEE
2. Navigate to /observations
3. Look for "Create Observation" section

**Expected Behavior**:
- "Create Observation" form is NOT visible
- Only observation filters and results table visible
- Auditee can view observations (read-only access)

**Assertions**:
```typescript
await expect(page.getByText('Create Observation (Admin/Auditor)')).not.toBeVisible();
await expect(page.locator('select[name="auditId"]')).not.toBeVisible();
await expect(page.locator('table')).toBeVisible(); // Can see list
```

---

#### E2E-020: Observation Detail - Audit Lock Banner
**Test ID**: E2E-020
**Objective**: Verify locked audit warning banner on observation page
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Observation exists with locked parent audit

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation detail page (/observations/{id})
3. Examine top of page for lock banner

**Expected Behavior**:
- Warning banner visible at top of page
- Orange/yellow background (warning color)
- Lock icon present
- Text: "Parent Audit is Locked"
- Description: "This observation's parent audit has been locked. Most operations are restricted."
- Note about CFO override: "CFO can still make changes."

**Assertions**:
```typescript
await expect(page.locator('.bg-warning-50').getByText(/Parent audit is locked/i)).toBeVisible();
await expect(page.locator('svg path[d*="M12 15v2m-6 4h12"]')).toBeVisible(); // Lock icon
await expect(page.getByText(/Most operations are restricted/i)).toBeVisible();
```

---

#### E2E-021: Observation Detail - Completed Audit Banner
**Test ID**: E2E-021
**Objective**: Verify completed audit banner on observation page
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Observation exists with completed parent audit

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation detail page
3. Examine top of page for completion banner

**Expected Behavior**:
- Success banner visible (green background)
- Checkmark icon present
- Text: "Parent Audit Completed"
- Completion date shown
- Note about CFO override

**Assertions**:
```typescript
await expect(page.locator('.bg-success-50').getByText(/Parent audit completed/i)).toBeVisible();
await expect(page.locator('svg').filter({has: page.locator('path[d*="M9 12l2 2 4-4"]')})).toBeVisible(); // Checkmark
await expect(page.getByText(/completed on/i)).toBeVisible();
```

---

#### E2E-022: Observation Section Headers - Visual Distinction
**Test ID**: E2E-022
**Objective**: Verify clear visual distinction between auditor and auditee sections
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Observation exists

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation detail page
3. Examine form sections

**Expected Behavior**:
- **Auditor Section**:
  - Header: "AUDITOR SECTION — Fields managed by auditors and audit heads"
  - Blue left border (border-l-4 border-primary-500)
  - Helper text: "Visible to all, editable by auditors and audit heads (when in draft or rejected status)"
  - Contains fields: observationText, risksInvolved, riskCategory, likelyImpact, concernedProcess, auditorPerson

- **Auditee Section**:
  - Header: "AUDITEE SECTION — Fields managed by assigned auditees"
  - Green left border (border-l-4 border-success-500)
  - Helper text: "Visible to all, editable by assigned auditees (even after approval, while audit is open)"
  - Contains fields: auditeePersonTier1, auditeePersonTier2, auditeeFeedback, auditorResponseToAuditee

**Assertions**:
```typescript
const auditorSection = page.locator('.border-primary-500').first();
await expect(auditorSection.getByText(/AUDITOR SECTION/i)).toBeVisible();
await expect(auditorSection.getByText(/editable by auditors and audit heads/i)).toBeVisible();

const auditeeSection = page.locator('.border-success-500').first();
await expect(auditeeSection.getByText(/AUDITEE SECTION/i)).toBeVisible();
await expect(auditeeSection.getByText(/editable by assigned auditees/i)).toBeVisible();
```

---

#### E2E-023: Submit Button Visibility and State - Auditor
**Test ID**: E2E-023
**Objective**: Verify Submit button behavior for auditor
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- DRAFT observation exists (unlocked audit)

**User Actions**:
1. Login as AUDITOR
2. Navigate to DRAFT observation detail page
3. Examine button area

**Expected Behavior**:
- "Submit for Approval" button visible
- Button is enabled (not disabled)
- Button has secondary styling
- On hover, no disabled tooltip

**Assertions**:
```typescript
const submitButton = page.getByRole('button', {name: /Submit for Approval/i});
await expect(submitButton).toBeVisible();
await expect(submitButton).toBeEnabled();
await expect(submitButton).not.toHaveAttribute('disabled');
```

---

#### E2E-024: Submit Button Disabled - Locked Audit
**Test ID**: E2E-024
**Objective**: Verify Submit button disabled when audit locked
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- DRAFT observation with locked parent audit

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation with locked audit
3. Hover over "Submit for Approval" button

**Expected Behavior**:
- "Submit for Approval" button visible but disabled
- Disabled attribute present
- Tooltip appears on hover: "Audit is locked - cannot submit"

**Assertions**:
```typescript
const submitButton = page.getByRole('button', {name: /Submit for Approval/i});
await expect(submitButton).toBeVisible();
await expect(submitButton).toBeDisabled();

await submitButton.hover();
await expect(page.getByText(/Audit is locked - cannot submit/i)).toBeVisible();
```

---

#### E2E-025: Approve/Reject Buttons Visibility - Audit Head
**Test ID**: E2E-025
**Objective**: Verify Audit Head sees approve/reject buttons
**Role**: AUDIT_HEAD
**Prerequisites**:
- Logged in as AUDIT_HEAD
- SUBMITTED observation exists (unlocked audit)

**User Actions**:
1. Login as AUDIT_HEAD
2. Navigate to SUBMITTED observation detail page
3. Examine button area

**Expected Behavior**:
- "Approve" button visible (primary/green styling)
- "Reject" button visible (destructive/red styling)
- Both buttons enabled
- No disabled tooltips

**Assertions**:
```typescript
await expect(page.getByRole('button', {name: 'Approve'})).toBeVisible();
await expect(page.getByRole('button', {name: 'Reject'})).toBeVisible();
await expect(page.getByRole('button', {name: 'Approve'})).toBeEnabled();
await expect(page.getByRole('button', {name: 'Reject'})).toBeEnabled();
```

---

#### E2E-026: Approve/Reject Buttons Disabled - Locked Audit
**Test ID**: E2E-026
**Objective**: Verify approve/reject buttons disabled when audit locked
**Role**: AUDIT_HEAD
**Prerequisites**:
- Logged in as AUDIT_HEAD
- SUBMITTED observation with locked audit

**User Actions**:
1. Login as AUDIT_HEAD
2. Navigate to observation detail page
3. Hover over Approve button

**Expected Behavior**:
- Approve and Reject buttons visible but disabled
- Tooltip on hover: "Audit is locked - cannot approve"

**Assertions**:
```typescript
const approveButton = page.getByRole('button', {name: 'Approve'});
await expect(approveButton).toBeDisabled();

await approveButton.hover();
await expect(page.getByText(/Audit is locked - cannot approve/i)).toBeVisible();
```

---

#### E2E-027: Approve/Reject Buttons Hidden - Auditor
**Test ID**: E2E-027
**Objective**: Verify AUDITOR does NOT see approve/reject buttons
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- SUBMITTED observation exists

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation detail page
3. Look for approve/reject buttons

**Expected Behavior**:
- "Approve" button NOT visible
- "Reject" button NOT visible
- Auditor can only view submitted observations

**Assertions**:
```typescript
await expect(page.getByRole('button', {name: 'Approve'})).not.toBeVisible();
await expect(page.getByRole('button', {name: 'Reject'})).not.toBeVisible();
```

---

#### E2E-028: Delete Button Visibility - CFO Always
**Test ID**: E2E-028
**Objective**: Verify CFO sees delete button regardless of audit status
**Role**: CFO
**Prerequisites**:
- Logged in as CFO
- Observation with locked audit exists

**User Actions**:
1. Login as CFO
2. Navigate to observation (locked audit)
3. Examine button area

**Expected Behavior**:
- "Delete Observation" button visible
- Button enabled
- Destructive/red styling

**Assertions**:
```typescript
const deleteButton = page.getByRole('button', {name: /Delete Observation/i});
await expect(deleteButton).toBeVisible();
await expect(deleteButton).toBeEnabled();
```

---

#### E2E-029: Delete Button Visibility - Audit Head on Unlocked
**Test ID**: E2E-029
**Objective**: Verify Audit Head sees delete button on unlocked audit
**Role**: AUDIT_HEAD
**Prerequisites**:
- Logged in as AUDIT_HEAD
- Observation with unlocked audit exists

**User Actions**:
1. Login as AUDIT_HEAD
2. Navigate to observation (unlocked audit)
3. Examine button area

**Expected Behavior**:
- "Delete Observation" button visible
- Button enabled

**Assertions**:
```typescript
await expect(page.getByRole('button', {name: /Delete Observation/i})).toBeVisible();
await expect(page.getByRole('button', {name: /Delete Observation/i})).toBeEnabled();
```

---

#### E2E-030: Delete Button Hidden - Audit Head on Locked
**Test ID**: E2E-030
**Objective**: Verify Audit Head does NOT see delete button on locked audit
**Role**: AUDIT_HEAD
**Prerequisites**:
- Logged in as AUDIT_HEAD
- Observation with locked audit exists

**User Actions**:
1. Login as AUDIT_HEAD
2. Navigate to observation (locked audit)
3. Look for delete button

**Expected Behavior**:
- "Delete Observation" button NOT visible
- Explanation text visible: "Cannot delete - audit is locked"

**Assertions**:
```typescript
await expect(page.getByRole('button', {name: /Delete Observation/i})).not.toBeVisible();
await expect(page.getByText(/Cannot delete - audit is locked/i)).toBeVisible();
```

---

#### E2E-031: Delete Observation Workflow
**Test ID**: E2E-031
**Objective**: Verify observation deletion works correctly
**Role**: CFO
**Prerequisites**:
- Logged in as CFO
- Observation exists with known ID

**User Actions**:
1. Login as CFO
2. Navigate to observation detail page
3. Click "Delete Observation" button
4. Confirm in confirmation dialog
5. Wait for redirect

**Expected Behavior**:
- Confirmation dialog appears: "Are you sure you want to delete this observation? This action cannot be undone."
- After confirming:
  - Success toast: "Observation deleted successfully!"
  - Redirected to /observations page
  - Deleted observation no longer in list

**Assertions**:
```typescript
await page.click('button:has-text("Delete Observation")');
await page.click('button:has-text("OK")'); // Confirm

await expect(page.getByText(/Observation deleted successfully/i)).toBeVisible();
await expect(page).toHaveURL(/\/observations$/);

// Verify observation not in list
await expect(page.getByText(observationText)).not.toBeVisible();
```

---

### Category 4: Assignment Management UI

#### E2E-032: Assigned Auditees Section Display
**Test ID**: E2E-032
**Objective**: Verify assigned auditees section displays correctly
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Observation with 2 assigned auditees exists

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation detail page
3. Scroll to "Assigned Auditees" card

**Expected Behavior**:
- "Assigned Auditees" heading visible
- Two auditee rows displayed, each showing:
  - Avatar circle with initial (green background)
  - Auditee name or email
  - "Assigned on {date}" text
  - "Remove" button (for auditor)
- Green/success styling for assignment cards

**Assertions**:
```typescript
await expect(page.getByText('Assigned Auditees').first()).toBeVisible();

const auditeeCards = page.locator('.bg-green-50');
await expect(auditeeCards).toHaveCount(2);

await expect(auditeeCards.first().locator('.bg-green-600')).toBeVisible(); // Avatar
await expect(auditeeCards.first().getByText(/Assigned on/i)).toBeVisible();
await expect(auditeeCards.first().getByRole('button', {name: 'Remove'})).toBeVisible();
```

---

#### E2E-033: Assign Auditee Interface - Auditor
**Test ID**: E2E-033
**Objective**: Verify auditor can see and use auditee assignment interface
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Observation exists
- AUDITEE users exist

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation detail page
3. Scroll to "Assigned Auditees" card
4. Examine assignment interface

**Expected Behavior**:
- "Assign Auditee" section visible (below assigned list)
- Dropdown populated with AUDITEE role users
- "Assign" button visible and enabled
- Dropdown shows email or name of each auditee

**Assertions**:
```typescript
await expect(page.getByText('Assign Auditee')).toBeVisible();
await expect(page.locator('select').last()).toBeVisible();
await expect(page.getByRole('button', {name: 'Assign'})).toBeVisible();

// Verify dropdown has options
const options = await page.locator('select option').count();
expect(options).toBeGreaterThan(1); // At least one auditee + placeholder
```

---

#### E2E-034: Assign Auditee Workflow
**Test ID**: E2E-034
**Objective**: Verify auditee assignment workflow
**Role**: AUDIT_HEAD
**Prerequisites**:
- Logged in as AUDIT_HEAD
- Observation exists
- Unassigned AUDITEE user exists

**User Actions**:
1. Login as AUDIT_HEAD
2. Navigate to observation detail page
3. Scroll to "Assigned Auditees" card
4. Select auditee from dropdown
5. Click "Assign" button
6. Wait for success message

**Expected Behavior**:
- After clicking Assign:
  - Success toast: "Auditee {name/email} assigned successfully!"
  - Page refreshes
  - New auditee appears in assigned list
  - Dropdown selection cleared
  - Assignment date is today

**Assertions**:
```typescript
await page.selectOption('select', {index: 1});
await page.click('button:has-text("Assign")');

await expect(page.getByText(/Auditee .* assigned successfully/i)).toBeVisible();
await page.waitForTimeout(1000); // Wait for page refresh

const newCard = page.locator('.bg-green-50').last();
await expect(newCard).toBeVisible();
await expect(newCard.getByText(/Assigned on/i)).toBeVisible();
```

---

#### E2E-035: Remove Auditee Assignment
**Test ID**: E2E-035
**Objective**: Verify removing auditee assignment
**Role**: AUDITOR
**Prerequisites**:
- Logged in as AUDITOR
- Observation with assigned auditee exists

**User Actions**:
1. Login as AUDITOR
2. Navigate to observation detail page
3. Click "Remove" button on assigned auditee
4. Confirm in dialog
5. Wait for success message

**Expected Behavior**:
- Confirmation dialog: "Remove this auditee from the observation?"
- After confirming:
  - Success toast: "Auditee removed successfully!"
  - Auditee removed from assigned list
  - Auditee loses edit access

**Assertions**:
```typescript
const initialCount = await page.locator('.bg-green-50').count();

await page.click('button:has-text("Remove")');
await page.click('button:has-text("OK")'); // Confirm

await expect(page.getByText(/Auditee removed successfully/i)).toBeVisible();

const newCount = await page.locator('.bg-green-50').count();
expect(newCount).toBe(initialCount - 1);
```

---

#### E2E-036: Auditee View - Not Assigned Banner
**Test ID**: E2E-036
**Objective**: Verify auditee sees warning when not assigned
**Role**: AUDITEE
**Prerequisites**:
- Logged in as AUDITEE
- Observation exists where auditee is NOT assigned

**User Actions**:
1. Login as AUDITEE
2. Navigate to observation detail page
3. Examine top of form

**Expected Behavior**:
- Warning banner visible (yellow/orange background)
- Warning icon present
- Heading: "You are not assigned to this observation"
- Message: "You cannot edit any fields until you are assigned by an auditor or audit head."
- All form fields are disabled/read-only

**Assertions**:
```typescript
await expect(page.locator('.bg-warning-50').getByText(/You are not assigned/i)).toBeVisible();
await expect(page.getByText(/cannot edit any fields/i)).toBeVisible();

// Verify fields are disabled
const inputs = page.locator('input, textarea, select');
for (let i = 0; i < await inputs.count(); i++) {
  await expect(inputs.nth(i)).toBeDisabled();
}
```

---

#### E2E-037: Auditee View - Assigned Banner
**Test ID**: E2E-037
**Objective**: Verify auditee sees success banner when assigned (unlocked audit)
**Role**: AUDITEE
**Prerequisites**:
- Logged in as AUDITEE
- Observation where auditee IS assigned
- Parent audit is unlocked

**User Actions**:
1. Login as AUDITEE
2. Navigate to observation detail page
3. Examine top of form

**Expected Behavior**:
- Success banner visible (green background)
- Checkmark icon present
- Heading: "You can edit auditee fields"
- Message: "Fields in the 'Auditee Section' below are editable. Other fields are read-only."
- Auditee section fields are enabled
- Auditor section fields are disabled

**Assertions**:
```typescript
await expect(page.locator('.bg-success-50').getByText(/You can edit auditee fields/i)).toBeVisible();
await expect(page.getByText(/Auditee Section.*are editable/i)).toBeVisible();

// Verify auditee fields enabled
await expect(page.locator('input[name="auditeePersonTier1"]')).toBeEnabled();
await expect(page.locator('textarea[name="auditeeFeedback"]')).toBeEnabled();

// Verify auditor fields disabled
await expect(page.locator('textarea[name="observationText"]')).toBeDisabled();
```

---

#### E2E-038: Auditee Edit Workflow - Assigned User
**Test ID**: E2E-038
**Objective**: Verify assigned auditee can edit designated fields
**Role**: AUDITEE
**Prerequisites**:
- Logged in as AUDITEE
- Observation where auditee is assigned
- Unlocked audit

**User Actions**:
1. Login as AUDITEE
2. Navigate to observation detail page
3. Edit auditee fields:
   - Enter "Jane Smith" in auditeePersonTier1
   - Enter "Corrective actions implemented" in auditeeFeedback
   - Set targetDate to next month
4. Click "Save Changes" button
5. Wait for success message

**Expected Behavior**:
- Fields are editable
- Save succeeds
- Success toast: "Observation saved successfully!"
- Page refreshes with updated values
- Audit trail event created

**Assertions**:
```typescript
await page.fill('input[name="auditeePersonTier1"]', 'Jane Smith');
await page.fill('textarea[name="auditeeFeedback"]', 'Corrective actions implemented');
await page.fill('input[name="targetDate"]', '2025-03-01');

await page.click('button:has-text("Save Changes")');

await expect(page.getByText(/Observation saved successfully/i)).toBeVisible();
await expect(page.locator('input[name="auditeePersonTier1"]')).toHaveValue('Jane Smith');
```

---

### Category 5: Workflow Testing

#### E2E-039: Complete Observation Approval Workflow
**Test ID**: E2E-039
**Objective**: Test complete workflow from draft to approved
**Roles**: AUDITOR → AUDIT_HEAD
**Prerequisites**:
- AUDITOR and AUDIT_HEAD users exist
- Unlocked audit exists

**User Actions**:
1. **As AUDITOR**:
   - Login as auditor@example.com
   - Create new observation
   - Edit observation fields
   - Click "Submit for Approval"
   - Logout

2. **As AUDIT_HEAD**:
   - Login as audithead@example.com
   - Navigate to submitted observation
   - Click "Approve" button
   - Verify approval status

**Expected Behavior**:
- Observation created with DRAFT status
- After submit: status changes to SUBMITTED
- Auditor can no longer edit directly
- Audit head sees Approve/Reject buttons
- After approval: status changes to APPROVED
- Approval appears in approvals card with audit head as actor

**Assertions**:
```typescript
// Step 1: Create and submit
await loginAs('auditor@example.com', 'auditor123');
// ... create observation ...
await expect(page.getByText('DRAFT')).toBeVisible();
await page.click('button:has-text("Submit for Approval")');
await expect(page.getByText('SUBMITTED')).toBeVisible();

// Step 2: Approve
await loginAs('audithead@example.com', 'audithead123');
// ... navigate to observation ...
await page.click('button:has-text("Approve")');
await expect(page.getByText('APPROVED')).toBeVisible();
await expect(page.locator('.approval-card').getByText('APPROVED')).toBeVisible();
```

---

#### E2E-040: Rejection and Resubmission Workflow
**Test ID**: E2E-040
**Objective**: Test rejection workflow and auditor resubmission
**Roles**: AUDITOR → AUDIT_HEAD → AUDITOR
**Prerequisites**: SUBMITTED observation exists

**User Actions**:
1. **As AUDIT_HEAD**:
   - Login as audit head
   - Navigate to SUBMITTED observation
   - Click "Reject" button
   - Enter comment: "Please add more detail to risk assessment"
   - Logout

2. **As AUDITOR**:
   - Login as auditor
   - Navigate to rejected observation
   - Edit observation (add more detail)
   - Click "Submit for Approval" again

**Expected Behavior**:
- After rejection: status changes to REJECTED
- Rejection comment visible in approvals card
- Auditor can edit rejected observation
- Auditor can resubmit
- After resubmit: status changes to SUBMITTED again

**Assertions**:
```typescript
// Reject
await loginAs('audithead@example.com', 'audithead123');
await page.click('button:has-text("Reject")');
await expect(page.getByText('REJECTED')).toBeVisible();
await expect(page.getByText('Please add more detail')).toBeVisible();

// Resubmit
await loginAs('auditor@example.com', 'auditor123');
await page.fill('textarea[name="risksInvolved"]', 'Additional risk details...');
await page.click('button:has-text("Save Changes")');
await page.click('button:has-text("Submit for Approval")');
await expect(page.getByText('SUBMITTED')).toBeVisible();
```

---

#### E2E-041: Lock Audit Blocks Submissions
**Test ID**: E2E-041
**Objective**: Verify locking audit prevents submissions
**Roles**: CXO_TEAM → AUDITOR
**Prerequisites**:
- Unlocked audit with DRAFT observation
- CXO_TEAM user has access

**User Actions**:
1. **As CXO_TEAM**:
   - Login as CXO
   - Navigate to audit detail page
   - Click "Lock Audit"
   - Confirm
   - Logout

2. **As AUDITOR**:
   - Login as auditor
   - Navigate to draft observation in locked audit
   - Try to click "Submit for Approval"

**Expected Behavior**:
- Audit locks successfully
- Observation page shows lock banner
- "Submit for Approval" button is disabled
- Tooltip shows: "Audit is locked - cannot submit"
- Cannot submit observation

**Assertions**:
```typescript
// Lock audit
await loginAs('cxo@example.com', 'cxo123');
await page.click('button:has-text("Lock Audit")');
await page.click('button:has-text("OK")');

// Verify blocked
await loginAs('auditor@example.com', 'auditor123');
await expect(page.locator('.bg-warning-50').getByText(/Parent audit is locked/i)).toBeVisible();
const submitBtn = page.getByRole('button', {name: /Submit for Approval/i});
await expect(submitBtn).toBeDisabled();
```

---

#### E2E-042: CFO Override on Locked Audit
**Test ID**: E2E-042
**Objective**: Verify CFO can edit observations in locked audit
**Role**: CFO
**Prerequisites**:
- Locked audit with observation

**User Actions**:
1. Login as CFO
2. Navigate to observation in locked audit
3. Edit observation fields
4. Click "Save Changes"
5. Click "Submit for Approval" (if draft)

**Expected Behavior**:
- Lock banner shows "CFO can still make changes"
- All form fields are enabled (not disabled by lock)
- Save succeeds
- Submit succeeds (if applicable)
- CFO short-circuit bypasses lock restrictions

**Assertions**:
```typescript
await loginAs('cfo@example.com', 'cfo123');
await expect(page.getByText(/CFO can still make changes/i)).toBeVisible();

await page.fill('textarea[name="observationText"]', 'CFO override edit');
await page.click('button:has-text("Save Changes")');
await expect(page.getByText(/saved successfully/i)).toBeVisible();

// Verify fields are not disabled
await expect(page.locator('textarea[name="observationText"]')).toBeEnabled();
```

---

#### E2E-043: Unlock Re-enables Operations
**Test ID**: E2E-043
**Objective**: Verify unlocking audit re-enables operations
**Roles**: CFO → AUDITOR
**Prerequisites**:
- Locked audit with DRAFT observation

**User Actions**:
1. **As CFO**:
   - Login as CFO
   - Navigate to locked audit
   - Click "Unlock Audit"
   - Logout

2. **As AUDITOR**:
   - Login as auditor
   - Navigate to draft observation
   - Verify can submit

**Expected Behavior**:
- After unlock: audit status shows "Open"
- Lock banner disappears from observation page
- "Submit for Approval" button is enabled
- Auditor can successfully submit observation

**Assertions**:
```typescript
// Unlock
await loginAs('cfo@example.com', 'cfo123');
await page.click('button:has-text("Unlock Audit")');
await expect(page.getByText('Open')).toBeVisible();

// Verify enabled
await loginAs('auditor@example.com', 'auditor123');
await expect(page.locator('.bg-warning-50').getByText(/locked/i)).not.toBeVisible();
await expect(page.getByRole('button', {name: /Submit for Approval/i})).toBeEnabled();
```

---

#### E2E-044: Change Request Workflow
**Test ID**: E2E-044
**Objective**: Test change request workflow for approved observations
**Roles**: AUDITOR → CFO
**Prerequisites**:
- APPROVED observation exists

**User Actions**:
1. **As AUDITOR**:
   - Login as auditor
   - Navigate to APPROVED observation
   - Edit auditor fields (changes blocked)
   - Click "Request Change (Auditor)" button
   - Enter comment: "Need to update risk category"
   - Confirm
   - Logout

2. **As CFO**:
   - Login as CFO
   - Navigate to same observation
   - Scroll to "Change Requests" card
   - Verify pending request visible
   - Click "Approve & Apply" button
   - Verify changes applied

**Expected Behavior**:
- Auditor cannot directly save approved observation
- Change request created with PENDING status
- CFO sees change request with patch preview
- After CFO approval:
  - Change request status = APPROVED
  - Patch applied to observation
  - Observation updated with new values

**Assertions**:
```typescript
// Create request
await loginAs('auditor@example.com', 'auditor123');
await page.click('button:has-text("Request Change")');
// ... handle request creation ...
await expect(page.getByText(/Change request submitted/i)).toBeVisible();

// Approve request
await loginAs('cfo@example.com', 'cfo123');
await expect(page.getByText('Change Requests')).toBeVisible();
await expect(page.getByText('PENDING')).toBeVisible();
await page.click('button:has-text("Approve & Apply")');
await expect(page.getByText(/approved and applied/i)).toBeVisible();
await expect(page.getByText('APPROVED')).toBeVisible();
```

---

#### E2E-045: Auditee Assignment Field Access
**Test ID**: E2E-045
**Objective**: Test complete auditee assignment and field access workflow
**Roles**: AUDITOR → AUDITEE
**Prerequisites**:
- Observation exists (unlocked audit)
- AUDITEE user exists

**User Actions**:
1. **As AUDITOR**:
   - Login as auditor
   - Navigate to observation
   - Assign auditee
   - Logout

2. **As AUDITEE** (before assignment check):
   - Login as auditee
   - Navigate to same observation
   - Verify "not assigned" banner
   - Verify fields disabled
   - Logout

3. **Complete assignment** (as AUDITOR)

4. **As AUDITEE** (after assignment):
   - Login again
   - Navigate to observation
   - Verify "can edit" banner
   - Edit auditee fields
   - Try to edit auditor fields (blocked)
   - Save changes

**Expected Behavior**:
- Before assignment: all fields disabled, warning banner
- After assignment: auditee fields enabled, success banner
- Auditor fields remain disabled for auditee
- Save succeeds for auditee fields only

**Assertions**:
```typescript
// Before assignment
await loginAs('auditee@example.com', 'auditee123');
await expect(page.getByText(/You are not assigned/i)).toBeVisible();
await expect(page.locator('input[name="auditeeFeedback"]')).toBeDisabled();

// After assignment
await loginAs('auditor@example.com', 'auditor123');
// ... assign auditee ...
await loginAs('auditee@example.com', 'auditee123');
await expect(page.getByText(/You can edit auditee fields/i)).toBeVisible();
await expect(page.locator('textarea[name="auditeeFeedback"]')).toBeEnabled();
await expect(page.locator('textarea[name="observationText"]')).toBeDisabled();
```

---

#### E2E-046: Audit Head Assignment Affects Permissions
**Test ID**: E2E-046
**Objective**: Verify audit head assignment grants approval permissions
**Roles**: CXO_TEAM → AUDIT_HEAD
**Prerequisites**:
- Audit without audit head
- SUBMITTED observation in that audit
- AUDIT_HEAD user exists

**User Actions**:
1. **As AUDIT_HEAD** (before assignment):
   - Login as audit head
   - Try to access audit detail page
   - Try to access observation
   - Verify cannot approve (403 or hidden buttons)
   - Logout

2. **As CXO_TEAM**:
   - Login as CXO
   - Navigate to audit detail
   - Assign audit head
   - Logout

3. **As AUDIT_HEAD** (after assignment):
   - Login again
   - Navigate to observation in assigned audit
   - Verify Approve/Reject buttons visible
   - Can approve observation

**Expected Behavior**:
- Before assignment: audit head may not see audit (depending on visibility rules)
- After assignment: audit head can approve observations in that audit
- Approve/Reject buttons become visible and functional

**Assertions**:
```typescript
// After assignment
await loginAs('cxo@example.com', 'cxo123');
// ... assign audit head ...

await loginAs('audithead@example.com', 'audithead123');
// ... navigate to observation ...
await expect(page.getByRole('button', {name: 'Approve'})).toBeVisible();
await expect(page.getByRole('button', {name: 'Reject'})).toBeVisible();
```

---

#### E2E-047: Complete Audit Locks Operations
**Test ID**: E2E-047
**Objective**: Verify completing audit locks it and restricts operations
**Roles**: CXO_TEAM → AUDITOR
**Prerequisites**:
- Unlocked audit with DRAFT observation

**User Actions**:
1. **As CXO_TEAM**:
   - Login as CXO
   - Navigate to audit detail
   - Click "Mark Complete"
   - Confirm
   - Verify status changes to "Completed"
   - Verify audit is also locked
   - Logout

2. **As AUDITOR**:
   - Login as auditor
   - Navigate to observation in completed audit
   - Verify completion banner visible
   - Verify submit button disabled

**Expected Behavior**:
- Completing audit sets completedAt and isLocked=true
- Completion badge visible
- Operations blocked for auditor (same as locked audit)
- CFO can still override

**Assertions**:
```typescript
// Complete audit
await loginAs('cxo@example.com', 'cxo123');
await page.click('button:has-text("Mark Complete")');
await expect(page.getByText('Completed')).toBeVisible();
await expect(page.getByText(/Completed:/)).toBeVisible();

// Verify blocked for auditor
await loginAs('auditor@example.com', 'auditor123');
await expect(page.getByText(/Parent audit completed/i)).toBeVisible();
await expect(page.getByRole('button', {name: /Submit for Approval/i})).toBeDisabled();
```

---

#### E2E-048: Real-time Updates via WebSocket
**Test ID**: E2E-048
**Objective**: Verify real-time updates work across sessions
**Roles**: Two AUDITOR sessions
**Prerequisites**:
- WebSocket server running on port 3001
- Observation exists

**User Actions**:
1. Open two browser contexts:
   - Context A: Login as auditor
   - Context B: Login as same auditor (or different auditor)
2. Both contexts navigate to same observation detail page
3. In Context A:
   - Edit observation field
   - Click "Save Changes"
4. In Context B:
   - Wait for real-time update
   - Verify field updates without refresh

**Expected Behavior**:
- Both contexts show presence badges (WebSocket connected)
- After save in Context A:
  - Context B receives WebSocket update
  - Page content refreshes automatically
  - Updated value appears in Context B without manual refresh

**Assertions**:
```typescript
// Context A
const pageA = await browserA.newPage();
await loginAs(pageA, 'auditor@example.com', 'auditor123');
await pageA.goto(`/observations/${observationId}`);

// Context B
const pageB = await browserB.newPage();
await loginAs(pageB, 'auditor@example.com', 'auditor123');
await pageB.goto(`/observations/${observationId}`);

// Verify presence
await expect(pageA.locator('[data-testid="presence-badge"]')).toBeVisible();
await expect(pageB.locator('[data-testid="presence-badge"]')).toBeVisible();

// Edit in A
await pageA.fill('textarea[name="observationText"]', 'Updated by Context A');
await pageA.click('button:has-text("Save Changes")');

// Wait for update in B
await pageB.waitForTimeout(2000); // Allow WebSocket propagation
await expect(pageB.locator('textarea[name="observationText"]')).toHaveValue('Updated by Context A');
```

---

## Playwright Test Helper Functions

### Login Helper
```typescript
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^((?!\/login).)*$/); // Wait for redirect away from login
}
```

### Logout Helper
```typescript
async function logout(page: Page) {
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('/login');
}
```

### Create Test Observation Helper
```typescript
async function createObservation(page: Page, auditId: string, text: string) {
  await page.goto('/observations');
  await page.selectOption('select[name="auditId"]', auditId);
  await page.fill('input[name="observationText"]', text);
  await page.click('button:has-text("Create Observation")');
  await page.waitForSelector('text=/Observation created successfully/i');
}
```

---

## Test Execution Commands

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/navigation.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Debug mode (step through tests)
npx playwright test --debug

# Generate test report
npx playwright show-report
```

---

## Test Data Management

### Before Running Tests
```bash
# Ensure fresh database state
npm run db:reset
npm run db:seed

# Start both servers
npm run dev & npm run ws:dev
```

### After Running Tests
- Review screenshots in `test-results/` for failed tests
- Check videos in `test-results/` for visual debugging
- Clean up any test data that wasn't automatically removed

---

## Known Limitations

1. **WebSocket Tests**: E2E-048 requires both contexts to maintain active WebSocket connections
2. **Timing Issues**: Some tests may need `waitForTimeout()` to account for API/database operations
3. **Browser State**: Tests should run in isolation to avoid state pollution
4. **Dynamic IDs**: Use data-testid attributes for more stable selectors where needed

---

## Success Criteria

All 48 test cases pass with:
- ✅ Correct UI element visibility by role
- ✅ Proper button states (enabled/disabled)
- ✅ Accurate tooltips and error messages
- ✅ Successful workflow completion
- ✅ Real-time updates via WebSocket
- ✅ Consistent behavior across browsers

---

## Next Steps

1. Implement these test cases using Playwright Test framework
2. Add custom fixtures for common workflows
3. Create Page Object Models for reusable components
4. Integrate tests into CI/CD pipeline
5. Add visual regression testing for UI changes
