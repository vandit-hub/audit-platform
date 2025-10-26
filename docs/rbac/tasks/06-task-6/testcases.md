# RBAC Task 6: Playwright Browser Test Cases

**Document Version**: 1.0
**Last Updated**: 2025-10-25
**Test Framework**: Playwright Browser Automation
**Target**: RBAC v2 UI Validation & End-to-End Workflows

---

## Overview

This document contains comprehensive Playwright browser test cases for validating the RBAC v2 UI implementation and end-to-end user workflows. These tests focus on UI visibility, user interactions, navigation, real-time updates, and complete audit workflows.

**Total Test Cases**: 89
**Coverage Areas**: Navigation, UI visibility, user workflows, real-time features, integration scenarios

**Test Execution Strategy**:
- Browser-based UI testing with Playwright
- UI-based login (NextAuth v5 requirement)
- Page object pattern for maintainability
- Visual verification and element presence checks
- Real-time WebSocket feature validation
- Complete user journey testing

---

## Test Environment Setup

### Prerequisites
- PostgreSQL container `audit-postgres` running on port 5432
- Database seeded with default users (`npm run db:seed`)
- Next.js server running on port 3005
- WebSocket server running on port 3001
- Playwright installed (`npm install @playwright/test`)

### Browser Configuration
```typescript
// playwright.config.ts
browsers: ['chromium', 'firefox', 'webkit']
baseURL: 'http://localhost:3005'
```

### Authentication Helper Pattern
```typescript
// All tests use UI-based login
async function loginAs(page: Page, role: 'CFO' | 'CXO_TEAM' | 'AUDIT_HEAD' | 'AUDITOR' | 'AUDITEE') {
  const credentials = {
    CFO: { email: 'cfo@example.com', password: 'cfo123' },
    CXO_TEAM: { email: 'cxo@example.com', password: 'cxo123' },
    AUDIT_HEAD: { email: 'audithead@example.com', password: 'audithead123' },
    AUDITOR: { email: 'auditor@example.com', password: 'auditor123' },
    AUDITEE: { email: 'auditee@example.com', password: 'auditee123' }
  };

  await page.goto('/login');
  await page.fill('input[name="email"]', credentials[role].email);
  await page.fill('input[name="password"]', credentials[role].password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^((?!\/login).)*$/); // Wait for redirect away from login
}
```

---

## Module 1: Navigation & UI Access Control

### E2E-001: CFO Navigation Menu
**Objective**: Verify CFO sees all navigation items
**Prerequisites**: None
**User Actions**:
1. Open browser and navigate to `/login`
2. Enter CFO credentials (cfo@example.com / cfo123)
3. Click "Login" button
4. Wait for redirect to dashboard
**Assertions**:
- URL redirects to `/dashboard` or `/audits`
- Navigation bar visible
- "Plants" link present in navigation
- "Audits" link present in navigation
- "Observations" link present in navigation
- "Reports" link present in navigation
- "Users" or "Admin" link present in navigation
- User role badge displays "CFO"
**Expected Behavior**: All navigation items visible, full menu access

### E2E-002: CXO_TEAM Navigation Menu
**Objective**: Verify CXO_TEAM sees management navigation items
**Prerequisites**: None
**User Actions**:
1. Login as CXO_TEAM (cxo@example.com / cxo123)
2. Observe navigation menu
**Assertions**:
- "Plants" link visible
- "Audits" link visible
- "Observations" link visible
- "Reports" link visible
- "Users" link visible
- User role badge displays "CXO_TEAM"
**Expected Behavior**: Management-level navigation visible

### E2E-003: AUDIT_HEAD Navigation Menu
**Objective**: Verify AUDIT_HEAD sees limited navigation
**Prerequisites**: None
**User Actions**:
1. Login as AUDIT_HEAD (audithead@example.com / audithead123)
2. Observe navigation menu
**Assertions**:
- "Audits" link visible
- "Observations" link visible
- "Reports" link visible
- "Plants" link NOT visible
- "Users" link NOT visible
- User role badge displays "AUDIT_HEAD"
**Expected Behavior**: Limited navigation, no plant/user management

### E2E-004: AUDITOR Navigation Menu
**Objective**: Verify AUDITOR sees basic navigation
**Prerequisites**: None
**User Actions**:
1. Login as AUDITOR (auditor@example.com / auditor123)
2. Observe navigation menu
**Assertions**:
- "Audits" link visible
- "Observations" link visible
- "Reports" link NOT visible
- "Plants" link NOT visible
- "Users" link NOT visible
- User role badge displays "AUDITOR"
**Expected Behavior**: Basic navigation for audit work

### E2E-005: AUDITEE Navigation Menu
**Objective**: Verify AUDITEE sees minimal navigation
**Prerequisites**: None
**User Actions**:
1. Login as AUDITEE (auditee@example.com / auditee123)
2. Observe navigation menu
**Assertions**:
- "Observations" link visible
- "Audits" link NOT visible
- "Plants" link NOT visible
- "Reports" link NOT visible
- "Users" link NOT visible
- User role badge displays "AUDITEE"
**Expected Behavior**: Only observations accessible

### E2E-006: Unauthorized Page Access - AUDITOR to Plants
**Objective**: Verify direct URL access to unauthorized pages redirects or shows 403
**Prerequisites**: None
**User Actions**:
1. Login as AUDITOR
2. Navigate directly to `/plants` via URL bar
3. Observe page response
**Assertions**:
- Page redirects to `/dashboard` or `/403`
- OR page shows "Access Denied" / "Forbidden" message
- Plants list NOT visible
**Expected Behavior**: Unauthorized access blocked

### E2E-007: Unauthorized Page Access - AUDITEE to Audits
**Objective**: Verify AUDITEE cannot access audit list page
**Prerequisites**: None
**User Actions**:
1. Login as AUDITEE
2. Navigate directly to `/audits`
3. Observe page response
**Assertions**:
- Access denied or redirect to observations
- Audit list NOT visible
**Expected Behavior**: Access blocked for AUDITEE

### E2E-008: Session Timeout Redirect
**Objective**: Verify idle timeout redirects to login
**Prerequisites**: None
**User Actions**:
1. Login as AUDITOR
2. Wait for idle timeout duration (15 minutes default)
3. Attempt to navigate to any page
**Assertions**:
- Redirected to `/login`
- Session expired message displayed (optional)
**Expected Behavior**: Idle timeout enforced

---

## Module 2: User Management UI

### E2E-009: CFO Can Access User Management
**Objective**: Verify CFO can view user management page
**Prerequisites**: Logged in as CFO
**User Actions**:
1. Click "Users" or "Admin" navigation link
2. Wait for page load
**Assertions**:
- URL is `/admin/users` or similar
- User list table visible
- "Create User" button visible
- List shows all users
**Expected Behavior**: User management page accessible

### E2E-010: CFO Can Create User via UI
**Objective**: Verify user creation form works for CFO
**Prerequisites**: Logged in as CFO, on user management page
**User Actions**:
1. Click "Create User" button
2. Fill form:
   - Email: test-ui-user@example.com
   - Name: Test UI User
   - Password: testpass123
   - Role: AUDITOR
3. Click "Submit" or "Create" button
4. Wait for success notification
**Assertions**:
- Success toast/notification appears
- New user appears in user list
- User row shows correct role badge
**Expected Behavior**: User created successfully with UI feedback

### E2E-011: CXO_TEAM Can Create User
**Objective**: Verify CXO_TEAM has user management access
**Prerequisites**: Logged in as CXO_TEAM
**User Actions**: Same as E2E-010
**Assertions**: Same as E2E-010
**Expected Behavior**: User creation successful

### E2E-012: AUDIT_HEAD Cannot Access User Management
**Objective**: Verify AUDIT_HEAD doesn't see user management
**Prerequisites**: Logged in as AUDIT_HEAD
**User Actions**:
1. Observe navigation menu
2. Attempt to navigate to `/admin/users` directly
**Assertions**:
- "Users" link NOT in navigation
- Direct URL access results in 403 or redirect
**Expected Behavior**: Access denied

### E2E-013: CFO Can Disable User
**Objective**: Verify CFO can disable user via UI
**Prerequisites**: Logged in as CFO, on user management page, active user exists
**User Actions**:
1. Find user row in table
2. Click "Disable" or "Deactivate" button/toggle
3. Confirm action in modal (if present)
4. Wait for update
**Assertions**:
- User row shows "Inactive" status badge
- Success notification appears
**Expected Behavior**: User disabled successfully

---

## Module 3: Plant Management UI

### E2E-014: CFO Can View Plants Page
**Objective**: Verify CFO can access plant management
**Prerequisites**: Logged in as CFO
**User Actions**:
1. Click "Plants" navigation link
2. Wait for page load
**Assertions**:
- URL is `/plants`
- Plant list/table visible
- "Create Plant" button visible
**Expected Behavior**: Plants page accessible

### E2E-015: CFO Can Create Plant
**Objective**: Verify plant creation via UI
**Prerequisites**: Logged in as CFO, on plants page
**User Actions**:
1. Click "Create Plant" button
2. Fill form:
   - Code: PLT-UI-001
   - Name: UI Test Plant
3. Click "Submit" button
4. Wait for success notification
**Assertions**:
- Success notification appears
- New plant appears in plant list
- Plant shows correct code and name
**Expected Behavior**: Plant created with UI feedback

### E2E-016: CXO_TEAM Can Edit Plant
**Objective**: Verify CXO_TEAM can edit plant details
**Prerequisites**: Logged in as CXO_TEAM, plant exists
**User Actions**:
1. Navigate to `/plants`
2. Click "Edit" button on plant row
3. Update name field to "Updated Plant Name"
4. Click "Save" button
5. Wait for update
**Assertions**:
- Success notification appears
- Plant list shows updated name
**Expected Behavior**: Plant updated successfully

### E2E-017: AUDITOR Can View But Not Edit Plants
**Objective**: Verify AUDITOR has read-only plant access
**Prerequisites**: Logged in as AUDITOR, plants exist
**User Actions**:
1. Navigate to `/plants` (if accessible via navigation or direct URL)
2. Observe plant list
3. Look for action buttons
**Assertions**:
- Plants visible in list
- "Create Plant" button NOT visible
- "Edit" buttons NOT visible or disabled
- "Delete" buttons NOT visible
**Expected Behavior**: Read-only access for AUDITOR

### E2E-018: AUDITEE Cannot Access Plants
**Objective**: Verify AUDITEE blocked from plants page
**Prerequisites**: Logged in as AUDITEE
**User Actions**:
1. Attempt to navigate to `/plants`
**Assertions**:
- Access denied or redirect
- Plant list NOT visible
**Expected Behavior**: Complete access denial

---

## Module 4: Audit Management UI

### E2E-019: CXO_TEAM Can Create Audit
**Objective**: Verify audit creation workflow
**Prerequisites**: Logged in as CXO_TEAM, plant exists
**User Actions**:
1. Navigate to `/audits`
2. Click "Create Audit" button
3. Fill form:
   - Plant: Select from dropdown
   - Title: UI Test Audit
   - Purpose: Testing audit creation
   - Visit Start Date: 2025-11-01
   - Visit End Date: 2025-11-05
4. Click "Create" button
5. Wait for success
**Assertions**:
- Success notification appears
- Redirected to audit detail page or audit list
- New audit visible with status "PLANNED"
**Expected Behavior**: Audit created successfully

### E2E-020: CFO Can Assign Audit Head
**Objective**: Verify CFO can assign audit head via UI
**Prerequisites**: Logged in as CFO, audit exists, AUDIT_HEAD user exists
**User Actions**:
1. Navigate to audit detail page
2. Click "Edit" or find "Audit Head" field
3. Select AUDIT_HEAD user from dropdown
4. Click "Save" button
5. Wait for update
**Assertions**:
- Success notification appears
- Audit detail shows assigned audit head name
**Expected Behavior**: Audit head assignment successful

### E2E-021: CXO_TEAM Can Assign Auditors
**Objective**: Verify auditor assignment workflow
**Prerequisites**: Logged in as CXO_TEAM, audit exists, AUDITOR users exist
**User Actions**:
1. Navigate to audit detail page
2. Find "Assign Auditors" section or button
3. Click "Add Auditor" button
4. Select AUDITOR from dropdown/modal
5. Click "Assign" button
6. Wait for update
**Assertions**:
- Success notification appears
- Assigned auditor appears in "Assigned Auditors" list
- Auditor badge/chip visible
**Expected Behavior**: Auditor assigned successfully

### E2E-022: AUDIT_HEAD Sees Only Assigned Audits
**Objective**: Verify audit list filtering for AUDIT_HEAD
**Prerequisites**:
- Audit A assigned to AUDIT_HEAD (auditHeadId = user.id)
- Audit B not assigned to AUDIT_HEAD
- Logged in as AUDIT_HEAD
**User Actions**:
1. Navigate to `/audits`
2. Observe audit list
**Assertions**:
- Audit A visible in list
- Audit B NOT visible in list
- Empty state message NOT shown (since Audit A exists)
**Expected Behavior**: Only assigned audits visible

### E2E-023: AUDITOR Sees Only Assigned Audits
**Objective**: Verify audit list filtering for AUDITOR
**Prerequisites**:
- Audit A has AuditAssignment for AUDITOR
- Audit B has no assignment for AUDITOR
- Logged in as AUDITOR
**User Actions**:
1. Navigate to `/audits`
2. Observe audit list
**Assertions**:
- Only Audit A visible
- Audit B NOT in list
**Expected Behavior**: Assignment-based filtering works

### E2E-024: CFO Sees All Audits
**Objective**: Verify CFO sees unfiltered audit list
**Prerequisites**: Multiple audits exist, logged in as CFO
**User Actions**:
1. Navigate to `/audits`
2. Count audits in list
**Assertions**:
- All audits visible regardless of assignment
**Expected Behavior**: CFO override shows all audits

### E2E-025: AUDIT_HEAD Cannot Edit Audit Metadata
**Objective**: Verify AUDIT_HEAD cannot modify audit fields
**Prerequisites**: Logged in as AUDIT_HEAD, assigned audit exists
**User Actions**:
1. Navigate to audit detail page
2. Observe edit controls
**Assertions**:
- "Edit Audit" button NOT visible
- OR "Edit" button disabled
- Audit fields are read-only
**Expected Behavior**: No edit capability for AUDIT_HEAD

---

## Module 5: Audit Lock/Unlock/Complete UI

### E2E-026: CFO Can Lock Audit
**Objective**: Verify audit lock operation via UI
**Prerequisites**: Logged in as CFO, unlocked audit exists
**User Actions**:
1. Navigate to audit detail page
2. Click "Lock Audit" button
3. Confirm action in modal (if present)
4. Wait for update
**Assertions**:
- Success notification appears
- "Locked" badge appears on audit detail page
- "Lock Audit" button changes to "Unlock Audit"
- Lock timestamp visible
**Expected Behavior**: Audit locked with visual feedback

### E2E-027: CXO_TEAM Can Lock Audit
**Objective**: Verify CXO_TEAM can lock audits
**Prerequisites**: Logged in as CXO_TEAM, unlocked audit exists
**User Actions**: Same as E2E-026
**Assertions**: Same as E2E-026
**Expected Behavior**: Audit locked successfully

### E2E-028: AUDIT_HEAD Cannot Lock Audit
**Objective**: Verify AUDIT_HEAD doesn't see lock button
**Prerequisites**: Logged in as AUDIT_HEAD, assigned unlocked audit
**User Actions**:
1. Navigate to audit detail page
2. Look for "Lock Audit" button
**Assertions**:
- "Lock Audit" button NOT visible
- Lock controls not accessible
**Expected Behavior**: No lock capability visible

### E2E-029: CFO Can Unlock Audit
**Objective**: Verify unlock operation
**Prerequisites**: Logged in as CFO, locked audit exists
**User Actions**:
1. Navigate to audit detail page
2. Click "Unlock Audit" button
3. Confirm action (if modal present)
4. Wait for update
**Assertions**:
- Success notification appears
- "Locked" badge removed
- "Unlock Audit" button changes to "Lock Audit"
**Expected Behavior**: Audit unlocked

### E2E-030: CXO_TEAM Can Complete Audit
**Objective**: Verify audit completion workflow (auto-locks)
**Prerequisites**: Logged in as CXO_TEAM, open audit exists
**User Actions**:
1. Navigate to audit detail page
2. Click "Mark Complete" or "Complete Audit" button
3. Confirm action
4. Wait for update
**Assertions**:
- Success notification appears
- "Completed" badge appears
- "Locked" badge appears (auto-lock)
- Completion date displayed
- "Edit" buttons disabled/hidden
**Expected Behavior**: Audit marked complete and auto-locked

### E2E-031: Lock Disables Edit Buttons for AUDITOR
**Objective**: Verify locked audit shows disabled UI for AUDITOR
**Prerequisites**: Logged in as AUDITOR, observation in locked audit exists
**User Actions**:
1. Navigate to observation detail page
2. Observe edit controls
**Assertions**:
- "Edit" button disabled or NOT visible
- Form fields read-only or disabled
- "Submit" button disabled (if DRAFT)
- Lock warning message displayed
**Expected Behavior**: UI reflects locked state

### E2E-032: CFO Can Edit Despite Lock
**Objective**: Verify CFO sees enabled edit buttons in locked audit
**Prerequisites**: Logged in as CFO, observation in locked audit
**User Actions**:
1. Navigate to observation detail page
2. Observe edit controls
**Assertions**:
- "Edit" button enabled and visible
- Form fields editable
- CFO override message may be displayed
**Expected Behavior**: CFO can edit despite lock

---

## Module 6: Audit Visibility Rules UI

### E2E-033: CFO Can Configure Visibility Rules
**Objective**: Verify visibility configuration UI
**Prerequisites**: Logged in as CFO, audit exists
**User Actions**:
1. Navigate to audit detail page or settings
2. Find "Visibility Settings" section
3. Select "Hide all historical audits" option
4. Click "Save" button
5. Wait for confirmation
**Assertions**:
- Success notification appears
- Selected rule displayed in UI
**Expected Behavior**: Visibility rule configured

### E2E-034: Visibility "hide_all" Filters AUDITOR Audit List
**Objective**: Verify UI reflects visibility filtering
**Prerequisites**:
- Visibility set to "hide_all"
- Historical audit exists (not assigned to AUDITOR)
- Current audit assigned to AUDITOR
- Logged in as AUDITOR
**User Actions**:
1. Navigate to `/audits`
2. Observe audit list
**Assertions**:
- Only current assigned audit visible
- Historical audit NOT in list
- No empty state shown (current audit present)
**Expected Behavior**: Historical audits hidden from AUDITOR

### E2E-035: Visibility "show_all" Shows All Audits to AUDITOR
**Objective**: Verify "show_all" rule visibility
**Prerequisites**:
- Visibility set to "show_all"
- Multiple historical audits exist
- Logged in as AUDITOR
**User Actions**:
1. Navigate to `/audits`
2. Count audits
**Assertions**:
- All audits visible (historical + current)
**Expected Behavior**: No filtering applied

### E2E-036: Visibility "last_12m" Time-Based Filtering
**Objective**: Verify time-based filtering in UI
**Prerequisites**:
- Visibility set to "last_12m"
- Audit from 18 months ago exists
- Audit from 6 months ago exists
- Logged in as AUDITOR
**User Actions**:
1. Navigate to `/audits`
2. Observe audit list
**Assertions**:
- 18-month-old audit NOT visible
- 6-month-old audit IS visible
**Expected Behavior**: Time-based filtering works

---

## Module 7: Observation Creation UI

### E2E-037: AUDITOR Can Create Observation
**Objective**: Verify observation creation form workflow
**Prerequisites**: Logged in as AUDITOR, assigned audit exists
**User Actions**:
1. Navigate to audit detail page
2. Click "Create Observation" button
3. Fill form:
   - Observation Text: "Test observation from UI"
   - Risk Category: Select "HIGH"
   - Concerned Process: "Finance"
   - Likely Impact: "Financial loss"
4. Click "Create" or "Save" button
5. Wait for success
**Assertions**:
- Success notification appears
- Redirected to observation detail page
- Observation shows status "DRAFT"
- Observation text displayed correctly
- Creator name shown
**Expected Behavior**: Observation created successfully

### E2E-038: AUDIT_HEAD Can Create Observation
**Objective**: Verify AUDIT_HEAD can create observations
**Prerequisites**: Logged in as AUDIT_HEAD, assigned audit exists
**User Actions**: Same as E2E-037
**Assertions**: Same as E2E-037
**Expected Behavior**: Observation created

### E2E-039: CXO_TEAM Cannot Create Observation
**Objective**: Verify CXO_TEAM doesn't see create button
**Prerequisites**: Logged in as CXO_TEAM, audit exists
**User Actions**:
1. Navigate to audit detail page
2. Look for "Create Observation" button
**Assertions**:
- "Create Observation" button NOT visible
**Expected Behavior**: No creation capability

### E2E-040: AUDITEE Cannot Create Observation
**Objective**: Verify AUDITEE lacks creation capability
**Prerequisites**: Logged in as AUDITEE, assigned observation exists
**User Actions**:
1. Navigate to observations list
2. Look for "Create Observation" button
**Assertions**:
- "Create Observation" button NOT visible
**Expected Behavior**: No creation access

---

## Module 8: Observation Field-Level Permissions UI

### E2E-041: AUDITOR Can Edit Auditor Fields in DRAFT
**Objective**: Verify auditor field editability in DRAFT status
**Prerequisites**: Logged in as AUDITOR, DRAFT observation exists (created by user)
**User Actions**:
1. Navigate to observation detail page
2. Click "Edit" button
3. Modify "Observation Text" field
4. Modify "Risk Category" dropdown
5. Click "Save" button
6. Wait for update
**Assertions**:
- Auditor fields are editable (not disabled)
- Success notification appears
- Updated values displayed
**Expected Behavior**: Auditor fields editable in DRAFT

### E2E-042: AUDITOR Fields Disabled After SUBMITTED
**Objective**: Verify auditor fields become read-only after submission
**Prerequisites**: Logged in as AUDITOR, SUBMITTED observation exists
**User Actions**:
1. Navigate to observation detail page
2. Observe form fields
**Assertions**:
- "Edit" button disabled or NOT visible
- Auditor field inputs disabled/read-only
- Status badge shows "SUBMITTED"
- Warning message: "Cannot edit after submission"
**Expected Behavior**: Fields locked after submission

### E2E-043: AUDITEE Cannot Edit Auditor Fields
**Objective**: Verify auditee sees auditor fields as read-only
**Prerequisites**: Logged in as AUDITEE, assigned DRAFT observation
**User Actions**:
1. Navigate to observation detail page
2. Observe form fields
**Assertions**:
- Auditor fields (Observation Text, Risk Category, etc.) are disabled/read-only
- Auditee fields are editable
**Expected Behavior**: Field-level access control enforced

### E2E-044: AUDITEE Can Edit Auditee Fields When Assigned
**Objective**: Verify auditee field editability for assigned AUDITEE
**Prerequisites**: Logged in as AUDITEE, assigned observation exists
**User Actions**:
1. Navigate to observation detail page
2. Click "Edit" button (if separate) or directly edit
3. Fill "Auditee Feedback" field
4. Fill "Target Date" field
5. Click "Save" button
6. Wait for update
**Assertions**:
- Auditee fields editable (not disabled)
- Success notification appears
- Updated values displayed
**Expected Behavior**: Auditee fields editable

### E2E-045: Non-Assigned AUDITEE Cannot Edit Auditee Fields
**Objective**: Verify non-assigned AUDITEE has no edit access
**Prerequisites**: Logged in as AUDITEE, observation exists WITHOUT assignment
**User Actions**:
1. Attempt to navigate to observation detail page (if accessible)
**Assertions**:
- Observation NOT visible in list (filtered out)
- OR direct access shows 403/access denied
**Expected Behavior**: No access to non-assigned observations

### E2E-046: AUDITEE Can Edit Even After APPROVED
**Objective**: Verify AUDITEE can edit auditee fields after approval
**Prerequisites**: Logged in as AUDITEE, assigned APPROVED observation, audit unlocked
**User Actions**:
1. Navigate to observation detail page
2. Edit auditee feedback field
3. Click "Save" button
**Assertions**:
- Auditee fields remain editable
- Success notification appears
- Status still shows "APPROVED"
**Expected Behavior**: Auditee edits allowed after approval

### E2E-047: CFO Can Edit All Fields After APPROVED
**Objective**: Verify CFO override for approved observations
**Prerequisites**: Logged in as CFO, APPROVED observation exists
**User Actions**:
1. Navigate to observation detail page
2. Click "Edit" button
3. Modify auditor field (e.g., Observation Text)
4. Click "Save"
**Assertions**:
- All fields editable
- Success notification appears
- CFO override message may appear
**Expected Behavior**: CFO can edit all fields

---

## Module 9: Observation Approval Workflow UI

### E2E-048: AUDITOR Can Submit DRAFT Observation
**Objective**: Verify submit button and workflow
**Prerequisites**: Logged in as AUDITOR, DRAFT observation exists (created by user)
**User Actions**:
1. Navigate to observation detail page
2. Click "Submit for Approval" button
3. Confirm action (if modal present)
4. Wait for update
**Assertions**:
- Success notification: "Observation submitted for approval"
- Status badge changes from "DRAFT" to "SUBMITTED"
- "Submit" button disappears
- "Edit" button disabled
- Timestamp for submission displayed
**Expected Behavior**: Observation submitted successfully

### E2E-049: AUDIT_HEAD Can Approve Observation
**Objective**: Verify approval workflow from AUDIT_HEAD perspective
**Prerequisites**: Logged in as AUDIT_HEAD, SUBMITTED observation exists
**User Actions**:
1. Navigate to observation detail page
2. Click "Approve" button
3. (Optional) Add approval comments
4. Confirm action
5. Wait for update
**Assertions**:
- Success notification: "Observation approved"
- Status badge changes to "APPROVED"
- "Approve" button disappears
- "Reject" button disappears
- Approval timestamp and approver name displayed
**Expected Behavior**: Observation approved

### E2E-050: AUDIT_HEAD Can Reject Observation
**Objective**: Verify rejection workflow
**Prerequisites**: Logged in as AUDIT_HEAD, SUBMITTED observation exists
**User Actions**:
1. Navigate to observation detail page
2. Click "Reject" button
3. Enter rejection reason in modal/form: "Needs more detail"
4. Click "Confirm Reject" button
5. Wait for update
**Assertions**:
- Success notification: "Observation rejected"
- Status badge changes to "REJECTED"
- Rejection reason displayed
- "Edit" button becomes enabled (for original creator)
**Expected Behavior**: Observation rejected with reason

### E2E-051: AUDITOR Can Re-Edit After Rejection
**Objective**: Verify AUDITOR can edit and resubmit after rejection
**Prerequisites**: Logged in as AUDITOR, REJECTED observation exists
**User Actions**:
1. Navigate to observation detail page
2. Observe rejection reason message
3. Click "Edit" button
4. Update observation text based on feedback
5. Click "Save" button
6. Click "Submit for Approval" button again
7. Wait for update
**Assertions**:
- Edit successful after rejection
- Resubmission successful
- Status changes to "SUBMITTED" again
**Expected Behavior**: Edit and resubmit workflow works

### E2E-052: AUDITOR Cannot Approve Observations
**Objective**: Verify AUDITOR doesn't see approve/reject buttons
**Prerequisites**: Logged in as AUDITOR, SUBMITTED observation exists
**User Actions**:
1. Navigate to observation detail page (if visible)
2. Look for "Approve" and "Reject" buttons
**Assertions**:
- "Approve" button NOT visible
- "Reject" button NOT visible
**Expected Behavior**: No approval capability for AUDITOR

### E2E-053: CFO Can Approve Observations
**Objective**: Verify CFO approval capability
**Prerequisites**: Logged in as CFO, SUBMITTED observation exists
**User Actions**:
1. Navigate to observation detail page
2. Click "Approve" button
3. Confirm action
**Assertions**:
- Approval successful
- Status changes to "APPROVED"
**Expected Behavior**: CFO can approve

---

## Module 10: Observation Deletion UI

### E2E-054: AUDIT_HEAD Can Delete in Open Audit
**Objective**: Verify delete button and workflow
**Prerequisites**: Logged in as AUDIT_HEAD, observation in unlocked audit
**User Actions**:
1. Navigate to observation detail page
2. Click "Delete" button
3. Confirm deletion in modal: "Are you sure?"
4. Wait for deletion
**Assertions**:
- Success notification: "Observation deleted"
- Redirected to observation list or audit detail
- Observation removed from list
**Expected Behavior**: Observation deleted successfully

### E2E-055: AUDIT_HEAD Cannot Delete in Locked Audit
**Objective**: Verify delete button disabled in locked audit
**Prerequisites**: Logged in as AUDIT_HEAD, observation in LOCKED audit
**User Actions**:
1. Navigate to observation detail page
2. Observe "Delete" button
**Assertions**:
- "Delete" button disabled OR NOT visible
- Tooltip/message: "Cannot delete in locked audit"
**Expected Behavior**: Deletion blocked visually

### E2E-056: CFO Can Delete in Locked Audit
**Objective**: Verify CFO override for deletion
**Prerequisites**: Logged in as CFO, observation in LOCKED audit
**User Actions**:
1. Navigate to observation detail page
2. Click "Delete" button (should be enabled)
3. Confirm deletion
**Assertions**:
- "Delete" button enabled
- Deletion successful despite lock
- Success notification appears
**Expected Behavior**: CFO bypass works

### E2E-057: AUDITOR Cannot Delete Observations
**Objective**: Verify AUDITOR doesn't see delete button
**Prerequisites**: Logged in as AUDITOR, observation exists
**User Actions**:
1. Navigate to observation detail page
2. Look for "Delete" button
**Assertions**:
- "Delete" button NOT visible
**Expected Behavior**: No delete capability

---

## Module 11: Auditee Assignment UI

### E2E-058: AUDIT_HEAD Can Assign Auditee
**Objective**: Verify auditee assignment workflow
**Prerequisites**: Logged in as AUDIT_HEAD, observation exists, AUDITEE user exists
**User Actions**:
1. Navigate to observation detail page
2. Find "Assign Auditee" section or button
3. Click "Add Auditee" button
4. Select AUDITEE from dropdown/search
5. Click "Assign" button
6. Wait for update
**Assertions**:
- Success notification: "Auditee assigned"
- Assigned auditee appears in "Assigned Auditees" list
- Auditee name badge/chip visible
**Expected Behavior**: Auditee assigned successfully

### E2E-059: AUDITOR Can Assign Auditee
**Objective**: Verify AUDITOR can assign auditees
**Prerequisites**: Logged in as AUDITOR, observation exists
**User Actions**: Same as E2E-058
**Assertions**: Same as E2E-058
**Expected Behavior**: Assignment successful

### E2E-060: Assigned AUDITEE Sees Observation in List
**Objective**: Verify assigned AUDITEE visibility
**Prerequisites**:
- Observation A assigned to AUDITEE1
- Observation B not assigned
- Logged in as AUDITEE1
**User Actions**:
1. Navigate to `/observations`
2. Observe observation list
**Assertions**:
- Observation A visible in list
- Observation B NOT visible
**Expected Behavior**: Only assigned observations visible

### E2E-061: Non-Assigned AUDITEE Sees Empty List
**Objective**: Verify non-assigned AUDITEE sees no observations
**Prerequisites**: Logged in as AUDITEE with no assignments
**User Actions**:
1. Navigate to `/observations`
2. Observe page
**Assertions**:
- Empty state message: "No observations assigned to you"
- No observation rows visible
**Expected Behavior**: Empty list for non-assigned AUDITEE

### E2E-062: Multiple Auditees Displayed
**Objective**: Verify UI shows multiple assigned auditees
**Prerequisites**: Observation with 2 assigned auditees, logged in as AUDIT_HEAD
**User Actions**:
1. Navigate to observation detail page
2. Observe "Assigned Auditees" section
**Assertions**:
- Both auditee names visible
- Each shown as separate badge/chip
**Expected Behavior**: Multiple assignments displayed

---

## Module 12: Attachment Management UI

### E2E-063: AUDITOR Can Upload Attachment
**Objective**: Verify file upload workflow
**Prerequisites**: Logged in as AUDITOR, observation in unlocked audit
**User Actions**:
1. Navigate to observation detail page
2. Click "Upload Attachment" button
3. Select file type: "ANNEXURE"
4. Choose file from file picker (test.pdf)
5. Click "Upload" button
6. Wait for upload to complete
**Assertions**:
- Upload progress indicator shown
- Success notification: "Attachment uploaded"
- Attachment appears in attachment list
- File name, size, uploader name visible
**Expected Behavior**: File uploaded successfully

### E2E-064: AUDIT_HEAD Can Upload Attachment
**Objective**: Verify AUDIT_HEAD upload capability
**Prerequisites**: Logged in as AUDIT_HEAD
**User Actions**: Same as E2E-063
**Assertions**: Same as E2E-063
**Expected Behavior**: Upload successful

### E2E-065: AUDITEE Cannot Upload Attachment
**Objective**: Verify AUDITEE doesn't see upload button
**Prerequisites**: Logged in as AUDITEE, assigned observation
**User Actions**:
1. Navigate to observation detail page
2. Look for "Upload Attachment" button
**Assertions**:
- "Upload Attachment" button NOT visible
- Can view existing attachments (read-only)
**Expected Behavior**: No upload capability

### E2E-066: All Assigned Users Can View Attachments
**Objective**: Verify attachment visibility for AUDITEE
**Prerequisites**: Logged in as AUDITEE, assigned observation with attachments
**User Actions**:
1. Navigate to observation detail page
2. Observe "Attachments" section
**Assertions**:
- Attachment list visible
- Can click to download/view attachments
**Expected Behavior**: View access granted

### E2E-067: AUDITOR Can Delete Own Attachments
**Objective**: Verify delete button for own attachments
**Prerequisites**: Logged in as AUDITOR, attachment uploaded by user
**User Actions**:
1. Navigate to observation detail page
2. Find attachment in list
3. Click "Delete" icon/button on attachment
4. Confirm deletion
5. Wait for update
**Assertions**:
- Success notification: "Attachment deleted"
- Attachment removed from list
**Expected Behavior**: Own attachment deleted

### E2E-068: AUDITOR Cannot Delete Other Users' Attachments
**Objective**: Verify delete button hidden/disabled for others' attachments
**Prerequisites**: Logged in as AUDITOR, attachment uploaded by different user
**User Actions**:
1. Navigate to observation detail page
2. Find other user's attachment
3. Observe delete controls
**Assertions**:
- "Delete" button NOT visible for other user's attachment
- OR delete button disabled
**Expected Behavior**: Cannot delete others' attachments

### E2E-069: AUDIT_HEAD Can Delete Any Attachment in Open Audit
**Objective**: Verify AUDIT_HEAD delete capability
**Prerequisites**: Logged in as AUDIT_HEAD, attachments exist, audit unlocked
**User Actions**:
1. Navigate to observation detail page
2. Click "Delete" on any attachment
3. Confirm deletion
**Assertions**:
- Deletion successful for any attachment
- Success notification appears
**Expected Behavior**: AUDIT_HEAD can delete all attachments when unlocked

### E2E-070: Lock Disables Delete for AUDITOR
**Objective**: Verify locked audit disables attachment deletion
**Prerequisites**: Logged in as AUDITOR, attachment in LOCKED audit
**User Actions**:
1. Navigate to observation detail page
2. Observe delete controls on attachment
**Assertions**:
- "Delete" button disabled or NOT visible
- Lock warning message shown
**Expected Behavior**: Deletion blocked by lock

---

## Module 13: Action Plan UI

### E2E-071: AUDITOR Can Create Action Plan
**Objective**: Verify action plan creation workflow
**Prerequisites**: Logged in as AUDITOR, observation exists
**User Actions**:
1. Navigate to observation detail page
2. Find "Action Plans" section
3. Click "Add Action Plan" button
4. Fill form:
   - Action Description: "Implement new controls"
   - Responsible Person: "Finance Manager"
   - Target Date: 2025-12-31
5. Click "Save" button
6. Wait for update
**Assertions**:
- Success notification appears
- Action plan appears in list
- Shows description, person, date
**Expected Behavior**: Action plan created

### E2E-072: AUDITEE Can Create Action Plan on Assigned Observation
**Objective**: Verify assigned AUDITEE can add action plans
**Prerequisites**: Logged in as AUDITEE, assigned observation
**User Actions**: Same as E2E-071
**Assertions**: Same as E2E-071
**Expected Behavior**: Action plan creation successful

### E2E-073: AUDITEE Cannot Create Action Plan on Non-Assigned Observation
**Objective**: Verify non-assigned AUDITEE lacks action plan access
**Prerequisites**: Logged in as AUDITEE, non-assigned observation (if accessible)
**User Actions**:
1. Attempt to view observation detail
**Assertions**:
- Observation not accessible (403 or not in list)
**Expected Behavior**: No access to non-assigned observations

### E2E-074: CXO_TEAM Cannot Create Action Plans
**Objective**: Verify CXO_TEAM doesn't see action plan creation
**Prerequisites**: Logged in as CXO_TEAM, observation exists
**User Actions**:
1. Navigate to observation detail page (if accessible for read-only)
2. Look for "Add Action Plan" button
**Assertions**:
- "Add Action Plan" button NOT visible
- Can view existing action plans (read-only)
**Expected Behavior**: No creation capability

### E2E-075: AUDITEE Can Edit Action Plan on Assigned Observation
**Objective**: Verify action plan editing
**Prerequisites**: Logged in as AUDITEE, action plan exists on assigned observation
**User Actions**:
1. Navigate to observation detail page
2. Click "Edit" on action plan
3. Update "Action Description"
4. Click "Save" button
**Assertions**:
- Update successful
- Updated description displayed
**Expected Behavior**: Action plan edited successfully

---

## Module 14: Reports UI

### E2E-076: CFO Can Access Reports Page
**Objective**: Verify CFO can view reports
**Prerequisites**: Logged in as CFO, audits with observations exist
**User Actions**:
1. Click "Reports" navigation link
2. Wait for page load
**Assertions**:
- URL is `/reports`
- Report dashboard/overview visible
- Multiple report options available
**Expected Behavior**: Reports page accessible

### E2E-077: CXO_TEAM Can Access Reports
**Objective**: Verify CXO_TEAM report access
**Prerequisites**: Logged in as CXO_TEAM
**User Actions**: Same as E2E-076
**Assertions**: Same as E2E-076
**Expected Behavior**: Full report access

### E2E-078: AUDIT_HEAD Can Access Reports (Filtered)
**Objective**: Verify AUDIT_HEAD sees filtered reports
**Prerequisites**: Logged in as AUDIT_HEAD, assigned audits exist
**User Actions**:
1. Navigate to `/reports`
2. Generate overview report
3. Observe data
**Assertions**:
- Reports page accessible
- Report data shows only assigned audits
**Expected Behavior**: Filtered report access

### E2E-079: AUDITOR Cannot Access Reports
**Objective**: Verify AUDITOR blocked from reports
**Prerequisites**: Logged in as AUDITOR
**User Actions**:
1. Observe navigation menu
2. Attempt to navigate to `/reports` directly
**Assertions**:
- "Reports" link NOT in navigation
- Direct URL access results in 403 or redirect
**Expected Behavior**: Access denied

### E2E-080: CFO Can Export Observations
**Objective**: Verify export functionality
**Prerequisites**: Logged in as CFO, observations exist
**User Actions**:
1. Navigate to observations list
2. Click "Export" button
3. Select export format (CSV or Excel)
4. Click "Download" button
5. Wait for file download
**Assertions**:
- File download initiated
- Downloaded file contains observation data
**Expected Behavior**: Export successful

---

## Module 15: Real-Time Features (WebSocket)

### E2E-081: Real-Time Observation Update Notification
**Objective**: Verify WebSocket broadcasts observation updates
**Prerequisites**:
- Two browser sessions:
  - Session 1: AUDITOR viewing observation detail
  - Session 2: AUDIT_HEAD viewing same observation
**User Actions**:
1. Session 1 (AUDITOR): Navigate to observation detail page
2. Session 2 (AUDIT_HEAD): Navigate to same observation detail page
3. Session 1: Edit observation text and save
4. Observe Session 2
**Assertions**:
- Session 2 receives real-time update notification
- Updated observation text appears in Session 2 without refresh
- OR notification banner: "Observation updated by [user]"
**Expected Behavior**: Real-time update propagated

### E2E-082: Real-Time Approval Status Change
**Objective**: Verify approval status updates in real-time
**Prerequisites**:
- Two sessions:
  - Session 1: AUDITOR viewing SUBMITTED observation
  - Session 2: AUDIT_HEAD viewing same observation
**User Actions**:
1. Session 2 (AUDIT_HEAD): Click "Approve" button
2. Observe Session 1
**Assertions**:
- Session 1 sees status badge change to "APPROVED" in real-time
- OR notification: "Observation approved by [AUDIT_HEAD name]"
**Expected Behavior**: Real-time status update

### E2E-083: Real-Time Presence Indicator
**Objective**: Verify user presence on observation detail page
**Prerequisites**:
- Two sessions viewing same observation
**User Actions**:
1. Session 1: Navigate to observation detail
2. Session 2: Navigate to same observation
3. Observe presence indicators
**Assertions**:
- Session 1 shows: "Also viewing: [User 2 name]"
- Session 2 shows: "Also viewing: [User 1 name]"
- Avatar/badge displayed
**Expected Behavior**: Presence awareness works

---

## Scenario Tests

### E2E-084: Complete Audit Workflow - All Roles
**Objective**: End-to-end integration test with all roles collaborating
**Prerequisites**: All role users seeded, plant exists
**Test Flow**:
1. **CFO Session**: Login as CFO
   - Navigate to users, verify all users visible
   - Navigate to plants, create new plant
2. **CXO_TEAM Session**: Login as CXO_TEAM
   - Navigate to audits, create new audit for plant
   - Assign AUDIT_HEAD to audit
   - Assign AUDITOR to audit
3. **AUDITOR Session**: Login as AUDITOR
   - Navigate to audits, verify assigned audit visible
   - Navigate to audit detail, create observation (DRAFT)
   - Fill auditor fields, save
   - Submit observation for approval
4. **AUDIT_HEAD Session**: Login as AUDIT_HEAD
   - Navigate to observation detail
   - Review observation, approve it
   - Assign AUDITEE to observation
5. **AUDITEE Session**: Login as AUDITEE
   - Navigate to observations, verify assigned observation visible
   - Open observation detail, fill auditee feedback fields
   - Create action plan, save
6. **AUDITOR Session**: Upload attachment to observation
7. **CXO_TEAM Session**: Lock audit
8. **AUDITOR Session**: Attempt to edit observation (should fail - 403 or disabled UI)
9. **CFO Session**: Edit observation despite lock (should succeed)
10. **CXO_TEAM Session**: Mark audit complete
11. **AUDIT_HEAD Session**: Generate report for completed audit
**Assertions**: All steps succeed, roles respect permissions, audit trail complete
**Expected Behavior**: Complete workflow executes successfully

### E2E-085: CFO Override Scenario
**Objective**: Validate CFO can bypass all restrictions
**Test Flow**:
1. **CXO_TEAM Session**: Create and lock audit, create observation, approve it
2. **CFO Session**: Login as CFO
   - Edit observation in locked audit (succeeds)
   - Edit auditor fields after approval (succeeds)
   - Delete observation in locked audit (succeeds)
   - Unlock audit (succeeds)
   - Assign auditee after lock (succeeds)
**Assertions**: All CFO operations succeed despite restrictions
**Expected Behavior**: CFO override confirmed

### E2E-086: Audit Lock Enforcement Scenario
**Objective**: Validate lock blocks non-CFO edits
**Test Flow**:
1. **CXO_TEAM**: Create audit, assign AUDITOR
2. **AUDITOR**: Create observation, edit observation (succeeds)
3. **CXO_TEAM**: Lock audit
4. **AUDITOR**: Attempt edit (blocked - UI disabled or 403)
5. **AUDIT_HEAD**: Attempt delete observation (blocked)
6. **CFO**: Edit observation (succeeds - override)
7. **CXO_TEAM**: Unlock audit
8. **AUDITOR**: Edit observation (succeeds after unlock)
9. **CXO_TEAM**: Mark audit complete (auto-locks)
10. **AUDITOR**: Attempt edit (blocked by lock)
**Assertions**: Lock enforcement works, CFO bypasses, unlock restores access
**Expected Behavior**: Lock mechanism validated

### E2E-087: Observation Approval Workflow with Rejection
**Objective**: Test complete approval flow including rejection and resubmission
**Test Flow**:
1. **AUDITOR**: Create DRAFT observation, fill fields
2. **AUDITOR**: Submit for approval
3. **AUDIT_HEAD**: Review observation, reject with reason: "Needs more detail"
4. **AUDITOR**: Observe rejection notification, read reason
5. **AUDITOR**: Edit observation based on feedback
6. **AUDITOR**: Resubmit observation
7. **AUDIT_HEAD**: Review again, approve observation
8. **AUDITEE**: Assigned to observation, fill auditee fields
9. **AUDITEE**: Verify can still edit auditee fields after approval
**Assertions**: Rejection workflow works, resubmit successful, approval final
**Expected Behavior**: Complete approval cycle validated

### E2E-088: Auditee Assignment and Restrictions
**Objective**: Validate auditee assignment-based access
**Test Flow**:
1. **AUDIT_HEAD**: Create observation
2. **AUDITEE1 Session**: Login, navigate to observations (empty list)
3. **AUDIT_HEAD**: Assign AUDITEE1 to observation
4. **AUDITEE1**: Refresh observations list (observation now visible)
5. **AUDITEE1**: Open observation, edit auditee fields (succeeds)
6. **AUDITEE1**: Attempt to edit auditor fields (blocked - disabled UI)
7. **AUDITEE2 Session**: Login, navigate to observations (empty - not assigned)
8. **AUDITEE2**: Attempt direct URL access to observation (403 or redirect)
9. **CXO_TEAM**: Lock audit
10. **AUDITEE1**: Attempt to edit auditee fields (blocked by lock)
11. **CFO**: Assign AUDITEE2 to observation after lock (succeeds)
**Assertions**: Assignment controls visibility, field permissions enforced, lock blocks AUDITEE
**Expected Behavior**: Auditee restrictions validated

### E2E-089: Visibility Rules with Multiple Audits
**Objective**: Validate historical audit visibility filtering
**Test Flow**:
1. **CXO_TEAM**: Create 5 audits with different dates:
   - Audit A: 24 months ago
   - Audit B: 18 months ago
   - Audit C: 6 months ago
   - Audit D: current (assign to AUDITOR)
   - Audit E: future
2. **CXO_TEAM**: Set visibility rule: "hide_all"
3. **AUDITOR Session**: Navigate to audits (only Audit D visible)
4. **CXO_TEAM**: Change to "show_all"
5. **AUDITOR**: Refresh audits (all 5 visible)
6. **CXO_TEAM**: Change to "last_12m"
7. **AUDITOR**: Refresh audits (C, D, E visible; A, B hidden)
8. **CXO_TEAM**: Change to explicit: [A, C]
9. **AUDITOR**: Refresh audits (A, C, D visible)
10. **CFO Session**: Navigate to audits (all 5 visible regardless of rules)
**Assertions**: Each visibility rule correctly filters AUDITOR view, CFO sees all
**Expected Behavior**: Visibility rules work as configured

---

## Test Execution Summary Template

```markdown
## Playwright Test Run Report

**Date**: {{date}}
**Environment**: {{env}}
**Browsers**: Chromium, Firefox, WebKit
**Total Tests**: 89 browser tests

### Results by Module
- Module 1 (Navigation): X/8 passed
- Module 2 (User Management UI): X/5 passed
- Module 3 (Plant Management UI): X/5 passed
- Module 4 (Audit Management UI): X/7 passed
- Module 5 (Lock/Unlock UI): X/7 passed
- Module 6 (Visibility Rules UI): X/4 passed
- Module 7 (Observation Creation UI): X/4 passed
- Module 8 (Field Permissions UI): X/7 passed
- Module 9 (Approval Workflow UI): X/6 passed
- Module 10 (Deletion UI): X/4 passed
- Module 11 (Auditee Assignment UI): X/5 passed
- Module 12 (Attachments UI): X/8 passed
- Module 13 (Action Plans UI): X/5 passed
- Module 14 (Reports UI): X/5 passed
- Module 15 (Real-Time Features): X/3 passed
- Scenarios: X/6 passed

### Pass Rate
- **Passed**: X/89
- **Failed**: Y/89
- **Success Rate**: Z%

### Browser Compatibility
- Chromium: X/89 passed
- Firefox: X/89 passed
- WebKit: X/89 passed

### Failed Tests
[List of failed test IDs with screenshots]

### Visual Regressions
[List of UI inconsistencies found]

### Performance Issues
[List of slow page loads or interactions]
```

---

## Page Object Pattern Reference

**Recommended Structure**:
```
e2e/
├── pages/
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── AuditsPage.ts
│   ├── AuditDetailPage.ts
│   ├── ObservationsPage.ts
│   ├── ObservationDetailPage.ts
│   ├── PlantsPage.ts
│   ├── UsersPage.ts
│   └── ReportsPage.ts
├── fixtures/
│   ├── base.ts (authenticated contexts)
│   └── testData.ts (data factories)
├── helpers/
│   ├── auth.ts (login helpers)
│   ├── dbCleanup.ts (database reset)
│   └── apiHelpers.ts (API utilities)
└── tests/
    ├── navigation.spec.ts
    ├── users.spec.ts
    ├── plants.spec.ts
    ├── audits.spec.ts
    ├── observations.spec.ts
    ├── workflows.spec.ts
    └── integration.spec.ts
```

---

**End of Playwright Browser Test Cases Document**
