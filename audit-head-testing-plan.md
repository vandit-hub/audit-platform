# AUDIT_HEAD Role - Comprehensive Testing Plan

## 1. Role Capabilities Summary

### Primary Capabilities
The **AUDIT_HEAD** role is a senior auditor role with both auditing and approval authority. Key characteristics:

1. **Dual Role Nature**: AUDIT_HEAD inherits ALL capabilities of the AUDITOR role (can create and edit observations)
2. **Approval Authority**: Can approve/reject observations for audits they lead
3. **Publication Control**: Can publish/unpublish approved observations for their audits
4. **Deletion Rights**: Can delete observations from their audits (when unlocked)
5. **Change Request Authority**: Can approve/deny change requests on locked observations
6. **Audit Assignment**: Designated as `auditHeadId` on specific audits by CFO/CXO_TEAM

### Permission Functions (from rbac.ts)
- `isAuditHead(role)` - Boolean check for AUDIT_HEAD role
- `assertAuditHead(role)` - Throws 403 if not AUDIT_HEAD or CFO
- `assertAuditorOrAuditHead(role)` - For operations requiring auditor capabilities
- `canAuthorObservations(role)` - Returns true for AUDIT_HEAD
- `canApproveObservations(role)` - Returns true for AUDIT_HEAD
- `isAuditorOrAuditHead(role)` - Returns true for AUDIT_HEAD

### Key Authorization Rules
1. **CFO Short-Circuit**: CFO bypasses ALL AUDIT_HEAD restrictions (can perform any AUDIT_HEAD action)
2. **Audit Ownership**: AUDIT_HEAD can only approve/reject/publish/delete observations for audits where they are the designated `auditHeadId`
3. **Assignment Fallback**: AUDIT_HEAD can also access audits where they have a regular `AuditAssignment` (as auditor)
4. **Lock Respect**: AUDIT_HEAD must respect audit locks (cannot approve/reject/publish/delete when locked, except via change requests)
5. **Dual Capabilities**: When assigned to an audit (either as head OR auditor), they can create/edit observations like any auditor

### Special Behaviors
- Can edit observations in DRAFT/REJECTED state (auditor capability)
- Can edit `currentStatus` field even on APPROVED observations (unique to audit head)
- Bulk operations require audit head ownership for ALL selected observations
- Can view observations from audits they lead OR audits where they're assigned
- Access to AI Assistant (unlike AUDITEE/GUEST)

### Scope Restrictions
- **No Scope Restrictions**: Unlike GUEST role, AUDIT_HEAD has no scope-based filtering
- Can see all observations for audits they lead or are assigned to
- Published filter only applied if user explicitly selects it

## 2. Accessible Pages

### Full Access Pages
1. **Dashboard** - `/dashboard` - Home page with overview stats
2. **Observations List** - `/observations` - View all observations with filters, create new observations, bulk approve/reject/publish/unpublish
3. **Observation Detail** - `/observations/[id]` - View and edit observation details, approve, reject, publish, delete
4. **Audits List** - `/audits` - View audits (limited to assigned audits), cannot create/lock/unlock (read-only for audit management)
5. **Audit Detail** - `/audits/[auditId]` - View audit checklist and details
6. **Reports** - `/reports` - View KPIs, export reports, filter by various criteria
7. **Plants** - `/plants` - View plant list (read-only, cannot create)
8. **Checklists** - `/checklists` - View checklist items (read-only)
9. **AI Assistant** - `/ai` - Ask questions about observations, audits, and data

### Restricted/Inaccessible Pages
1. **Admin Users** - `/admin/users` - CFO/CXO_TEAM only (blocked by redirect if accessed)
2. **Admin Import** - `/admin/import` - CFO/CXO_TEAM only (blocked by redirect)

### Access Pattern
- Dashboard layout requires authentication (redirects to `/login` if not authenticated)
- Most pages accessible but some have read-only vs edit permissions based on ownership
- Create Audit button NOT visible (only CFO/CXO_TEAM can create audits)
- Lock/Unlock audit buttons NOT visible (only CFO/CXO_TEAM can manage locks)

## 3. Inaccessible Pages

### Hard Blocks (Redirect/403)
1. `/admin/users` - User invitation and management (CFO/CXO_TEAM only)
2. `/admin/import` - Bulk data import (CFO/CXO_TEAM only)

### Soft Blocks (UI Hidden)
- Audit creation dialog (Create Audit button hidden)
- Audit lock/unlock controls (buttons hidden on audits page)
- Plant creation (Create Plant button hidden)
- Checklist creation (Create Checklist button hidden)

### Notes
- AI Assistant page blocks AUDITEE and GUEST but allows AUDIT_HEAD
- All dashboard pages require authentication; unauthenticated users redirected to `/login`

## 4. Operation Matrix

| Page | Operations | API Endpoints | Prerequisites | RBAC Checks |
|------|-----------|---------------|---------------|-------------|
| **Observations List** | - View observations<br>- Create observation<br>- Bulk approve<br>- Bulk reject<br>- Bulk publish<br>- Bulk unpublish<br>- Export CSV | `GET /api/v1/observations`<br>`POST /api/v1/observations`<br>`POST /api/v1/observations/bulk-approve`<br>`POST /api/v1/observations/bulk-reject`<br>`POST /api/v1/observations/bulk-publish`<br>`POST /api/v1/observations/bulk-unpublish`<br>`GET /api/v1/observations/export` | - Must be assigned to audit (for create)<br>- Must be audit head for selected audits (for bulk ops)<br>- Audit must be unlocked (for bulk publish/unpublish) | `assertAuditorOrAuditHead` (create)<br>`assertAuditHead` (bulk ops)<br>Check `auditHeadId` match<br>Check `isLocked` false |
| **Observation Detail** | - View observation<br>- Edit observation fields<br>- Submit for approval<br>- Approve observation<br>- Reject observation<br>- Publish observation<br>- Unpublish observation<br>- Delete observation<br>- Add attachments<br>- Add notes<br>- Assign auditees<br>- Create action plans<br>- Create change request<br>- Decide change request | `GET /api/v1/observations/[id]`<br>`PATCH /api/v1/observations/[id]`<br>`POST /api/v1/observations/[id]/submit`<br>`POST /api/v1/observations/[id]/approve`<br>`POST /api/v1/observations/[id]/reject`<br>`POST /api/v1/observations/[id]/publish`<br>`DELETE /api/v1/observations/[id]`<br>`POST /api/v1/observations/[id]/attachments`<br>`POST /api/v1/observations/[id]/notes`<br>`POST /api/v1/observations/[id]/assign-auditee`<br>`POST /api/v1/observations/[id]/actions`<br>`POST /api/v1/observations/[id]/change-requests`<br>`POST /api/v1/observations/[id]/change-requests/[crId]` | - Must be audit head OR assigned to audit<br>- Audit unlocked (for approve/reject/delete/publish)<br>- Observation in correct status (SUBMITTED for approve, DRAFT/REJECTED for edit) | `isAuditHead` + check `auditHeadId`<br>`assertAuditorOrAuditHead` (edit/submit)<br>`assertAuditHead` (approve/reject/delete/publish/change request) |
| **Audits List** | - View assigned audits<br>- View audit progress | `GET /api/v1/audits` | - Returns audits where user is audit head OR has assignment | Filtered by `auditHeadId` or assignment |
| **Audit Detail** | - View audit checklist<br>- Mark checklist items complete | `GET /api/v1/audits/[id]`<br>`PATCH /api/v1/audits/[id]/items/[aciId]` | - Must be assigned to audit or be audit head | Check assignment or `auditHeadId` |
| **Reports** | - View KPIs<br>- Export period report<br>- Export retest report<br>- View target dates | `GET /api/v1/reports/overview`<br>`GET /api/v1/reports/period/export`<br>`GET /api/v1/reports/retest/export`<br>`GET /api/v1/reports/targets` | - None (can view all reports) | Role check only |
| **Plants** | - View plants list | `GET /api/v1/plants` | - None | Role check only |
| **Checklists** | - View checklists | `GET /api/v1/checklists` | - None | Role check only |
| **AI Assistant** | - Chat with AI<br>- Create sessions<br>- View history | `POST /api/v1/ai/chat`<br>`GET /api/v1/ai/sessions`<br>`POST /api/v1/ai/sessions` | - Not AUDITEE or GUEST | Block AUDITEE/GUEST in UI |

## 5. Test Scenarios (Prioritized)

### Critical Tests (Must Pass)

#### Test 1: Approve Observation as Audit Head
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - Logged in as audithead@example.com
  - Observation exists with `approvalStatus = SUBMITTED`
  - Observation belongs to audit where `auditHeadId = audithead user ID`
  - Audit is NOT locked
- **Steps**:
  1. Navigate to `/observations`
  2. Click "Open →" on a SUBMITTED observation for your audit
  3. Scroll to approval section
  4. Click "Approve" button
  5. Add optional comment "Approved - looks good"
  6. Confirm approval
- **Expected**:
  - Observation `approvalStatus` changes to `APPROVED`
  - Approval record created in database
  - Toast message: "Observation approved successfully"
  - Real-time update via WebSocket
  - Audit event logged
- **API Call**: `POST /api/v1/observations/[id]/approve`

#### Test 2: Reject Observation as Audit Head
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - Logged in as audithead@example.com
  - Observation with `approvalStatus = SUBMITTED` or `APPROVED`
  - Audit head for the observation's audit
  - Audit NOT locked
- **Steps**:
  1. Navigate to observation detail page
  2. Click "Reject" button
  3. Add comment "Needs more details on risk assessment"
  4. Confirm rejection
- **Expected**:
  - Observation `approvalStatus` changes to `REJECTED`
  - If was published, automatically unpublished (`isPublished = false`)
  - Toast success message
  - WebSocket notification sent
- **API Call**: `POST /api/v1/observations/[id]/reject`

#### Test 3: Bulk Approve Multiple Observations
- **Page**: `/observations`
- **Prerequisites**:
  - Multiple observations in SUBMITTED status
  - All belong to audits where user is audit head
  - All audits unlocked
- **Steps**:
  1. Navigate to `/observations`
  2. Select checkboxes for 3+ SUBMITTED observations from your audits
  3. Click "Approve" button in bulk action toolbar
  4. Confirm bulk approval
- **Expected**:
  - All selected observations change to `APPROVED`
  - Bulk action success message with count
  - All observations refresh in list
  - Selection cleared
- **API Call**: `POST /api/v1/observations/bulk-approve`

#### Test 4: Publish Approved Observation
- **Page**: `/observations/[id]` or `/observations` (bulk)
- **Prerequisites**:
  - Observation with `approvalStatus = APPROVED`
  - `isPublished = false`
  - User is audit head for the audit
  - Audit NOT locked
- **Steps**:
  1. Navigate to observation detail page
  2. Click "Publish" button
  3. Confirm publication
- **Expected**:
  - `isPublished` changes to `true`
  - Toast message: "Observation published successfully"
  - Audit event logged
- **API Call**: `POST /api/v1/observations/[id]/publish`

#### Test 5: Create Observation (Auditor Capability)
- **Page**: `/observations`
- **Prerequisites**:
  - User is assigned to at least one audit (as auditor or audit head)
  - Audit NOT locked
- **Steps**:
  1. Navigate to `/observations`
  2. Click "Create Observation" button
  3. Select audit from dropdown
  4. Fill in observation text: "Test observation for compliance check"
  5. Select risk category: A
  6. Select process: O2C
  7. Click "Create"
- **Expected**:
  - New observation created with `approvalStatus = DRAFT`
  - Redirects to observations list
  - Toast: "Observation created successfully"
  - New observation visible in list
- **API Call**: `POST /api/v1/observations`

#### Test 6: Delete Observation as Audit Head
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - Observation exists (any status)
  - User is audit head for the audit
  - Audit NOT locked
- **Steps**:
  1. Navigate to observation detail page
  2. Click "Delete" button
  3. Confirm deletion in dialog
- **Expected**:
  - Observation deleted from database (cascade delete)
  - Redirects to `/observations`
  - Toast: "Observation deleted successfully"
  - Audit event logged with observation snapshot
- **API Call**: `DELETE /api/v1/observations/[id]`

#### Test 7: Cannot Approve Observation for Non-Owned Audit
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - Observation from audit where user is NOT the audit head
  - Observation has `approvalStatus = SUBMITTED`
- **Steps**:
  1. Navigate to observation detail page (if accessible)
  2. Attempt to click "Approve" button (should be hidden/disabled)
  3. Or try direct API call via browser console
- **Expected**:
  - Approve button NOT visible in UI
  - If API called directly: 403 Forbidden
  - Error message: "Only the audit head for this audit can approve observations"
- **API Call**: `POST /api/v1/observations/[id]/approve` (should fail)

#### Test 8: Cannot Approve/Reject When Audit Locked
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - Observation from audit where user IS audit head
  - Audit `isLocked = true`
  - Observation in SUBMITTED status
- **Steps**:
  1. Navigate to observation detail page
  2. Check that Approve/Reject buttons are disabled or hidden
  3. Attempt to click if visible
- **Expected**:
  - Buttons disabled with tooltip explaining lock
  - If attempted: 403 error "Audit is locked. Cannot approve observation."
- **API Call**: `POST /api/v1/observations/[id]/approve` (should fail)

#### Test 9: Approve Change Request on Locked Observation
- **Page**: `/observations/[id]` (change requests section)
- **Prerequisites**:
  - Observation is APPROVED
  - Audit is LOCKED
  - Auditee created a change request
  - User is audit head
- **Steps**:
  1. Navigate to observation detail page
  2. Scroll to "Change Requests" section
  3. Review pending change request
  4. Click "Approve" on the change request
  5. Add decision comment: "Approved - valid correction"
- **Expected**:
  - Change request status changes to APPROVED
  - Observation fields updated with patch from change request
  - Toast: "Change request approved"
  - Audit event logged
- **API Call**: `POST /api/v1/observations/[id]/change-requests/[crId]`

#### Test 10: Bulk Publish Observations
- **Page**: `/observations`
- **Prerequisites**:
  - Multiple APPROVED observations (`isPublished = false`)
  - All from audits where user is audit head
  - All audits unlocked
- **Steps**:
  1. Select 3+ approved observations via checkboxes
  2. Click "Publish" in bulk action toolbar
  3. Confirm bulk publish
- **Expected**:
  - All selected observations `isPublished = true`
  - Success message with count
  - Table refreshes
- **API Call**: `POST /api/v1/observations/bulk-publish`

### Important Tests

#### Test 11: Edit Observation in DRAFT Status (Auditor Capability)
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - Observation in DRAFT status
  - User assigned to the audit
- **Steps**:
  1. Navigate to observation detail
  2. Edit "Observation Text" field
  3. Change risk category to B
  4. Click "Save"
- **Expected**:
  - Changes saved successfully
  - Toast confirmation
  - WebSocket update sent
- **API Call**: `PATCH /api/v1/observations/[id]`

#### Test 12: Submit Observation for Approval (Auditor Capability)
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - Observation in DRAFT status
  - User assigned to audit
  - Audit unlocked
- **Steps**:
  1. Navigate to draft observation
  2. Click "Submit for Approval" button
  3. Confirm submission
- **Expected**:
  - `approvalStatus` changes to `SUBMITTED`
  - Approval record created
  - Toast: "Observation submitted for approval"
- **API Call**: `POST /api/v1/observations/[id]/submit`

#### Test 13: Bulk Reject Observations
- **Page**: `/observations`
- **Prerequisites**:
  - Multiple SUBMITTED observations
  - All from user's audits
  - Audits unlocked
- **Steps**:
  1. Select 2+ submitted observations
  2. Click "Reject" in bulk toolbar
  3. Confirm rejection
- **Expected**:
  - All change to REJECTED
  - Auto-unpublished if any were published
  - Success message
- **API Call**: `POST /api/v1/observations/bulk-reject`

#### Test 14: View Observations Filtered by Audit
- **Page**: `/observations`
- **Prerequisites**: None
- **Steps**:
  1. Navigate to `/observations`
  2. Use "Audit" dropdown filter
  3. Select an audit where user is audit head
  4. Verify results
- **Expected**:
  - Only observations for selected audit shown
  - Count updated in results header
- **API Call**: `GET /api/v1/observations?auditId=[id]`

#### Test 15: Export Observations as CSV
- **Page**: `/observations`
- **Prerequisites**: Some observations exist
- **Steps**:
  1. Apply filters (optional)
  2. Click "Export CSV" button
  3. Check downloaded file
- **Expected**:
  - CSV file downloads
  - Contains filtered observations
  - Toast: "CSV export started!"
- **API Call**: `GET /api/v1/observations/export?[filters]`

#### Test 16: Add Attachment to Observation
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - User has edit access to observation
- **Steps**:
  1. Navigate to observation detail
  2. Click "Upload Annexure" or "Upload Management Doc"
  3. Select file (PDF, image, etc.)
  4. Upload
- **Expected**:
  - File uploaded to S3
  - Attachment record created
  - Visible in attachments list
- **API Call**: `POST /api/v1/observations/[id]/attachments/presign` then upload to S3

#### Test 17: Add Running Note to Observation
- **Page**: `/observations/[id]`
- **Prerequisites**: User can view observation
- **Steps**:
  1. Scroll to notes section
  2. Type note: "Follow up on risk mitigation plan"
  3. Select visibility: INTERNAL or ALL
  4. Click "Add Note"
- **Expected**:
  - Note saved
  - Appears in notes timeline
  - Toast confirmation
- **API Call**: `POST /api/v1/observations/[id]/notes`

#### Test 18: Assign Auditee to Observation
- **Page**: `/observations/[id]`
- **Prerequisites**:
  - User is audit head or has edit access
  - Auditee users exist in system
- **Steps**:
  1. Navigate to "Auditee Assignments" section
  2. Click "Assign Auditee"
  3. Select auditee from dropdown
  4. Confirm
- **Expected**:
  - ObservationAssignment created
  - Auditee now listed
  - Auditee can access observation
- **API Call**: `POST /api/v1/observations/[id]/assign-auditee`

#### Test 19: View Audit Details and Checklist
- **Page**: `/audits/[auditId]`
- **Prerequisites**: User is audit head for audit OR assigned to it
- **Steps**:
  1. Navigate to `/audits`
  2. Click "Open" on an audit
  3. View checklist items
  4. Mark a checklist item as DONE
- **Expected**:
  - Checklist visible
  - Progress bar updates
  - Item status saved
- **API Call**: `GET /api/v1/audits/[id]`, `PATCH /api/v1/audits/[id]/items/[aciId]`

#### Test 20: Use AI Assistant to Query Observations
- **Page**: `/ai`
- **Prerequisites**: Not AUDITEE or GUEST role
- **Steps**:
  1. Navigate to `/ai`
  2. Type question: "How many draft observations do I have?"
  3. Send message
  4. Review AI response
- **Expected**:
  - AI responds with count and details
  - Chat history saved
  - Can ask follow-up questions
- **API Call**: `POST /api/v1/ai/chat`

### Nice-to-Have Tests

#### Test 21: Bulk Unpublish Observations
- **Page**: `/observations`
- **Prerequisites**: Multiple published observations from user's audits
- **Steps**:
  1. Select published observations
  2. Click "Unpublish"
  3. Confirm
- **Expected**: All `isPublished = false`, success message
- **API Call**: `POST /api/v1/observations/bulk-unpublish`

#### Test 22: Create Action Plan on Observation
- **Page**: `/observations/[id]`
- **Prerequisites**: User has access to observation
- **Steps**:
  1. Navigate to action plans section
  2. Click "Add Action Plan"
  3. Fill plan details, owner, target date
  4. Save
- **Expected**: Action plan created and visible
- **API Call**: `POST /api/v1/observations/[id]/actions`

#### Test 23: View Reports KPIs
- **Page**: `/reports`
- **Prerequisites**: Some observations exist
- **Steps**:
  1. Navigate to `/reports`
  2. View KPI cards (total, by status, by risk, etc.)
  3. Apply filters
  4. Export period report
- **Expected**: KPIs display correctly, exports generate
- **API Call**: `GET /api/v1/reports/overview`, `GET /api/v1/reports/period/export`

#### Test 24: Cannot Access Admin Pages
- **Page**: `/admin/users`, `/admin/import`
- **Prerequisites**: Logged in as AUDIT_HEAD
- **Steps**:
  1. Attempt to navigate to `/admin/users`
- **Expected**: Redirected to `/` (dashboard) or see 403 error
- **API Call**: N/A (UI redirect)

#### Test 25: Session Timeout Handling
- **Page**: Any
- **Prerequisites**: Active session
- **Steps**:
  1. Stay idle for 15+ minutes (IDLE_TIMEOUT_MINUTES)
  2. Attempt to perform an action
- **Expected**: Redirected to login, session expired message
- **API Call**: N/A (session handling)

## 6. Execution Plan

### Test Credentials
```
Email: audithead@example.com
Password: audithead123
```

### Data Dependencies

#### Required Database State
After running `npm run db:seed`, verify the following data exists:

1. **Users**:
   - Audit Head user (audithead@example.com) with role `AUDIT_HEAD`
   - At least one CFO user for comparison
   - At least one Auditor user
   - At least one Auditee user

2. **Audits**:
   - At least 2 audits where `auditHeadId` matches the audit head user
   - At least 1 audit where audit head has an `AuditAssignment` (assigned as auditor)
   - At least 1 unlocked audit (`isLocked = false`)
   - At least 1 locked audit (`isLocked = true`) for lock tests

3. **Observations**:
   - 3+ observations in DRAFT status (for create/edit/submit tests)
   - 3+ observations in SUBMITTED status (for approve/reject tests)
   - 3+ observations in APPROVED status with `isPublished = false` (for publish tests)
   - 3+ observations in APPROVED status with `isPublished = true` (for unpublish tests)
   - At least 1 observation in a locked audit (for lock restriction tests)
   - At least 1 observation NOT from audit head's audits (for negative permission tests)
   - 1+ observation with pending change request

4. **Plants**: At least 2-3 plants for filtering tests

5. **Checklists**: At least 1 checklist linked to an audit

### Environment Setup
```bash
# 1. Ensure database is running
docker start audit-postgres
docker ps | grep audit-postgres

# 2. Apply migrations and seed data
cd /Users/vandit/Desktop/Projects/EZAudit/audit-platform
npx prisma migrate dev
npm run db:seed

# 3. Start development servers
# Terminal 1: Next.js app
npm run dev

# Terminal 2: WebSocket server
npm run ws:dev

# 4. Verify services
# - Next.js: http://localhost:3005
# - WebSocket: ws://localhost:3001
```

### Execution Order

#### Phase 1: Authentication & Access (5 minutes)
- Test 25: Session timeout handling
- Test 24: Cannot access admin pages
- Verify login with audit head credentials
- Verify dashboard loads

#### Phase 2: Core Approval Workflow (20 minutes)
- Test 1: Approve observation
- Test 2: Reject observation
- Test 8: Cannot approve when audit locked
- Test 7: Cannot approve for non-owned audit
- Test 9: Approve change request on locked observation

#### Phase 3: Bulk Operations (15 minutes)
- Test 3: Bulk approve observations
- Test 13: Bulk reject observations
- Test 10: Bulk publish observations
- Test 21: Bulk unpublish observations

#### Phase 4: Auditor Capabilities (15 minutes)
- Test 5: Create observation
- Test 11: Edit observation in DRAFT
- Test 12: Submit observation for approval
- Test 6: Delete observation

#### Phase 5: Publishing & Change Management (10 minutes)
- Test 4: Publish approved observation
- Test 9: Approve change request (if not done in Phase 2)

#### Phase 6: Supporting Features (20 minutes)
- Test 16: Add attachment
- Test 17: Add running note
- Test 18: Assign auditee
- Test 19: View audit details
- Test 22: Create action plan

#### Phase 7: Viewing & Filtering (15 minutes)
- Test 14: Filter observations by audit
- Test 15: Export observations CSV
- Test 23: View reports and KPIs
- Test 20: AI Assistant queries

### Testing Tools
- **Browser**: Chrome/Firefox with DevTools open
- **Network Tab**: Monitor API calls and responses
- **Console**: Check for JavaScript errors
- **Database Tool**: Prisma Studio (`npx prisma studio`) to verify data changes
- **WebSocket Inspector**: Browser DevTools → Network → WS tab to verify real-time updates

### Success Criteria

#### Must Pass (100%)
All Critical Tests (Tests 1-10) must pass without errors.

#### Should Pass (90%+)
At least 9 out of 10 Important Tests (Tests 11-20) should pass.

#### Nice to Have (70%+)
At least 3 out of 5 Nice-to-Have Tests (Tests 21-25) should pass.

#### Overall Success
- No 500 server errors
- No unauthorized 403 errors for valid operations
- Expected 403 errors for invalid operations (Tests 7, 8, 24)
- All bulk operations complete transactionally (all-or-nothing)
- WebSocket updates delivered in real-time
- Audit trail events logged for all state changes
- UI reflects database state accurately
- No console errors during normal operations
- Session management works correctly

### Known Limitations
1. **Audit Head Assignment**: Cannot self-assign as audit head (must be set by CFO/CXO_TEAM via audit creation/edit)
2. **Audit Management**: Cannot create, lock, unlock, or complete audits (CFO/CXO_TEAM only)
3. **Plant Management**: Cannot create or edit plants (CFO/CXO_TEAM only)
4. **User Management**: Cannot invite users or change roles (CFO/CXO_TEAM only)
5. **Lock Override**: Cannot override audit locks except via change request workflow
6. **Cross-Audit Operations**: Can only approve/reject/publish/delete observations from audits they lead
7. **Assignment Dependency**: Must have audit assignment (as head or auditor) to create observations for that audit

### Error Scenarios to Verify
1. Attempting to approve observation for non-owned audit → 403 "Only the audit head for this audit can approve"
2. Attempting to approve when audit locked → 403 "Audit is locked. Cannot approve observation."
3. Attempting to approve already approved observation → 400 "Observation is already approved"
4. Attempting to approve DRAFT observation → 400 "Cannot approve a draft observation. It must be submitted first."
5. Bulk operation with mixed ownership → Validation errors array with specific observation errors
6. Delete observation from locked audit → 403 "Audit is locked. Cannot delete observation."
7. Access admin pages → Redirect to `/` or 403

### Performance Benchmarks
- Observation list page load: < 2 seconds for 100 observations
- Bulk approve 10 observations: < 5 seconds
- CSV export with 100 observations: < 3 seconds
- WebSocket update delivery: < 500ms
- AI Assistant response: < 10 seconds (depends on query complexity)

### Reporting Template
For each test, document:
```
Test #: [Number and Name]
Status: [PASS / FAIL / BLOCKED / SKIP]
Execution Time: [seconds]
API Response Time: [ms]
Issues Found: [None / Description]
Screenshots: [If failure]
Database State: [Verified / Not Checked]
WebSocket Event: [Received / Not Received / N/A]
Notes: [Any observations]
```

### Post-Testing Verification
1. Check database integrity (no orphaned records)
2. Verify audit trail completeness (all actions logged)
3. Check for memory leaks (WebSocket connections closed)
4. Review server logs for errors
5. Confirm all test data can be cleaned up

---

## Summary

This testing plan covers **25 comprehensive test scenarios** for the AUDIT_HEAD role, prioritized into:
- **10 Critical tests** (approval, rejection, bulk operations, permissions)
- **10 Important tests** (editing, filtering, attachments, notes, AI)
- **5 Nice-to-have tests** (advanced features, edge cases)

The plan verifies both the **dual nature** of AUDIT_HEAD (auditor + approver capabilities) and the **ownership-based authorization** model (can only approve/publish/delete for audits they lead).

Key areas covered:
- ✅ Approval/rejection workflow
- ✅ Bulk operations
- ✅ Publishing control
- ✅ Observation creation and editing (auditor capabilities)
- ✅ Deletion rights
- ✅ Change request approval
- ✅ Lock restrictions
- ✅ Permission boundaries
- ✅ Real-time WebSocket updates
- ✅ Audit trail logging
- ✅ UI/UX verification
- ✅ AI Assistant access

Estimated total testing time: **2 hours** for full execution.
