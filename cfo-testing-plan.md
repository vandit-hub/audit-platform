# CFO Role Testing Plan

**Generated**: 2025-11-17
**Target Role**: CFO (Chief Financial Officer)
**Test Environment**: Development (http://localhost:3005)
**Test Credentials**: cfo@example.com / cfo123

---

## 1. Role Capabilities Summary

### 1.1 CFO Short-Circuit Principle

The CFO role is the **organization-level superuser** with unrestricted access to all platform operations. The RBAC v2 system implements a "short-circuit" pattern where:

- **All assertion functions bypass permission checks for CFO** (except `assertCFO` itself)
- **CFO never encounters 403 Forbidden errors** for any operation
- **No scope restrictions apply** to CFO (unlike Guest role)
- **No audit lock restrictions** - CFO can modify locked audits
- **No ownership requirements** - CFO can approve/reject/publish observations for any audit

### 1.2 Permission Capabilities

Based on `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac.ts`:

| Permission Function | CFO Access | Notes |
|---------------------|-----------|-------|
| `isCFO()` | ✅ Always true | Identity check |
| `canManageAudits()` | ✅ Yes | Create, edit, lock, complete audits |
| `canAuthorObservations()` | ✅ Yes | Create and edit draft observations |
| `canApproveObservations()` | ✅ Yes | Approve/reject observations |
| All `assert*` functions | ✅ Short-circuit | Pass without checking (except `assertCFO`) |

### 1.3 Special CFO Privileges

1. **Audit Management**: Full control over all audits regardless of assignment
2. **Observation Lifecycle**: Complete access to create, edit, approve, reject, publish, unpublish
3. **User Management**: Can invite users with any role (including CXO_TEAM and AUDIT_HEAD)
4. **Lock Override**: Can modify locked audits (other roles cannot)
5. **Bulk Operations**: Can approve/reject/publish/unpublish observations in bulk
6. **Data Import**: Exclusive access to Excel import functionality
7. **Reports & Exports**: Full access to all data across all plants/audits

---

## 2. Accessible Pages

All pages in the dashboard are accessible to CFO without restrictions.

### 2.1 Primary Navigation

| Page | Path | Purpose |
|------|------|---------|
| **Dashboard** | `/dashboard` | Home page with overview statistics |
| **Plants** | `/plants` | Manage plant locations |
| **Audits** | `/audits` | View and manage all audits |
| **Observations** | `/observations` | List and filter all observations |
| **Reports** | `/reports` | Analytics, KPIs, and data exports |
| **AI Assistant** | `/ai` | Chat with AI for queries about observations/audits |
| **Checklists** | `/checklists` | Checklist module (currently disabled) |

### 2.2 Admin Pages

| Page | Path | Access |
|------|------|--------|
| **User Management** | `/admin/users` | ✅ CFO Only (and CXO_TEAM) |
| **Data Import** | `/admin/import` | ✅ CFO Only |

### 2.3 Detail Pages

- **Audit Details**: `/audits/[auditId]` - View audit details, checklists, observations
- **Observation Details**: `/observations/[id]` - View/edit individual observation

---

## 3. Inaccessible Pages

**None.** CFO has access to all pages in the application.

---

## 4. Operation Matrix

### 4.1 Plants Page (`/plants`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **View plants** | Cards list | `GET /api/v1/plants?withStats=1` | None | See all plants with statistics |
| **Create plant** | "Create Plant" button → Dialog | `POST /api/v1/plants` | Valid code + name | Full access (requires CFO or CXO_TEAM) |
| **Edit plant** | Dropdown menu → Edit | `PATCH /api/v1/plants/[id]` | Existing plant | Full access (requires CFO or CXO_TEAM) |
| **Delete plant** | Dropdown menu → Delete | `DELETE /api/v1/plants/[id]` | Existing plant | Full access (requires CFO or CXO_TEAM) |
| **Search plants** | Search input | Client-side filter | None | N/A |

**Notes**:
- Plant operations require CFO or CXO_TEAM role
- Deleting a plant may fail if it has associated audits/observations (database constraints)

---

### 4.2 Audits Page (`/audits`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **View audits** | Table listing | `GET /api/v1/audits` | None | See all audits (no filtering) |
| **Create audit** | "Create Audit" button → Dialog | `POST /api/v1/audits` | Valid plant, optional audit head & auditors | Full access (requires CFO or CXO_TEAM) |
| **Open audit** | "Open" button | Navigate to `/audits/[auditId]` | None | Full access |
| **Lock audit** | Lock icon button | `POST /api/v1/audits/[id]/lock` | Audit not completed | Full access (requires CFO or CXO_TEAM) |
| **Unlock audit** | Unlock icon button | `POST /api/v1/audits/[id]/unlock` | Audit locked | Full access (requires CFO or CXO_TEAM) |
| **Complete audit** | (Not visible in audits page) | `POST /api/v1/audits/[id]/complete` | Audit open | Full access (requires CFO or CXO_TEAM) |
| **Export summary** | "Export summary" link | Navigate to `/reports` | None | N/A |

**Notes**:
- Audit creation requires selecting plant, audit head, and auditors
- Lock/unlock operations are immediate and toggle the audit state
- CFO can lock/unlock even completed audits (though UI may hide button)

---

### 4.3 Observations Page (`/observations`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **View observations** | Table with filters | `GET /api/v1/observations` | None | See all observations (no role filtering) |
| **Create observation** | "Create Observation" button → Dialog | `POST /api/v1/observations` | Valid audit | Full access (requires CFO, AUDIT_HEAD, or AUDITOR) |
| **Filter observations** | Filter dropdowns | Client-side + API | None | N/A |
| **Search observations** | Search input | `GET /api/v1/observations?q=...` | None | N/A |
| **Reset filters** | "Reset Filters" button | Client-side | None | N/A |
| **Export CSV** | "Export CSV" button | `GET /api/v1/observations/export` | None | Full data access |
| **Select all** | Checkbox in header | Client-side | None | Selects all visible rows |
| **Bulk approve** | "Approve" button (bulk toolbar) | `POST /api/v1/observations/bulk-approve` | Observations selected, SUBMITTED status | **CFO can approve any observation** |
| **Bulk reject** | "Reject" button (bulk toolbar) | `POST /api/v1/observations/bulk-reject` | Observations selected, SUBMITTED status | **CFO can reject any observation** |
| **Bulk publish** | "Publish" button (bulk toolbar) | `POST /api/v1/observations/bulk-publish` | Observations selected, APPROVED status | **CFO can publish any observation (ignores lock state)** |
| **Bulk unpublish** | "Unpublish" button (bulk toolbar) | `POST /api/v1/observations/bulk-unpublish` | Observations selected | **CFO can unpublish any observation (ignores lock state)** |
| **Open observation** | "Open →" link | Navigate to `/observations/[id]` | None | Full access |

**Notes**:
- Bulk actions are only visible to CFO and AUDIT_HEAD roles
- Audit heads have restrictions (must own audit, audit must be unlocked), but **CFO bypasses these**
- Bulk operations validate each observation individually and report validation errors

---

### 4.4 Observation Detail Page (`/observations/[id]`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **View observation** | Full observation details | `GET /api/v1/observations/[id]` | Observation exists | Full access |
| **Edit observation** | Inline fields or edit form | `PATCH /api/v1/observations/[id]` | Observation in DRAFT or role-appropriate state | **CFO can edit any field regardless of lock/approval status** |
| **Submit for approval** | "Submit" button | `POST /api/v1/observations/[id]/submit` | Observation in DRAFT | Full access |
| **Approve observation** | "Approve" button | `POST /api/v1/observations/[id]/approve` | Observation in SUBMITTED | **CFO can approve without being audit head** |
| **Reject observation** | "Reject" button | `POST /api/v1/observations/[id]/reject` | Observation in SUBMITTED | **CFO can reject without being audit head** |
| **Publish observation** | "Publish" button | `POST /api/v1/observations/[id]/publish` | Observation APPROVED | **CFO can publish (ignores audit lock)** |
| **Unpublish observation** | "Unpublish" button | `POST /api/v1/observations/[id]/publish` (published=false) | Observation published | **CFO can unpublish (ignores audit lock)** |
| **Add attachments** | Upload button | `POST /api/v1/observations/[id]/attachments` | Observation exists | Full access |
| **Delete attachments** | Delete button | `DELETE /api/v1/observations/[id]/attachments/[attachmentId]` | Attachment exists | Full access |
| **Create action plan** | "Add Action Plan" button | `POST /api/v1/observations/[id]/actions` | Observation exists | Full access |
| **Edit action plan** | Edit form | `PATCH /api/v1/observations/[id]/actions/[actionId]` | Action plan exists | Full access |
| **Delete action plan** | Delete button | `DELETE /api/v1/observations/[id]/actions/[actionId]` | Action plan exists | Full access |
| **Add running note** | Note input + submit | `POST /api/v1/observations/[id]/notes` | Observation exists | Full access |
| **Assign auditee** | "Assign Auditee" button | `POST /api/v1/observations/[id]/assign-auditee` | Observation exists | Full access (requires CFO or AUDIT_HEAD) |
| **Create change request** | "Request Change" button | `POST /api/v1/observations/[id]/change-requests` | Observation exists | Full access |
| **Approve change request** | "Approve" button on CR | `POST /api/v1/observations/[id]/change-requests/[crId]` (status=APPROVED) | Change request pending | Full access |
| **Deny change request** | "Deny" button on CR | `POST /api/v1/observations/[id]/change-requests/[crId]` (status=DENIED) | Change request pending | Full access |
| **Update retest result** | Retest form | `PATCH /api/v1/observations/[id]/retest` | Observation has action plans | Full access |

**Notes**:
- CFO bypasses audit lock restrictions that limit AUDIT_HEAD
- CFO bypasses ownership checks (can approve observations from any audit)
- All observation operations log audit events

---

### 4.5 Reports Page (`/reports`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **View overview KPIs** | Stat cards | `GET /api/v1/reports/overview?days=14` | None | Full access to all data |
| **View target reports** | Overdue/Due Soon tables | `GET /api/v1/reports/targets?days=14` | None | Full access to all data |
| **Apply filters** | Filter dropdowns | API with query params | None | N/A |
| **Reset filters** | "Reset filters" button | Client-side | None | N/A |
| **Save preset** | "Save preset" button | localStorage | None | N/A |
| **Load preset** | "Load preset" button | localStorage | None | N/A |
| **Adjust due window** | Days input | Client-side + API | None | N/A |
| **Download period report** | "Download period report" button | `GET /api/v1/reports/period/export` | None | Full data export (Excel) |
| **Download retest report** | "Download retest report" button | `GET /api/v1/reports/retest/export` | None | Full data export (Excel) |
| **Refresh data** | "Refresh data" button | Re-fetch APIs | None | N/A |

**Notes**:
- Reports respect filters applied (plant, audit, risk, process, status, published, date range)
- Exports generate Excel files with all matching observations
- Due window controls "Due Soon" threshold (default 14 days)

---

### 4.6 User Management Page (`/admin/users`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **View active users** | User list card | `GET /api/v1/users` | None | See all active users |
| **Invite user** | Invite form → "Generate Invite Link" button | `POST /api/v1/auth/invite` | Valid email, role, expiry | **CFO can invite CXO_TEAM and AUDIT_HEAD** (CXO_TEAM cannot) |
| **Copy invite link** | "Copy" button | Client-side clipboard | Invite created | N/A |

**Notes**:
- CFO can invite users with roles: GUEST, AUDITEE, AUDITOR, CXO_TEAM, AUDIT_HEAD
- CXO_TEAM can only invite GUEST, AUDITEE, AUDITOR (not CXO_TEAM or AUDIT_HEAD)
- Invite expiry defaults to 7 days (1-30 days allowed)
- Invited users receive a token URL to set up their account

---

### 4.7 Data Import Page (`/admin/import`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **Download template** | "Download Template" button | `GET /api/v1/import/template` | None | Download Excel template |
| **Upload Excel file** | File upload component | `POST /api/v1/import/excel` | Valid .xlsx file | **CFO Only** - Bulk import plants, audits, observations |

**Notes**:
- Import page is **CFO-only** (enforced at page level and API level)
- Excel file must have sheets: Plants, Audits, Observations
- Import validates and reports errors before committing data

---

### 4.8 AI Assistant Page (`/ai`)

| Action | UI Element | API Endpoint | Prerequisites | CFO-Specific Behavior |
|--------|-----------|--------------|---------------|----------------------|
| **View chat sessions** | Sidebar list | `GET /api/v1/ai/sessions` | None | Full access |
| **Create new chat** | "New Chat" button | `POST /api/v1/ai/sessions` | None | Full access |
| **Send message** | Chat input + Send | `POST /api/v1/ai/chat` | Active session | Full access (can query all data) |
| **Search conversations** | Search input | Client-side filter | None | N/A |
| **Delete chat** | Delete button | `DELETE /api/v1/ai/sessions/[sessionId]` | Session exists | Full access |
| **Clear chat** | "Clear" button | `POST /api/v1/ai/sessions/[sessionId]/clear` | Session exists | Full access |

**Notes**:
- AI Assistant is blocked for AUDITEE and GUEST roles (they are redirected)
- CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR have access
- AI has access to user's role context for scoped queries

---

## 5. Test Scenarios

### Priority Levels
- **P0 (Critical)**: Core CFO functionality, must work
- **P1 (Important)**: Key features, should work
- **P2 (Nice-to-have)**: Edge cases, good to verify

---

### Test Scenario 1: CFO Login and Dashboard Access
**Priority**: P0
**Page**: `/login` → `/dashboard`
**Prerequisites**: Database seeded with `npm run db:seed`
**Steps**:
1. Navigate to http://localhost:3005/login
2. Enter email: `cfo@example.com`
3. Enter password: `cfo123`
4. Click "Sign In"
5. Verify redirect to `/dashboard`
6. Verify session establishes correctly

**Expected**:
- Successful login
- Redirects to dashboard home page
- User role displayed as CFO in session
- No errors in console

**API Call**: `POST /api/auth/callback/credentials`

---

### Test Scenario 2: View and Search All Plants
**Priority**: P1
**Page**: `/plants`
**Prerequisites**: At least 3 plants in database
**Steps**:
1. Login as CFO
2. Navigate to `/plants`
3. Verify all plants are visible with statistics (audits, observations)
4. Use search input to filter plants by code or name
5. Clear search and verify all plants reappear

**Expected**:
- All plants displayed with stats cards
- Search filters plants correctly (case-insensitive)
- Statistics show total audits, active audits, completed audits, observation counts by risk

**API Call**: `GET /api/v1/plants?withStats=1`

---

### Test Scenario 3: Create New Plant
**Priority**: P0
**Page**: `/plants`
**Prerequisites**: None
**Steps**:
1. Login as CFO
2. Navigate to `/plants`
3. Click "Create Plant" button
4. Enter Plant Code: `TEST-001`
5. Enter Plant Name: `Test Manufacturing Plant`
6. Click "Create Plant"
7. Verify success toast appears
8. Verify new plant appears in list

**Expected**:
- Dialog opens with form
- Submission creates plant successfully
- Plant appears in list immediately
- Audit trail logged for CREATE_PLANT action

**API Call**: `POST /api/v1/plants`

---

### Test Scenario 4: Edit Existing Plant
**Priority**: P1
**Page**: `/plants`
**Prerequisites**: At least 1 plant exists
**Steps**:
1. Login as CFO
2. Navigate to `/plants`
3. Click dropdown menu (three dots) on a plant card
4. Select "Edit"
5. Change Plant Name to `Updated Plant Name`
6. Click "Save Changes"
7. Verify success toast and updated name in list

**Expected**:
- Edit dialog opens with pre-filled values
- Submission updates plant successfully
- Changes reflect immediately in list

**API Call**: `PATCH /api/v1/plants/[id]`

---

### Test Scenario 5: Delete Plant
**Priority**: P2
**Page**: `/plants`
**Prerequisites**: At least 1 plant with no associated audits
**Steps**:
1. Login as CFO
2. Navigate to `/plants`
3. Click dropdown menu on a plant card
4. Select "Delete"
5. Confirm deletion in alert dialog
6. Verify success toast and plant removed from list

**Expected**:
- Confirmation dialog appears
- Plant deleted successfully
- Plant removed from list immediately

**API Call**: `DELETE /api/v1/plants/[id]`

**Note**: Deletion will fail if plant has associated audits/observations (database constraint)

---

### Test Scenario 6: Create New Audit with Assignments
**Priority**: P0
**Page**: `/audits`
**Prerequisites**: At least 1 plant, 1 audit head user, 1 auditor user
**Steps**:
1. Login as CFO
2. Navigate to `/audits`
3. Click "Create Audit" button
4. Select Plant from dropdown
5. Enter Title: `Q4 2024 Compliance Audit`
6. Enter Purpose: `Quarterly compliance review`
7. Select Visit Start Date: `2024-12-01`
8. Select Visit End Date: `2024-12-15`
9. Select Audit Head from dropdown
10. Select 1+ Auditors from multi-select
11. Click "Create Audit"
12. Verify success toast and new audit in list

**Expected**:
- Dialog opens with form
- Audit created with all selected fields
- Assignments created for auditors
- Audit appears in list with progress 0/0

**API Call**: `POST /api/v1/audits`

---

### Test Scenario 7: Lock and Unlock Audit
**Priority**: P0
**Page**: `/audits`
**Prerequisites**: At least 1 unlocked audit (not completed)
**Steps**:
1. Login as CFO
2. Navigate to `/audits`
3. Locate an unlocked audit (shows Unlock icon)
4. Click Lock icon button
5. Verify success toast "Audit locked successfully!"
6. Verify badge changes to "Locked" (orange)
7. Click Lock icon again (now Unlock icon)
8. Verify success toast "Audit unlocked successfully!"
9. Verify badge changes to "Unlocked" (blue)

**Expected**:
- Lock toggles successfully
- UI updates immediately
- CFO can lock/unlock regardless of audit state

**API Calls**:
- `POST /api/v1/audits/[id]/lock`
- `POST /api/v1/audits/[id]/unlock`

---

### Test Scenario 8: Create Observation
**Priority**: P0
**Page**: `/observations`
**Prerequisites**: At least 1 audit exists
**Steps**:
1. Login as CFO
2. Navigate to `/observations`
3. Click "Create Observation" button
4. Select Audit from dropdown
5. Enter Observation Text: `Incomplete documentation for vendor invoices`
6. Select Risk Category: `B`
7. Select Process: `P2P`
8. Enter Auditor Person: `John Doe`
9. Click "Create Observation"
10. Verify success toast and new observation in list

**Expected**:
- Dialog opens with form
- Observation created in DRAFT status
- Observation appears in list with correct filters

**API Call**: `POST /api/v1/observations`

---

### Test Scenario 9: Approve Observation (CFO Override)
**Priority**: P0
**Page**: `/observations/[id]`
**Prerequisites**: 1 observation in SUBMITTED status from an audit CFO doesn't lead
**Steps**:
1. Login as CFO
2. Navigate to observation detail page
3. Verify observation is in SUBMITTED status
4. Verify CFO is NOT the audit head for this audit
5. Click "Approve" button
6. Optionally enter comment
7. Click confirm
8. Verify success toast
9. Verify approval status changes to APPROVED

**Expected**:
- **CFO can approve without being audit head** (short-circuit)
- Approval status updates to APPROVED
- Approval record created in database
- Audit trail logged

**API Call**: `POST /api/v1/observations/[id]/approve`

---

### Test Scenario 10: Publish Observation with Locked Audit (CFO Override)
**Priority**: P0
**Page**: `/observations/[id]`
**Prerequisites**: 1 APPROVED observation in a LOCKED audit
**Steps**:
1. Login as CFO
2. Ensure audit is locked (lock it if needed)
3. Navigate to APPROVED observation detail page
4. Click "Publish" button
5. Confirm action
6. Verify success toast
7. Verify observation is now published

**Expected**:
- **CFO can publish even if audit is locked** (short-circuit)
- isPublished flag set to true
- Audit trail logged
- WebSocket notification sent

**API Call**: `POST /api/v1/observations/[id]/publish` (published=true)

---

### Test Scenario 11: Bulk Approve Observations
**Priority**: P1
**Page**: `/observations`
**Prerequisites**: At least 3 observations in SUBMITTED status
**Steps**:
1. Login as CFO
2. Navigate to `/observations`
3. Filter to show only SUBMITTED observations
4. Check "Select All" checkbox in table header
5. Verify bulk toolbar appears
6. Click "Approve" button
7. Verify success toast with count
8. Verify all selected observations now show APPROVED status

**Expected**:
- Bulk toolbar visible to CFO
- All selected observations approved in batch
- Validation errors reported if any observation can't be approved
- Success count displayed

**API Call**: `POST /api/v1/observations/bulk-approve`

---

### Test Scenario 12: Bulk Publish Observations with Mixed Audits (CFO Override)
**Priority**: P1
**Page**: `/observations`
**Prerequisites**: 2+ APPROVED observations from different audits (some locked, some unlocked)
**Steps**:
1. Login as CFO
2. Navigate to `/observations`
3. Filter to show only APPROVED observations
4. Select 2+ observations (mix locked and unlocked audits)
5. Click "Publish" button
6. Verify success toast with count
7. Verify all selected observations are now published

**Expected**:
- **CFO can publish observations even from locked audits** (short-circuit)
- Bulk operation succeeds for all selected
- No "audit is locked" errors for CFO
- Success count matches selection count

**API Call**: `POST /api/v1/observations/bulk-publish`

---

### Test Scenario 13: Invite CXO_TEAM User (CFO-Only)
**Priority**: P1
**Page**: `/admin/users`
**Prerequisites**: None
**Steps**:
1. Login as CFO
2. Navigate to `/admin/users`
3. Enter email: `newcxo@example.com`
4. Select Role: `CXO Team`
5. Set Expiry: `7` days
6. Click "Generate Invite Link"
7. Verify success toast
8. Verify invite token displayed
9. Click "Copy" button
10. Verify clipboard contains full invite URL

**Expected**:
- **CFO can invite CXO_TEAM role** (CXO_TEAM cannot invite this role)
- Invite token generated
- Invite link copyable
- GuestInvite record created with expiry

**API Call**: `POST /api/v1/auth/invite`

---

### Test Scenario 14: Invite AUDIT_HEAD User (CFO-Only)
**Priority**: P1
**Page**: `/admin/users`
**Prerequisites**: None
**Steps**:
1. Login as CFO
2. Navigate to `/admin/users`
3. Enter email: `newhead@example.com`
4. Select Role: `Audit Head`
5. Set Expiry: `14` days
6. Click "Generate Invite Link"
7. Verify success toast and invite token

**Expected**:
- **CFO can invite AUDIT_HEAD role** (CXO_TEAM cannot invite this role)
- Invite token generated successfully
- Invite expires in 14 days

**API Call**: `POST /api/v1/auth/invite`

---

### Test Scenario 15: Access Data Import Page (CFO-Only)
**Priority**: P1
**Page**: `/admin/import`
**Prerequisites**: None
**Steps**:
1. Login as CFO
2. Navigate to `/admin/import`
3. Verify page loads without access denied error
4. Verify "Download Template" button visible
5. Click "Download Template"
6. Verify Excel file downloads

**Expected**:
- Page accessible (CFO-only check passes)
- Template download works
- Upload component visible

**API Call**: `GET /api/v1/import/template`

---

### Test Scenario 16: Upload Excel Import (CFO-Only)
**Priority**: P2
**Page**: `/admin/import`
**Prerequisites**: Valid Excel template with sample data
**Steps**:
1. Login as CFO
2. Navigate to `/admin/import`
3. Click upload component
4. Select valid .xlsx file with Plants, Audits, Observations sheets
5. Verify validation messages appear
6. Confirm import if validation passes
7. Verify success message

**Expected**:
- File uploads successfully
- Validation runs and reports errors/warnings
- Data imported if valid
- Audit trail logged for each entity

**API Call**: `POST /api/v1/import/excel`

---

### Test Scenario 17: View All Reports with Filters
**Priority**: P1
**Page**: `/reports`
**Prerequisites**: Multiple observations across different plants/audits
**Steps**:
1. Login as CFO
2. Navigate to `/reports`
3. Verify overview KPIs load (Total, Pending, Overdue, Due Soon)
4. Apply filter: Select Plant from dropdown
5. Apply filter: Select Risk Category `A`
6. Apply filter: Select Status `PENDING_MR`
7. Click "Refresh data"
8. Verify KPIs update based on filters
9. Verify overdue/due soon tables update

**Expected**:
- KPIs display correctly
- Filters apply to data
- Tables update with filtered results
- CFO sees all data (no role-based filtering)

**API Calls**:
- `GET /api/v1/reports/overview?days=14&plantId=...&risk=A&status=PENDING_MR`
- `GET /api/v1/reports/targets?days=14&plantId=...&risk=A&status=PENDING_MR`

---

### Test Scenario 18: Export Period Report
**Priority**: P1
**Page**: `/reports`
**Prerequisites**: At least 5 observations
**Steps**:
1. Login as CFO
2. Navigate to `/reports`
3. Apply filters (e.g., select plant, date range)
4. Click "Download period report" button
5. Verify success toast
6. Verify Excel file downloads
7. Open Excel file and verify data matches filters

**Expected**:
- Excel file downloads with .xlsx extension
- Contains all observations matching filters
- Includes columns: Plant, Audit, Observation, Risk, Status, etc.
- Data is complete and accurate

**API Call**: `GET /api/v1/reports/period/export?plantId=...&startDate=...&endDate=...`

---

### Test Scenario 19: Export Retest Report
**Priority**: P1
**Page**: `/reports`
**Prerequisites**: At least 3 observations with action plans and retest data
**Steps**:
1. Login as CFO
2. Navigate to `/reports`
3. Apply filters (e.g., risk category)
4. Click "Download retest report" button
5. Verify success toast
6. Verify Excel file downloads
7. Open Excel and verify retest data present

**Expected**:
- Excel file downloads
- Contains action plans with retest status
- Includes columns: Plant, Observation, Plan, Target Date, Retest Result
- Data matches filters

**API Call**: `GET /api/v1/reports/retest/export?risk=B`

---

### Test Scenario 20: AI Assistant Chat Query
**Priority**: P2
**Page**: `/ai`
**Prerequisites**: At least 5 observations in database
**Steps**:
1. Login as CFO
2. Navigate to `/ai`
3. Click "New Chat" button
4. Enter query: `How many observations do I have with risk category A?`
5. Click Send
6. Wait for AI response
7. Verify response contains accurate count
8. Ask follow-up: `Which audits have the most Category A observations?`
9. Verify response

**Expected**:
- Chat session created
- AI responds with accurate data from database
- CFO has access to all observations for queries
- Chat history persists

**API Calls**:
- `POST /api/v1/ai/sessions`
- `POST /api/v1/ai/chat`

---

## 6. Execution Plan

### 6.1 Test Credentials

```
Email: cfo@example.com
Password: cfo123
```

**Setup**: Run `npm run db:seed` before testing to populate database with:
- CFO user account
- Sample plants, audits, observations
- Other role users (CXO, Audit Head, Auditor, Auditee, Guest)

---

### 6.2 Data Dependencies

**Existing Data Required**:
- At least 3 plants with different codes
- At least 5 audits (mix of statuses: PLANNED, IN_PROGRESS, SUBMITTED)
- At least 10 observations (mix of statuses: DRAFT, SUBMITTED, APPROVED, REJECTED)
- At least 1 audit with locked status
- At least 3 observations in SUBMITTED status (for approval testing)
- At least 3 APPROVED observations (for publish testing)
- At least 1 audit with observations assigned to different audit heads
- At least 1 audit head user (for assignment testing)
- At least 2 auditor users (for assignment testing)
- At least 1 auditee user (for auditee assignment testing)

**Fresh Data Creation**:
- Test scenarios 3, 6, 8 create new plants, audits, observations
- Use these for testing CRUD operations without affecting existing data

---

### 6.3 Execution Order

**Phase 1: Authentication & Basic Access** (15 min)
- Scenario 1: CFO Login and Dashboard Access
- Verify all dashboard pages are accessible

**Phase 2: Plant Management** (20 min)
- Scenario 2: View and Search All Plants
- Scenario 3: Create New Plant
- Scenario 4: Edit Existing Plant
- Scenario 5: Delete Plant (optional, may fail due to constraints)

**Phase 3: Audit Management** (30 min)
- Scenario 6: Create New Audit with Assignments
- Scenario 7: Lock and Unlock Audit
- Verify CFO can modify locked audits (create observations in locked audit)

**Phase 4: Observation CRUD** (20 min)
- Scenario 8: Create Observation
- Edit observation details (risk, process, text)
- Verify CFO can edit any observation field

**Phase 5: Approval Workflow (CFO Override)** (30 min)
- Scenario 9: Approve Observation (CFO Override)
- Scenario 10: Publish Observation with Locked Audit (CFO Override)
- Reject an observation (similar to approve)
- Unpublish a published observation

**Phase 6: Bulk Operations** (25 min)
- Scenario 11: Bulk Approve Observations
- Scenario 12: Bulk Publish Observations with Mixed Audits (CFO Override)
- Bulk Reject observations
- Bulk Unpublish observations

**Phase 7: User Management (CFO-Only)** (20 min)
- Scenario 13: Invite CXO_TEAM User (CFO-Only)
- Scenario 14: Invite AUDIT_HEAD User (CFO-Only)
- Invite other roles (GUEST, AUDITEE, AUDITOR)

**Phase 8: Data Import (CFO-Only)** (20 min)
- Scenario 15: Access Data Import Page (CFO-Only)
- Scenario 16: Upload Excel Import (CFO-Only)

**Phase 9: Reports & Exports** (30 min)
- Scenario 17: View All Reports with Filters
- Scenario 18: Export Period Report
- Scenario 19: Export Retest Report

**Phase 10: AI Assistant** (15 min)
- Scenario 20: AI Assistant Chat Query

**Total Estimated Time**: ~3.5 hours

---

### 6.4 Success Criteria

**Pass Criteria**:
- ✅ All P0 scenarios pass without errors
- ✅ CFO can access all pages without 403 Forbidden errors
- ✅ CFO bypasses audit lock restrictions (scenarios 10, 12)
- ✅ CFO bypasses ownership checks (scenario 9)
- ✅ CFO can invite CXO_TEAM and AUDIT_HEAD roles (scenarios 13, 14)
- ✅ CFO can access data import page and upload files (scenarios 15, 16)
- ✅ Bulk operations work for CFO regardless of audit state (scenarios 11, 12)
- ✅ All CRUD operations work (create, edit, delete plants/audits/observations)
- ✅ All exports generate correct data (reports, CSV)

**Fail Criteria**:
- ❌ CFO encounters 403 Forbidden on any page
- ❌ CFO blocked by audit lock when editing/publishing
- ❌ CFO blocked by ownership check when approving
- ❌ CFO cannot invite CXO_TEAM or AUDIT_HEAD
- ❌ CFO cannot access data import page
- ❌ Bulk operations fail for locked audits
- ❌ Any P0 scenario fails

**Known Limitations**:
- Plant deletion may fail if plant has associated audits (database constraint)
- Excel import may fail if file format is invalid (expected validation)
- AI Assistant responses depend on AI service availability

---

## 7. Additional Notes

### 7.1 CFO vs Other Roles

| Operation | CFO | CXO_TEAM | AUDIT_HEAD | AUDITOR | AUDITEE | GUEST |
|-----------|-----|----------|------------|---------|---------|-------|
| Manage plants | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create audits | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lock/unlock audits | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create observations | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve observations | ✅ (any audit) | ❌ | ✅ (own audits) | ❌ | ❌ | ❌ |
| Publish observations | ✅ (ignore locks) | ❌ | ✅ (unlocked audits) | ❌ | ❌ | ❌ |
| Invite CXO_TEAM | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invite AUDIT_HEAD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Data import | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Modify locked audits | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 7.2 CFO Short-Circuit Verification

To verify CFO short-circuit behavior, test:
1. Approve observation from audit CFO doesn't lead (scenario 9)
2. Publish observation in locked audit (scenario 10)
3. Bulk publish observations from locked audits (scenario 12)
4. Edit observation in locked audit
5. Delete observation in locked audit

All should succeed for CFO without permission errors.

### 7.3 Audit Trail

CFO actions are logged in `AuditEvent` table:
- Entity types: USER, AUDIT, OBSERVATION, ATTACHMENT, APPROVAL, ACTION_PLAN, PLANT
- Actions: CREATE, UPDATE, DELETE, APPROVE, REJECT, PUBLISH, UNPUBLISH, LOGIN
- Each event includes: actorId (CFO user ID), timestamp, diff (changes)

Verify audit trail by querying:
```sql
SELECT * FROM "AuditEvent"
WHERE "actorId" = '<cfo-user-id>'
ORDER BY "createdAt" DESC
LIMIT 20;
```

### 7.4 WebSocket Real-Time Updates

CFO operations trigger WebSocket broadcasts:
- Observation updates (approval, rejection, publish, unpublish)
- Field lock changes
- Change request decisions

Verify by opening observation detail page in two browser windows (one as CFO, one as auditor) and performing actions. Changes should appear instantly.

---

## 8. Reference Documentation

- **RBAC Implementation**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac.ts`
- **Auth Configuration**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/auth.ts`
- **Database Schema**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/prisma/schema.prisma`
- **Scope Utilities**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/scope.ts`
- **Project Overview**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/CLAUDE.md`

---

**End of CFO Testing Plan**
