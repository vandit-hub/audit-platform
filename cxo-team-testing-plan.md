# CXO_TEAM Testing Plan

## Overview
This document provides a comprehensive testing plan for the **CXO_TEAM** role in the Audit Platform. The CXO_TEAM role manages plants, audits, assigns users, and configures visibility but **cannot create or approve observations**.

**Test Credentials:**
- Email: `cxo@example.com`
- Password: `cxo123`

---

## 1. Role Capabilities Summary

### What CXO_TEAM Can Do
Based on analysis of `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac.ts`:

1. **Plant Management**
   - Create new plants (POST `/api/v1/plants`)
   - Edit plant details (PATCH `/api/v1/plants/:id`)
   - Delete plants (DELETE `/api/v1/plants/:id`)
   - View all plants with statistics (GET `/api/v1/plants?withStats=1`)

2. **Audit Management**
   - Create new audits (POST `/api/v1/audits`)
   - Edit audit details (PATCH `/api/v1/audits/:id`)
   - Lock/unlock audits (POST `/api/v1/audits/:id/lock`, `/api/v1/audits/:id/unlock`)
   - Mark audits as complete (POST `/api/v1/audits/:id/complete`)
   - Assign/unassign auditors to audits (POST/DELETE `/api/v1/audits/:id/assign`)
   - Configure audit visibility rules (POST `/api/v1/audits/:id/visibility`)
   - View all audits (GET `/api/v1/audits`)
   - View individual audit details (GET `/api/v1/audits/:id`)

3. **User Management**
   - View all users (GET `/api/v1/users`)
   - Invite new users with roles: GUEST, AUDITEE, AUDITOR (POST `/api/v1/auth/invite`)
   - **Note:** Only CFO can invite CXO_TEAM or AUDIT_HEAD roles

4. **Checklist Management**
   - Create new checklists (POST `/api/v1/checklists`)
   - View all checklists (GET `/api/v1/checklists`)
   - Add checklist items (POST `/api/v1/checklists/:id/items`)
   - Configure checklist applicability to plants

5. **Read-Only Access**
   - View observations (cannot create, edit, approve, or reject)
   - View reports and export data
   - View AI assistant interface

### What CXO_TEAM Cannot Do

1. **Observation Operations** (requires AUDITOR or AUDIT_HEAD role)
   - Cannot create observations
   - Cannot edit observations
   - Cannot approve/reject observations
   - Cannot submit observations for approval
   - Cannot publish/unpublish observations
   - Cannot assign auditees to observations
   - Cannot manage observation attachments
   - Cannot create/edit action plans

2. **Restricted User Management**
   - Cannot invite users with CXO_TEAM role
   - Cannot invite users with AUDIT_HEAD role
   - Cannot invite users with CFO role

### Permission Patterns

**Authorization Functions Used:**
- `assertCFOOrCXOTeam(role)` - Throws 403 if not CFO or CXO_TEAM
- `isCFOOrCXOTeam(role)` - Boolean check for UI rendering
- `canManageAudits(role)` - Returns true for CFO and CXO_TEAM

**CFO Short-Circuit:** CFO bypasses all CXO_TEAM restrictions (can do everything CXO_TEAM can do + more)

---

## 2. Accessible Pages

All pages under `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/`:

| Page | URL | Purpose | Access Level |
|------|-----|---------|--------------|
| Dashboard | `/dashboard` | Overview and metrics | Full Access |
| Plants | `/plants` | Manage plant locations | Full Access (Create/Edit/Delete) |
| Audits | `/audits` | Manage audit processes | Full Access (Create/Edit/Lock) |
| Audit Detail | `/audits/:id` | View/edit individual audit | Full Access |
| Observations | `/observations` | View observations | Read-Only |
| Observation Detail | `/observations/:id` | View observation details | Read-Only |
| Checklists | `/checklists` | Checklist management | Full Access (Module disabled in UI) |
| Reports | `/reports` | View and export reports | Read-Only |
| Admin Users | `/admin/users` | User management | Full Access (Invite users) |
| Admin Import | `/admin/import` | Import data from Excel | Full Access |
| AI Assistant | `/ai` | AI-powered chat assistance | Full Access |

---

## 3. Inaccessible Pages

CXO_TEAM has access to all dashboard pages but with **limited functionality** on observation-related pages:

- **Observation Creation/Editing:** Cannot create new observations or edit existing ones (no "Create Observation" button visible)
- **Approval Actions:** Cannot approve/reject observations (buttons not shown)
- **Auditee Assignment:** Cannot assign auditees to observations

---

## 4. Operation Matrix

### Plants Page (`/plants`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| View plants with stats | Automatic on page load | GET `/api/v1/plants?withStats=1` | None | ✅ Allowed |
| Search plants | Search input field | Client-side filtering | None | ✅ Allowed |
| Create plant | "Create Plant" button → Dialog → Form | POST `/api/v1/plants` | Valid plant code & name | ✅ Allowed |
| Edit plant | Plant card → "..." menu → "Edit" | PATCH `/api/v1/plants/:id` | Plant must exist | ✅ Allowed |
| Delete plant | Plant card → "..." menu → "Delete" | DELETE `/api/v1/plants/:id` | Plant must exist | ✅ Allowed |

### Audits Page (`/audits`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| View all audits | Automatic on page load | GET `/api/v1/audits` | None | ✅ Allowed |
| Create audit | "Create Audit" button → Dialog → Form | POST `/api/v1/audits` | Valid plantId, optional auditHeadId & auditorIds | ✅ Allowed |
| Lock audit | Audit row → Lock icon button | POST `/api/v1/audits/:id/lock` | Audit not locked, not completed | ✅ Allowed |
| Unlock audit | Audit row → Unlock icon button | POST `/api/v1/audits/:id/unlock` | Audit is locked, not completed | ✅ Allowed |
| View audit details | Audit row → "Open" button | GET `/api/v1/audits/:id` | None | ✅ Allowed |

### Audit Detail Page (`/audits/:id`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| View audit | Automatic on page load | GET `/api/v1/audits/:id` | None | ✅ Allowed |
| Edit audit | "Edit Audit" button → Dialog → Form | PATCH `/api/v1/audits/:id` | Audit not locked (or CFO) | ✅ Allowed |
| Lock audit | "Lock Audit" button | POST `/api/v1/audits/:id/lock` | Audit not locked, not completed | ✅ Allowed |
| Unlock audit | "Unlock Audit" button | POST `/api/v1/audits/:id/unlock` | Audit is locked, not completed | ✅ Allowed |
| Mark complete | "Mark Complete" button → Confirm dialog | POST `/api/v1/audits/:id/complete` | Audit not completed | ✅ Allowed |
| Export report | "Export Report" button | Client-side print dialog | None | ✅ Allowed |
| Assign auditors | Edit Audit Dialog → Auditors field | POST `/api/v1/audits/:id/assign` | Valid auditor userId | ✅ Allowed |
| Remove auditors | Edit Audit Dialog → Remove auditor | DELETE `/api/v1/audits/:id/assign?userId=:id` | Auditor assigned to audit | ✅ Allowed |
| Configure visibility | (API only, no UI button) | POST `/api/v1/audits/:id/visibility` | Valid visibility rules JSON | ✅ Allowed |

### Observations Page (`/observations`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| View observations | Automatic on page load | GET `/api/v1/observations` | None | ✅ Allowed (Read-Only) |
| Filter observations | Filter dropdowns | Client-side filtering | None | ✅ Allowed |
| Create observation | "Create Observation" button | N/A | N/A | ❌ **Not Allowed** (button hidden) |

### Observation Detail Page (`/observations/:id`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| View observation | Automatic on page load | GET `/api/v1/observations/:id` | None | ✅ Allowed (Read-Only) |
| Edit observation | Edit form | N/A | N/A | ❌ **Not Allowed** |
| Approve observation | "Approve" button | N/A | N/A | ❌ **Not Allowed** (button hidden) |
| Reject observation | "Reject" button | N/A | N/A | ❌ **Not Allowed** (button hidden) |
| Assign auditee | "Assign Auditee" button | N/A | N/A | ❌ **Not Allowed** (button hidden) |

### Admin Users Page (`/admin/users`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| View all users | Automatic on page load | GET `/api/v1/users` | None | ✅ Allowed |
| Invite user (GUEST) | Invite form → Role: GUEST | POST `/api/v1/auth/invite` | Valid email, role, expiry days | ✅ Allowed |
| Invite user (AUDITEE) | Invite form → Role: AUDITEE | POST `/api/v1/auth/invite` | Valid email, role, expiry days | ✅ Allowed |
| Invite user (AUDITOR) | Invite form → Role: AUDITOR | POST `/api/v1/auth/invite` | Valid email, role, expiry days | ✅ Allowed |
| Invite user (CXO_TEAM) | Invite form → Role: CXO_TEAM | N/A | N/A | ❌ **Not Allowed** (option hidden) |
| Invite user (AUDIT_HEAD) | Invite form → Role: AUDIT_HEAD | N/A | N/A | ❌ **Not Allowed** (option hidden) |
| Copy invite link | "Copy" button on generated invite | Client-side clipboard API | Valid invite token | ✅ Allowed |

### Admin Import Page (`/admin/import`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| Download template | "Download Template" button | GET `/api/v1/import/template` | None | ✅ Allowed |
| Upload Excel file | File upload + "Import" button | POST `/api/v1/import/excel` | Valid Excel file with observations | ✅ Allowed |

### Reports Page (`/reports`)

| Operation | UI Element | API Endpoint | Prerequisites | Permission |
|-----------|-----------|--------------|--------------|------------|
| View report overview | Automatic on page load | GET `/api/v1/reports/overview` | None | ✅ Allowed |
| Export period report | "Export" button | GET `/api/v1/reports/period/export` | Date range parameters | ✅ Allowed |
| Export retest report | "Export Retest" button | GET `/api/v1/reports/retest/export` | None | ✅ Allowed |

---

## 5. Test Scenarios

### Priority: Critical (Core CXO Responsibilities)

#### Test 1: Create New Plant
**Page:** `/plants`
**Prerequisites:** Logged in as cxo@example.com
**Steps:**
1. Navigate to `/plants`
2. Click "Create Plant" button
3. Enter Plant Code: "PLT-TEST-001"
4. Enter Plant Name: "Test Manufacturing Plant"
5. Click "Create Plant" button

**Expected:**
- Success toast: "Plant 'Test Manufacturing Plant' created successfully!"
- New plant appears in the plants list
- Plant card shows code "PLT-TEST-001"
- API logs audit event with entityType: "PLANT", action: "CREATE_PLANT"

**API Call:** `POST /api/v1/plants`

---

#### Test 2: Edit Existing Plant
**Page:** `/plants`
**Prerequisites:** At least one plant exists
**Steps:**
1. Navigate to `/plants`
2. Click "..." menu on any plant card
3. Click "Edit"
4. Change plant name to "Updated Plant Name"
5. Click "Save Changes"

**Expected:**
- Success toast: "Plant 'Updated Plant Name' updated successfully!"
- Plant card updates with new name
- Changes persist after page refresh

**API Call:** `PATCH /api/v1/plants/:id`

---

#### Test 3: Delete Plant
**Page:** `/plants`
**Prerequisites:** At least one plant exists with no associated audits
**Steps:**
1. Navigate to `/plants`
2. Click "..." menu on a plant card
3. Click "Delete"
4. Confirm deletion in dialog

**Expected:**
- Success toast: "Plant deleted successfully!"
- Plant card disappears from list
- Plant count decreases in overview

**API Call:** `DELETE /api/v1/plants/:id`

---

#### Test 4: Create New Audit with Audit Head and Auditors
**Page:** `/audits`
**Prerequisites:**
- At least one plant exists
- At least one AUDIT_HEAD user exists
- At least one AUDITOR user exists
**Steps:**
1. Navigate to `/audits`
2. Click "Create Audit" button
3. Select a plant from dropdown
4. Enter Title: "Q1 2025 Compliance Audit"
5. Enter Purpose: "Quarterly compliance review"
6. Select Visit Start Date: Tomorrow's date
7. Select Visit End Date: 7 days from now
8. Select Audit Head from dropdown
9. Select at least one Auditor
10. Click "Create Audit"

**Expected:**
- Success toast: "Audit created successfully for [plant name]!"
- New audit appears in audits table
- Audit shows selected audit head and auditors
- Status badge shows "Planned"
- Lock status shows "Unlocked"

**API Call:** `POST /api/v1/audits`

---

#### Test 5: Lock an Audit
**Page:** `/audits`
**Prerequisites:** At least one unlocked, incomplete audit exists
**Steps:**
1. Navigate to `/audits`
2. Find an unlocked audit in the table
3. Click the Lock icon button in the Actions column

**Expected:**
- Success toast: "Audit locked successfully!"
- Lock status badge changes from "Unlocked" to "Locked"
- Lock icon changes to Unlock icon
- Audit row refreshes

**API Call:** `POST /api/v1/audits/:id/lock`

---

#### Test 6: Unlock an Audit
**Page:** `/audits`
**Prerequisites:** At least one locked, incomplete audit exists
**Steps:**
1. Navigate to `/audits`
2. Find a locked audit in the table
3. Click the Unlock icon button in the Actions column

**Expected:**
- Success toast: "Audit unlocked successfully!"
- Lock status badge changes from "Locked" to "Unlocked"
- Unlock icon changes to Lock icon
- Audit row refreshes

**API Call:** `POST /api/v1/audits/:id/unlock`

---

#### Test 7: Edit Audit Details
**Page:** `/audits/:id`
**Prerequisites:** At least one audit exists
**Steps:**
1. Navigate to `/audits`
2. Click "Open" on any audit
3. Click "Edit Audit" button
4. Change Title to "Updated Audit Title"
5. Change Purpose to "Updated purpose description"
6. Update Visit Start Date
7. Click "Save Changes"

**Expected:**
- Success toast: "Audit updated successfully!"
- Page title updates to show new title
- Purpose description updates
- Changes persist after page refresh

**API Call:** `PATCH /api/v1/audits/:id`

---

#### Test 8: Mark Audit as Complete
**Page:** `/audits/:id`
**Prerequisites:** At least one incomplete audit exists
**Steps:**
1. Navigate to `/audits/:id` for an incomplete audit
2. Click "Mark Complete" button
3. Confirm in the dialog by clicking "Mark Complete"

**Expected:**
- Success toast: "Audit marked as complete!"
- Status badge changes to "Signed Off (Locked)"
- "Mark Complete" button disappears
- "Lock/Unlock" buttons disappear
- Audit is automatically locked
- "Edit Audit" button may still be visible but editing restricted

**API Call:** `POST /api/v1/audits/:id/complete`

---

#### Test 9: Invite New User (AUDITOR)
**Page:** `/admin/users`
**Prerequisites:** None
**Steps:**
1. Navigate to `/admin/users`
2. Enter Email: "newauditor@example.com"
3. Select Role: "Auditor"
4. Set Expiry Days: 7
5. Click "Generate Invite Link"

**Expected:**
- Success toast: "Invitation created successfully for newauditor@example.com!"
- Invite link appears in alert box
- Link format: `http://localhost:3005/accept-invite?token=...`
- "Copy" button works to copy link to clipboard

**API Call:** `POST /api/v1/auth/invite`

---

### Priority: Important (Supporting Operations)

#### Test 10: Assign Auditor to Existing Audit
**Page:** `/audits/:id`
**Prerequisites:**
- Audit exists
- At least one unassigned AUDITOR exists
**Steps:**
1. Navigate to `/audits/:id`
2. Click "Edit Audit" button
3. Add a new auditor from the auditors multi-select
4. Click "Save Changes"

**Expected:**
- Success toast: "Audit updated successfully!"
- New auditor appears in "Assigned Auditors" section
- Audit table shows updated auditor count

**API Call:** `POST /api/v1/audits/:id/assign` (called via PATCH `/api/v1/audits/:id`)

---

#### Test 11: Remove Auditor from Audit
**Page:** `/audits/:id`
**Prerequisites:**
- Audit exists
- At least one auditor is assigned
**Steps:**
1. Navigate to `/audits/:id`
2. Click "Edit Audit" button
3. Remove an auditor from the auditors multi-select
4. Click "Save Changes"

**Expected:**
- Success toast: "Audit updated successfully!"
- Removed auditor no longer appears in "Assigned Auditors" section
- Audit table shows updated auditor count

**API Call:** `DELETE /api/v1/audits/:id/assign?userId=:id` (called via PATCH `/api/v1/audits/:id`)

---

#### Test 12: View Plant Statistics
**Page:** `/plants`
**Prerequisites:**
- At least one plant exists
- Plant has associated audits and observations
**Steps:**
1. Navigate to `/plants`
2. Observe plant cards

**Expected:**
- Each plant card shows:
  - Total audits count
  - Active audits badge (if any)
  - Signed off audits badge (if any)
  - Total observations count
  - Observations by risk category (A, B, C)
  - Observations by status badges
- Overview card at bottom shows aggregated totals

**API Call:** `GET /api/v1/plants?withStats=1`

---

#### Test 13: Search Plants
**Page:** `/plants`
**Prerequisites:** Multiple plants exist
**Steps:**
1. Navigate to `/plants`
2. Enter search term in search box (e.g., plant code or partial name)

**Expected:**
- Plant cards filter in real-time
- Only matching plants display
- Search is case-insensitive
- Overview stats update to reflect filtered results

**API Call:** None (client-side filtering)

---

#### Test 14: View All Audits
**Page:** `/audits`
**Prerequisites:** Multiple audits exist
**Steps:**
1. Navigate to `/audits`

**Expected:**
- Table displays all audits (no scoping restrictions for CXO_TEAM)
- Each row shows:
  - Title
  - Plant (code + name)
  - Period (start - end dates)
  - Lock status badge
  - Progress bar with percentage
  - Audit head name
  - Additional auditors count
  - Actions (Open button, Lock/Unlock button)

**API Call:** `GET /api/v1/audits`

---

#### Test 15: Export Audit Report
**Page:** `/audits/:id`
**Prerequisites:** At least one audit exists
**Steps:**
1. Navigate to `/audits/:id`
2. Click "Export Report" button

**Expected:**
- Browser print dialog opens
- Success toast: "Print dialog opened. Use 'Save as PDF' to export."
- User can save as PDF using browser's print-to-PDF functionality

**API Call:** None (client-side print dialog)

---

#### Test 16: Invite User with Different Roles
**Page:** `/admin/users`
**Prerequisites:** None
**Steps:**
1. Navigate to `/admin/users`
2. Test inviting with Role: "Guest"
3. Test inviting with Role: "Auditee"
4. Test inviting with Role: "Auditor"

**Expected:**
- All three role options visible in dropdown
- Invite links generated successfully for all roles
- CXO_TEAM and AUDIT_HEAD options **not visible** in dropdown

**API Call:** `POST /api/v1/auth/invite`

---

### Priority: Nice-to-Have (Edge Cases & Validation)

#### Test 17: Create Plant with Duplicate Code
**Page:** `/plants`
**Prerequisites:** At least one plant exists
**Steps:**
1. Navigate to `/plants`
2. Click "Create Plant"
3. Enter existing plant code
4. Enter new plant name
5. Click "Create Plant"

**Expected:**
- Error toast: "Plant code already exists" (or similar)
- Dialog remains open
- Plant not created

**API Call:** `POST /api/v1/plants` (fails with 400/409)

---

#### Test 18: Edit Locked Audit (CXO_TEAM)
**Page:** `/audits/:id`
**Prerequisites:** Locked audit exists, user is CXO_TEAM (not CFO)
**Steps:**
1. Navigate to `/audits/:id` for a locked audit
2. Click "Edit Audit" button
3. Attempt to change title
4. Click "Save Changes"

**Expected:**
- Error toast: "Audit is locked"
- Changes not saved
- CFO can edit locked audits, but CXO_TEAM cannot

**API Call:** `PATCH /api/v1/audits/:id` (fails with 403)

---

#### Test 19: Verify Observation Access (Read-Only)
**Page:** `/observations`
**Prerequisites:** Observations exist
**Steps:**
1. Navigate to `/observations`
2. Look for "Create Observation" button

**Expected:**
- "Create Observation" button **not visible**
- Observations list visible with filters
- Can click on individual observations to view details
- Cannot edit observation fields

**API Call:** `GET /api/v1/observations`

---

#### Test 20: Verify Cannot Approve/Reject Observations
**Page:** `/observations/:id`
**Prerequisites:** At least one submitted observation exists
**Steps:**
1. Navigate to `/observations/:id` for a submitted observation
2. Look for "Approve" and "Reject" buttons

**Expected:**
- "Approve" button **not visible**
- "Reject" button **not visible**
- Observation details visible in read-only mode
- Cannot edit observation fields

**API Call:** `GET /api/v1/observations/:id`

---

#### Test 21: Create Audit Without Audit Head
**Page:** `/audits`
**Prerequisites:** At least one plant exists
**Steps:**
1. Navigate to `/audits`
2. Click "Create Audit"
3. Select plant
4. Enter title and purpose
5. Leave Audit Head field empty
6. Click "Create Audit"

**Expected:**
- Audit created successfully
- Audit Head shows "Not assigned" in audit details
- Audit can still be edited later to add audit head

**API Call:** `POST /api/v1/audits`

---

#### Test 22: Delete Plant with Associated Audits
**Page:** `/plants`
**Prerequisites:** Plant exists with associated audits
**Steps:**
1. Navigate to `/plants`
2. Attempt to delete a plant that has audits
3. Confirm deletion

**Expected:**
- Error toast: "Cannot delete plant with associated audits" (or cascade deletes audits)
- Behavior depends on database cascade rules
- Check if deletion fails or cascades

**API Call:** `DELETE /api/v1/plants/:id`

---

#### Test 23: Concurrent Lock/Unlock Actions
**Page:** `/audits`
**Prerequisites:** At least one audit exists
**Steps:**
1. Navigate to `/audits`
2. Quickly click Lock button
3. Immediately click Unlock button before first action completes

**Expected:**
- Only one action processes
- Second action may fail gracefully
- Loading state prevents double-clicks
- Final state consistent (either locked or unlocked)

**API Call:** `POST /api/v1/audits/:id/lock` or `/unlock`

---

#### Test 24: View Empty States
**Page:** Various
**Prerequisites:** Fresh database or no data
**Steps:**
1. Navigate to `/plants` with no plants
2. Navigate to `/audits` with no audits
3. Navigate to `/admin/users` with no users (besides seeded)

**Expected:**
- Plants: Empty state card with "No plants yet" message
- Audits: Empty state with "No audits yet" message
- Users: List shows seeded users only

**API Call:** Various GET endpoints return empty arrays

---

#### Test 25: Invite User with Invalid Email
**Page:** `/admin/users`
**Prerequisites:** None
**Steps:**
1. Navigate to `/admin/users`
2. Enter invalid email: "notanemail"
3. Select Role: "Auditor"
4. Click "Generate Invite Link"

**Expected:**
- HTML5 email validation prevents submission, or
- Error toast: "Invalid email address"
- Invite not created

**API Call:** `POST /api/v1/auth/invite` (fails with 400)

---

## 6. Execution Plan

### Prerequisites

**Database Setup:**
1. Ensure PostgreSQL Docker container is running:
   ```bash
   docker start audit-postgres
   ```
2. Run database seed:
   ```bash
   npm run db:seed
   ```
3. Verify seeded data:
   - CFO user: cfo@example.com
   - CXO_TEAM user: cxo@example.com
   - AUDIT_HEAD user: audithead@example.com
   - AUDITOR user: auditor@example.com
   - AUDITEE user: auditee@example.com
   - At least 1-2 plants seeded
   - At least 1-2 audits seeded

**Application Setup:**
1. Start development server:
   ```bash
   npm run dev
   ```
2. Application runs on `http://localhost:3005`
3. WebSocket server runs on port 3001 (for real-time features)

---

### Test Data Dependencies

Before testing, ensure database contains:

1. **Plants:**
   - PLT001: "Manufacturing Plant A"
   - PLT002: "Distribution Center B"
   - PLT003: "Warehouse C"

2. **Users:**
   - CXO_TEAM: cxo@example.com (test account)
   - AUDIT_HEAD: audithead@example.com (for assignment testing)
   - AUDITOR: auditor@example.com (for assignment testing)
   - AUDITEE: auditee@example.com (for observation assignment context)

3. **Audits (various states):**
   - At least one unlocked audit (for lock testing)
   - At least one locked audit (for unlock testing)
   - At least one incomplete audit (for completion testing)
   - At least one audit with observations (for progress tracking)

4. **Observations:**
   - At least 3-5 observations across different audits
   - Mix of DRAFT, SUBMITTED, APPROVED statuses
   - Mix of risk categories (A, B, C)

---

### Execution Order

**Phase 1: Basic Plant Management (Tests 1-3)**
- Start with plant creation, editing, and deletion
- Verify RBAC permissions work correctly
- Confirm audit trail logging

**Phase 2: Audit Creation & Management (Tests 4-8)**
- Create audits with various configurations
- Test locking/unlocking mechanisms
- Test audit editing and completion

**Phase 3: User Management (Tests 9, 16)**
- Test user invitation flow
- Verify role restrictions in dropdown

**Phase 4: Audit Assignment Operations (Tests 10-11)**
- Test auditor assignment/removal
- Verify assignment persistence

**Phase 5: Read Operations & Statistics (Tests 12-15)**
- Verify data visibility
- Test filtering and search
- Check statistics calculations

**Phase 6: Negative Tests & Edge Cases (Tests 17-25)**
- Validation failures
- Permission denials
- Edge cases and concurrency

---

### Success Criteria

**All tests must:**
1. ✅ Complete without server errors (500)
2. ✅ Return expected HTTP status codes (200, 400, 403, etc.)
3. ✅ Display correct success/error toast messages
4. ✅ Persist data correctly (survives page refresh)
5. ✅ Log audit events to `AuditEvent` table
6. ✅ Respect RBAC permissions (no unauthorized actions succeed)
7. ✅ Show correct UI elements (buttons visible/hidden based on role)

**Critical Failures (immediate investigation required):**
- ❌ CXO_TEAM can create/approve observations
- ❌ CXO_TEAM can access CFO-only operations
- ❌ CXO_TEAM can invite users with elevated roles (CXO_TEAM, AUDIT_HEAD)
- ❌ Data loss or corruption during CRUD operations
- ❌ Audit events not logged

**Performance Benchmarks:**
- Plant/Audit creation: < 2 seconds
- Lock/Unlock operations: < 1 second
- Page loads with data: < 3 seconds
- Statistics aggregation: < 5 seconds (for large datasets)

---

## 7. Browser Testing Approach

**Important:** The application uses NextAuth v5 which requires proper session handling.

### ❌ Do NOT Use Programmatic Auth
Do not attempt:
- `curl` or `fetch` to POST to auth endpoints
- Manual cookie manipulation
- Bypassing the login UI

### ✅ Use Playwright for Browser Automation

**Login Script:**
```typescript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Navigate to login page
  await page.goto('http://localhost:3005/login');

  // Fill login form
  await page.fill('input[name="email"]', 'cxo@example.com');
  await page.fill('input[name="password"]', 'cxo123');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect (away from /login)
  await page.waitForURL(/^((?!\/login).)*$/);

  // Verify successful login
  await expect(page).toHaveURL(/\/dashboard/);
});

test('Test 1: Create New Plant', async ({ page }) => {
  // Navigate to plants page
  await page.goto('http://localhost:3005/plants');

  // Click Create Plant button
  await page.click('button:has-text("Create Plant")');

  // Fill form
  await page.fill('input#plant-code', 'PLT-TEST-001');
  await page.fill('input#plant-name', 'Test Manufacturing Plant');

  // Submit
  await page.click('button:has-text("Create Plant")');

  // Verify success toast
  await expect(page.locator('text=created successfully')).toBeVisible();

  // Verify plant appears in list
  await expect(page.locator('text=PLT-TEST-001')).toBeVisible();
});
```

---

## 8. Known Limitations & Notes

1. **Checklist Module:** UI shows "Module Not Available" placeholder. API endpoints exist but UI is disabled.

2. **Visibility Rules:** API supports configuring audit visibility (`POST /api/v1/audits/:id/visibility`) but no UI button exists in the current implementation.

3. **Export Functionality:** "Export Report" button triggers browser print dialog, not a dedicated PDF export.

4. **Real-time Updates:** WebSocket server (port 3001) must be running for real-time observation updates, but CXO_TEAM primarily uses polling for audit/plant data.

5. **Audit Completion:** Completing an audit automatically locks it. This is a one-way operation (no "un-complete").

6. **Plant Deletion:** Behavior depends on database cascade configuration. May fail if plant has audits, or cascade delete audits.

7. **Scope Restrictions:** CXO_TEAM has **no scope restrictions** (sees all plants and audits). GUEST role uses scope restrictions from `GuestInvite` table.

---

## 9. Reporting Template

For each test execution, record:

```
Test ID: [Test Number]
Test Name: [Test Name]
Date: [YYYY-MM-DD]
Tester: [Name]
Environment: [Dev/Staging/Production]
Browser: [Chrome/Firefox/Safari + Version]

Result: [PASS/FAIL]
Execution Time: [Seconds]
Screenshots: [Attached/Not Attached]

Notes:
- [Any observations]
- [Unexpected behavior]
- [Edge cases discovered]

Errors (if FAIL):
- Error Message: [...]
- HTTP Status: [...]
- Console Logs: [...]
- Steps to Reproduce: [...]
```

---

## 10. Appendix: API Endpoint Reference

### Plants
- `GET /api/v1/plants` - List all plants
- `GET /api/v1/plants?withStats=1` - List plants with statistics
- `POST /api/v1/plants` - Create plant
- `PATCH /api/v1/plants/:id` - Update plant
- `DELETE /api/v1/plants/:id` - Delete plant

### Audits
- `GET /api/v1/audits` - List all audits
- `GET /api/v1/audits/:id` - Get audit details
- `POST /api/v1/audits` - Create audit
- `PATCH /api/v1/audits/:id` - Update audit
- `POST /api/v1/audits/:id/lock` - Lock audit
- `POST /api/v1/audits/:id/unlock` - Unlock audit
- `POST /api/v1/audits/:id/complete` - Mark complete
- `POST /api/v1/audits/:id/assign` - Assign auditor
- `DELETE /api/v1/audits/:id/assign?userId=:id` - Remove auditor
- `POST /api/v1/audits/:id/visibility` - Configure visibility
- `GET /api/v1/audits/:id/visibility` - Get visibility rules

### Users
- `GET /api/v1/users` - List all users
- `GET /api/v1/users?role=AUDITOR` - List users by role
- `POST /api/v1/auth/invite` - Create invite

### Observations (Read-Only for CXO_TEAM)
- `GET /api/v1/observations` - List observations
- `GET /api/v1/observations/:id` - Get observation details

### Reports
- `GET /api/v1/reports/overview` - Report overview
- `GET /api/v1/reports/period/export` - Export period report
- `GET /api/v1/reports/retest/export` - Export retest report

### Checklists
- `GET /api/v1/checklists` - List checklists
- `POST /api/v1/checklists` - Create checklist
- `POST /api/v1/checklists/:id/items` - Add checklist items
