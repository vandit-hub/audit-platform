# RBAC Task 6: QA and Sign-off

**Status**: In Progress
**Dependencies**: RBAC_TASK_1, RBAC_TASK_2, RBAC_TASK_3, RBAC_TASK_4, RBAC_TASK_5
**Document Reference**: RBAC_updated.md - Step 7

---

## Analysis

This task focuses on comprehensive end-to-end testing of the RBAC v2 implementation. The codebase analysis reveals:

- **Tasks 1-5 complete**: Schema migration done, API routes implemented (approve, reject, lock, unlock, complete, assign-auditee, visibility), RBAC helpers in place
- **Playwright installed**: Package.json shows Playwright v1.55.1 in dependencies
- **No existing E2E test structure**: No playwright.config.ts or test suites yet
- **Seed data available**: prisma/seed.ts creates users for all 5 roles with env-configured credentials
- **NextAuth v5**: Requires UI-based login (cannot use programmatic auth)
- **Dual-server architecture**: Next.js on port 3005, WebSocket on port 3001

**Testing approach:**
- Use Playwright for browser-based testing (UI login required for NextAuth v5)
- Test all permission matrix entries systematically
- Validate field-level permissions (auditor vs auditee fields)
- Test audit lock enforcement across all roles
- Verify visibility rules work correctly
- Test complete workflows (approval flow, auditee assignment, audit lifecycle)
- Test CFO override capabilities

---

## Subtasks

### 1. Test Infrastructure Setup

**Action**: Set up Playwright test infrastructure with configuration and authentication helpers

**Context**: Playwright is installed but no test configuration exists. We need a proper test setup with NextAuth v5 compatible authentication, database cleanup utilities, and shared helper functions.

**Acceptance**:
- [ ] `playwright.config.ts` created with browser configuration (chromium, firefox, webkit)
- [ ] Test directory structure created: `e2e/` with subdirectories for `auth/`, `fixtures/`, `helpers/`, `tests/`
- [ ] Authentication helper created (`e2e/helpers/auth.ts`) that performs UI-based login for each role
- [ ] Test data factory created (`e2e/fixtures/testData.ts`) for creating plants, audits, observations
- [ ] Database cleanup utility created (`e2e/helpers/dbCleanup.ts`) for resetting test data between runs
- [ ] Base test fixture created (`e2e/fixtures/base.ts`) with authenticated contexts for all 5 roles
- [ ] Environment variables documented for test user credentials
- [ ] npm script added: `"test:e2e": "playwright test"`

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/playwright.config.ts`
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/helpers/auth.ts`
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/helpers/dbCleanup.ts`
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/helpers/apiHelpers.ts`
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/fixtures/testData.ts`
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/fixtures/base.ts`

**Notes**:
- Use `page.goto('/login')`, `page.fill()`, `page.click()` for UI-based login
- Store authenticated contexts in fixtures for reuse
- Clean database using Prisma client directly (not through API)

---

### 2. User & Team Management Tests

**Action**: Test user and team management permissions across all roles

**Context**: CFO and CXO_TEAM should be able to manage users; other roles should be blocked or have limited visibility.

**Acceptance**:
- [ ] CFO can create, disable, and modify all users
- [ ] CXO_TEAM can create, disable, and modify all users
- [ ] AUDIT_HEAD can view own team members only
- [ ] AUDITOR can view own team members only
- [ ] AUDITEE cannot view team members
- [ ] Blocked roles receive 403 when attempting user management
- [ ] UI correctly shows/hides user management navigation and controls

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/users.spec.ts`

**API Endpoints**:
- GET `/api/v1/users` - List users
- POST `/api/v1/users` - Create user
- PATCH `/api/v1/users/[id]` - Update user
- DELETE `/api/v1/users/[id]` - Delete/disable user

**Test Data**:
- Create test users of different roles
- Test viewing filtered lists per role

---

### 3. Plant Management Tests

**Action**: Test plant CRUD permissions across all roles

**Context**: Only CFO and CXO_TEAM should be able to manage plants. AUDIT_HEAD and AUDITOR can view. AUDITEE has no access.

**Acceptance**:
- [ ] CFO can create, edit, and delete plants
- [ ] CXO_TEAM can create, edit, and delete plants
- [ ] AUDIT_HEAD can view plants but cannot create/edit/delete (403 on mutations)
- [ ] AUDITOR can view plants but cannot create/edit/delete (403 on mutations)
- [ ] AUDITEE cannot view or manage plants (403 on all operations)
- [ ] UI navigation shows Plants page only for CFO, CXO_TEAM
- [ ] UI correctly disables edit/delete buttons for AUDIT_HEAD and AUDITOR

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/plants.spec.ts`

**API Endpoints**:
- GET `/api/v1/plants` - List plants
- POST `/api/v1/plants` - Create plant
- PATCH `/api/v1/plants/[id]` - Update plant
- DELETE `/api/v1/plants/[id]` - Delete plant

**Test Data**:
- Create 2-3 test plants
- Verify visibility per role

---

### 4. Audit Management Tests

**Action**: Test audit creation, editing, assignment, and listing permissions

**Context**: CFO and CXO_TEAM manage audits; AUDIT_HEAD and AUDITOR can only view assigned audits; AUDITEE has no audit access.

**Acceptance**:
- [ ] CFO can create audits with all fields
- [ ] CXO_TEAM can create audits with all fields
- [ ] AUDIT_HEAD cannot create audits (403)
- [ ] AUDITOR cannot create audits (403)
- [ ] AUDITEE cannot create audits (403)
- [ ] CFO can edit any audit
- [ ] CXO_TEAM can edit any audit
- [ ] AUDIT_HEAD cannot edit audits (403)
- [ ] CFO and CXO_TEAM can assign auditors via `AuditAssignment`
- [ ] CFO and CXO_TEAM can assign audit head via `auditHeadId`
- [ ] CFO and CXO_TEAM see all audits in list
- [ ] AUDIT_HEAD sees only assigned audits (where `auditHeadId = user.id`)
- [ ] AUDITOR sees only assigned audits (via `AuditAssignment`)
- [ ] AUDITEE sees no audits (empty list or 403)

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/audits/management.spec.ts`

**API Endpoints**:
- GET `/api/v1/audits` - List audits
- POST `/api/v1/audits` - Create audit
- PATCH `/api/v1/audits/[id]` - Update audit
- POST `/api/v1/audits/[id]/assign` - Assign auditors

**Test Data**:
- Create 3 audits: Audit A (assigned to auditor1), Audit B (assigned to auditor2), Audit C (no assignments)
- Verify each role sees correct subset

---

### 5. Audit Lock/Unlock/Complete Tests

**Action**: Test audit lock, unlock, and complete operations with permission enforcement

**Context**: Only CFO and CXO_TEAM can lock, unlock, and complete audits. Completion auto-locks. Lock enforcement blocks mutations.

**Acceptance**:
- [ ] CFO can lock any audit via POST `/api/v1/audits/[id]/lock`
- [ ] CXO_TEAM can lock any audit
- [ ] AUDIT_HEAD cannot lock audits (403)
- [ ] AUDITOR cannot lock audits (403)
- [ ] AUDITEE cannot lock audits (403)
- [ ] CFO can unlock locked audits via POST `/api/v1/audits/[id]/unlock`
- [ ] CXO_TEAM can unlock locked audits
- [ ] CFO can complete audit via POST `/api/v1/audits/[id]/complete` (sets `completedAt` and auto-locks)
- [ ] CXO_TEAM can complete audit (sets `completedAt` and auto-locks)
- [ ] Locked audit blocks observation edits for AUDIT_HEAD, AUDITOR, AUDITEE
- [ ] CFO can override and edit observations even after audit is locked
- [ ] Locked audit blocks observation deletion for AUDIT_HEAD
- [ ] Locked audit blocks attachment deletion for AUDITOR
- [ ] UI shows lock status badge on audit detail page
- [ ] UI disables edit buttons when audit is locked (except for CFO)

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/audits/lock-lifecycle.spec.ts`

**API Endpoints**:
- POST `/api/v1/audits/[id]/lock`
- POST `/api/v1/audits/[id]/unlock`
- POST `/api/v1/audits/[id]/complete`
- PATCH `/api/v1/observations/[id]` - Test blocking when audit locked
- DELETE `/api/v1/observations/[id]` - Test blocking when audit locked

**Test Data**:
- Create audit with observations
- Lock it and test mutations
- Unlock and verify edits work again

---

### 6. Audit Visibility Rules Tests

**Action**: Test audit visibility configuration and enforcement for historical audits

**Context**: CFO and CXO_TEAM configure visibility rules; AUDIT_HEAD and AUDITOR see filtered lists based on rules; CFO and CXO_TEAM always see all.

**Acceptance**:
- [ ] CFO can set visibility rules via POST `/api/v1/audits/[id]/visibility`
- [ ] CXO_TEAM can set visibility rules
- [ ] AUDIT_HEAD cannot set visibility rules (403)
- [ ] Visibility rule `show_all` allows AUDITOR to see all historical audits
- [ ] Visibility rule `hide_all` blocks AUDITOR from seeing historical audits
- [ ] Visibility rule `last_12m` shows only audits from last 12 months to AUDITOR
- [ ] Visibility rule `explicit:{auditIds:[...]}` shows only specified audits to AUDITOR
- [ ] CFO and CXO_TEAM always see all audits regardless of visibility rules
- [ ] AUDIT_HEAD respects visibility rules for historical audits
- [ ] Current assigned audits are always visible regardless of visibility rules

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/audits/visibility.spec.ts`

**API Endpoints**:
- POST `/api/v1/audits/[id]/visibility` - Set visibility rules
- GET `/api/v1/audits` - Test filtered listing based on visibility

**Test Data**:
- Create 5 audits with different dates
- Set visibility rules
- Verify filtered lists per role

---

### 7. Observation Creation Tests

**Action**: Test observation creation permissions across all roles

**Context**: CFO, AUDIT_HEAD, and AUDITOR can create observations; CXO_TEAM and AUDITEE cannot.

**Acceptance**:
- [ ] CFO can create observations in any audit
- [ ] AUDIT_HEAD can create observations in assigned audits
- [ ] AUDITOR can create observations in assigned audits
- [ ] CXO_TEAM cannot create observations (403)
- [ ] AUDITEE cannot create observations (403)
- [ ] New observations default to `approvalStatus: DRAFT`
- [ ] Created observation belongs to creator (`createdById`)
- [ ] UI shows "Create Observation" button only for CFO, AUDIT_HEAD, AUDITOR

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/creation.spec.ts`

**API Endpoints**:
- POST `/api/v1/observations` - Create observation

**Test Data**:
- Create observations from different role accounts
- Verify ownership and initial status

---

### 8. Observation Field-Level Permission Tests (Auditor Fields)

**Action**: Test editing of auditor fields (observationText, risksInvolved, riskCategory, likelyImpact, concernedProcess, auditorPerson)

**Context**: CFO, AUDIT_HEAD, and AUDITOR can edit auditor fields in DRAFT or REJECTED status; blocked after submission unless rejected.

**Acceptance**:
- [ ] CFO can edit auditor fields in DRAFT observations
- [ ] AUDIT_HEAD can edit auditor fields in DRAFT observations (own observations)
- [ ] AUDITOR can edit auditor fields in DRAFT observations (own observations)
- [ ] CXO_TEAM cannot edit auditor fields (403)
- [ ] AUDITEE cannot edit auditor fields (read-only)
- [ ] AUDITOR can edit auditor fields in REJECTED observations
- [ ] AUDITOR cannot edit auditor fields in SUBMITTED observations (403)
- [ ] AUDITOR cannot edit auditor fields in APPROVED observations (403) - must use change request
- [ ] CFO can override and edit auditor fields even after APPROVED (CFO override)
- [ ] AUDIT_HEAD cannot edit auditor fields in APPROVED observations (403) - change request only
- [ ] UI disables auditor field inputs for AUDITEE
- [ ] UI disables auditor field inputs after submission (except for CFO)

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/auditor-fields.spec.ts`

**API Endpoints**:
- PATCH `/api/v1/observations/[id]` - Test field-level updates

**Test Data**:
- Create observations in different approval statuses
- Test field edits as each role

**Auditor Fields**:
- `observationText`
- `risksInvolved`
- `riskCategory`
- `likelyImpact`
- `concernedProcess`
- `auditorPerson`

---

### 9. Observation Field-Level Permission Tests (Auditee Fields)

**Action**: Test editing of auditee fields (auditeePersonTier1, auditeePersonTier2, auditeeFeedback, personResponsibleToImplement, targetDate)

**Context**: Only AUDITEE (assigned) can edit auditee fields, even after approval; allowed only while audit is open; CFO can override.

**Acceptance**:
- [ ] AUDITEE can edit auditee fields on assigned observations
- [ ] AUDITEE cannot edit auditee fields on non-assigned observations (403)
- [ ] AUDITEE can edit auditee fields even when observation is APPROVED (while audit open)
- [ ] AUDITEE cannot edit auditee fields after audit is locked (403)
- [ ] CFO can edit auditee fields on any observation (override)
- [ ] AUDIT_HEAD cannot edit auditee fields (read-only)
- [ ] AUDITOR cannot edit auditee fields (read-only)
- [ ] CXO_TEAM cannot edit auditee fields (read-only)
- [ ] UI shows auditee fields as editable only for assigned AUDITEE
- [ ] UI shows auditee fields as read-only for AUDIT_HEAD and AUDITOR

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/auditee-fields.spec.ts`

**API Endpoints**:
- PATCH `/api/v1/observations/[id]` - Test auditee field updates
- POST `/api/v1/observations/[id]/assign-auditee` - Assign auditee first

**Test Data**:
- Create observation and assign auditee
- Test field edits as assigned and non-assigned auditees

**Auditee Fields**:
- `auditeePersonTier1`
- `auditeePersonTier2`
- `auditeeFeedback`
- `personResponsibleToImplement`
- `targetDate`

---

### 10. Observation Approval Workflow Tests

**Action**: Test submit, approve, and reject operations

**Context**: AUDITOR/AUDIT_HEAD submit; AUDIT_HEAD approves/rejects; CFO can override; workflow transitions DRAFT → SUBMITTED → APPROVED/REJECTED.

**Acceptance**:
- [ ] AUDITOR can submit DRAFT observation via POST `/api/v1/observations/[id]/submit`
- [ ] AUDIT_HEAD can submit DRAFT observation
- [ ] CFO can submit DRAFT observation
- [ ] CXO_TEAM cannot submit observations (403)
- [ ] AUDITEE cannot submit observations (403)
- [ ] Submission changes `approvalStatus` from DRAFT to SUBMITTED
- [ ] AUDIT_HEAD can approve SUBMITTED observation via POST `/api/v1/observations/[id]/approve`
- [ ] CFO can approve SUBMITTED observation (override)
- [ ] AUDITOR cannot approve observations (403)
- [ ] Approval changes `approvalStatus` from SUBMITTED to APPROVED
- [ ] AUDIT_HEAD can reject SUBMITTED observation via POST `/api/v1/observations/[id]/reject`
- [ ] CFO can reject SUBMITTED observation
- [ ] Rejection changes `approvalStatus` from SUBMITTED to REJECTED (allows re-editing)
- [ ] AUDITOR can re-edit REJECTED observation and resubmit
- [ ] Approval/rejection blocked when audit is locked (except CFO)
- [ ] UI shows Submit button only for AUDITOR and AUDIT_HEAD on DRAFT observations
- [ ] UI shows Approve/Reject buttons only for AUDIT_HEAD and CFO on SUBMITTED observations

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/approval-workflow.spec.ts`

**API Endpoints**:
- POST `/api/v1/observations/[id]/submit`
- POST `/api/v1/observations/[id]/approve`
- POST `/api/v1/observations/[id]/reject`

**Test Data**:
- Create observation, submit, approve
- Create observation, submit, reject, re-edit, resubmit

**Approval Status Transitions**:
```
DRAFT → (submit) → SUBMITTED → (approve) → APPROVED
DRAFT → (submit) → SUBMITTED → (reject) → REJECTED → (edit) → DRAFT → (submit) → SUBMITTED
```

---

### 11. Observation Delete Permission Tests

**Action**: Test observation deletion permissions across audit states and roles

**Context**: CFO can always delete; AUDIT_HEAD can delete while audit open; others cannot delete.

**Acceptance**:
- [ ] CFO can delete observations in open audits
- [ ] CFO can delete observations in locked audits (override)
- [ ] AUDIT_HEAD can delete observations in open audits
- [ ] AUDIT_HEAD cannot delete observations in locked audits (403)
- [ ] AUDITOR cannot delete observations (403)
- [ ] CXO_TEAM cannot delete observations (403)
- [ ] AUDITEE cannot delete observations (403)
- [ ] Deletion removes observation and cascades to related records (assignments, attachments, approvals)
- [ ] UI shows delete button only for CFO and AUDIT_HEAD (grayed out when locked for AUDIT_HEAD)

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/deletion.spec.ts`

**API Endpoints**:
- DELETE `/api/v1/observations/[id]`

**Test Data**:
- Create observations in locked and unlocked audits
- Test deletion as each role

---

### 12. Auditee Assignment Tests

**Action**: Test auditee assignment workflow and access restrictions

**Context**: CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR can assign auditees; assignments control auditee visibility and edit access.

**Acceptance**:
- [ ] CFO can assign auditee via POST `/api/v1/observations/[id]/assign-auditee`
- [ ] CXO_TEAM can assign auditee
- [ ] AUDIT_HEAD can assign auditee
- [ ] AUDITOR can assign auditee
- [ ] AUDITEE cannot assign auditees (403)
- [ ] Assignment creates `ObservationAssignment` record with `assignedById`
- [ ] Assigned AUDITEE can view the observation
- [ ] Non-assigned AUDITEE cannot view the observation (filtered out from list)
- [ ] Assigned AUDITEE can edit auditee fields
- [ ] Non-assigned AUDITEE cannot edit auditee fields (403)
- [ ] Multiple auditees can be assigned to same observation (unique constraint on observationId + auditeeId)
- [ ] UI shows assigned auditees list on observation detail page
- [ ] UI allows assigning auditees only for CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/auditee-assignment.spec.ts`

**API Endpoints**:
- POST `/api/v1/observations/[id]/assign-auditee` - Assign auditee
- GET `/api/v1/observations` - Test filtered list for auditees

**Test Data**:
- Create observation
- Assign auditee1
- Login as auditee1 and verify visibility
- Login as auditee2 and verify no visibility

---

### 13. Attachment Management Tests

**Action**: Test attachment upload, view, and delete permissions

**Context**: AUDITOR and AUDIT_HEAD upload attachments; all assigned users can view; delete permissions vary by role and lock state.

**Acceptance**:
- [ ] CFO can upload attachments to any observation
- [ ] AUDIT_HEAD can upload attachments to observations
- [ ] AUDITOR can upload attachments to observations
- [ ] CXO_TEAM cannot upload attachments (403)
- [ ] AUDITEE cannot upload attachments (403)
- [ ] CFO can view attachments on any observation
- [ ] CXO_TEAM can view attachments on all observations
- [ ] AUDIT_HEAD can view attachments on assigned observations
- [ ] AUDITOR can view attachments on assigned observations
- [ ] AUDITEE can view attachments on assigned observations
- [ ] CFO can delete attachments from open audits
- [ ] CFO can delete attachments from locked audits (override)
- [ ] AUDIT_HEAD can delete attachments from open audits
- [ ] AUDIT_HEAD cannot delete attachments from locked audits (403)
- [ ] AUDITOR can delete own attachments from open audits
- [ ] AUDITOR cannot delete other users' attachments (403)
- [ ] AUDITOR cannot delete attachments from locked audits (403)
- [ ] AUDITEE cannot delete attachments (403)
- [ ] UI shows upload button only for CFO, AUDIT_HEAD, AUDITOR
- [ ] UI shows delete button only for authorized users

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/attachments.spec.ts`

**API Endpoints**:
- POST `/api/v1/observations/[id]/attachments` - Upload attachment
- GET `/api/v1/observations/[id]/attachments` - List attachments
- DELETE `/api/v1/observations/[id]/attachments/[attachmentId]` - Delete attachment
- POST `/api/v1/observations/[id]/attachments/presign` - Get presigned URL

**Test Data**:
- Create observation
- Upload attachments as different users
- Test deletion as different roles and lock states

**Attachment Kinds**:
- ANNEXURE
- MGMT_DOC

---

### 14. Action Plan Permission Tests

**Action**: Test action plan creation, editing, and viewing permissions

**Context**: CFO, AUDIT_HEAD, AUDITOR, and assigned AUDITEE can create/edit action plans; others have restricted access.

**Acceptance**:
- [ ] CFO can create action plans on any observation
- [ ] AUDIT_HEAD can create action plans on observations
- [ ] AUDITOR can create action plans on observations
- [ ] AUDITEE can create action plans on assigned observations
- [ ] AUDITEE cannot create action plans on non-assigned observations (403)
- [ ] CXO_TEAM cannot create action plans (403)
- [ ] CFO can edit action plans on any observation
- [ ] AUDIT_HEAD can edit action plans
- [ ] AUDITOR can edit action plans
- [ ] AUDITEE can edit action plans on assigned observations
- [ ] CFO can view all action plans
- [ ] CXO_TEAM can view all action plans
- [ ] AUDIT_HEAD can view action plans on assigned observations
- [ ] AUDITOR can view action plans on assigned observations
- [ ] AUDITEE can view action plans on assigned observations
- [ ] UI shows action plan form for authorized users
- [ ] UI correctly enables/disables edit based on role and assignment

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/observations/action-plans.spec.ts`

**API Endpoints**:
- POST `/api/v1/observations/[id]/actions` - Create action plan
- PATCH `/api/v1/observations/[id]/actions/[actionId]` - Update action plan
- GET `/api/v1/observations/[id]/actions` - List action plans

**Test Data**:
- Create observation and assign auditee
- Create action plans as different roles
- Test edit access

---

### 15. Report & Export Permission Tests

**Action**: Test report generation and data export permissions

**Context**: CFO, CXO_TEAM, and AUDIT_HEAD can generate reports; CFO and CXO_TEAM see all audits; AUDIT_HEAD sees assigned only.

**Acceptance**:
- [ ] CFO can generate reports for all audits
- [ ] CXO_TEAM can generate reports for all audits
- [ ] AUDIT_HEAD can generate reports for assigned audits only
- [ ] AUDITOR cannot generate reports (403 or UI hidden)
- [ ] AUDITEE cannot generate reports (403 or UI hidden)
- [ ] CFO can export all data
- [ ] CXO_TEAM can export all data
- [ ] AUDIT_HEAD can export assigned audit data
- [ ] AUDITOR cannot export data (403 or UI hidden)
- [ ] AUDITEE cannot export data (403 or UI hidden)
- [ ] Reports page visible only for CFO, CXO_TEAM, AUDIT_HEAD
- [ ] Export button visible only for authorized users

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/reports.spec.ts`

**API Endpoints**:
- GET `/api/v1/reports` - Generate reports (if exists)
- GET `/api/v1/observations/export` - Export observations
- GET `/api/v1/audits/export` - Export audits (if exists)

**Test Data**:
- Create multiple audits with observations
- Test report generation and export as each role

---

### 16. Navigation & UI Access Tests

**Action**: Test navigation menu visibility and page access restrictions per role

**Context**: Each role has specific pages they can access; unauthorized access should redirect or show 403.

**Acceptance**:
- [ ] CFO sees: Plants, Audits, Observations, Reports, Users in navigation
- [ ] CXO_TEAM sees: Plants, Audits, Observations, Reports, Users in navigation
- [ ] AUDIT_HEAD sees: Audits, Observations, Reports in navigation
- [ ] AUDITOR sees: Audits, Observations in navigation
- [ ] AUDITEE sees: Observations in navigation
- [ ] Unauthorized page access (direct URL) redirects to 403 or home
- [ ] Navigation items are properly styled and ordered
- [ ] User role badge displayed in header

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/navigation.spec.ts`

**UI Components**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/components/NavBar.tsx`

**Pages to Test**:
- `/plants` - Only CFO, CXO_TEAM
- `/audits` - All except AUDITEE
- `/observations` - All roles
- `/reports` - Only CFO, CXO_TEAM, AUDIT_HEAD
- `/admin/users` - Only CFO, CXO_TEAM

**Test Data**:
- Login as each role
- Verify navigation links
- Test direct URL access

---

### 17. Test Scenario 1: CFO Override Capabilities

**Action**: Test CFO's ability to override all restrictions

**Context**: CFO is organization superuser and should bypass all permission checks, including locked audits and approval statuses.

**Acceptance**:
- [ ] CFO can edit observations in locked audits
- [ ] CFO can delete observations in locked audits
- [ ] CFO can approve/reject any observation regardless of assignment
- [ ] CFO can edit auditor fields even after approval
- [ ] CFO can edit auditee fields on any observation
- [ ] CFO can unlock completed audits
- [ ] CFO short-circuits all assertion functions in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac.ts`

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/scenarios/cfo-override.spec.ts`

**Test Flow**:
1. CXO_TEAM creates and locks an audit
2. AUDITOR creates and approves an observation
3. CFO logs in
4. CFO edits the approved observation
5. CFO deletes the observation
6. CFO unlocks the audit
7. All operations succeed

---

### 18. Test Scenario 2: Audit Lifecycle Management

**Action**: Test complete audit lifecycle from creation to completion with lock enforcement

**Context**: Validates audit state transitions and lock enforcement across roles.

**Acceptance**:
- [ ] CXO_TEAM creates audit
- [ ] CXO_TEAM assigns AUDITOR and AUDIT_HEAD
- [ ] AUDITOR creates observations while audit open
- [ ] AUDITOR can edit observations while audit open
- [ ] CXO_TEAM locks audit
- [ ] AUDITOR cannot edit observations after lock (403)
- [ ] AUDIT_HEAD cannot delete observations after lock (403)
- [ ] CFO can still edit after lock (override)
- [ ] CXO_TEAM unlocks audit
- [ ] AUDITOR can edit again after unlock
- [ ] CXO_TEAM marks audit complete (auto-locks)
- [ ] Completed audit shows `completedAt` timestamp and `completedById`

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/scenarios/audit-lifecycle.spec.ts`

**Test Flow**:
1. CXO creates audit and assigns users
2. Auditor creates observations
3. CXO locks audit
4. Verify edits blocked
5. CFO overrides and edits
6. CXO unlocks
7. Auditor edits again
8. CXO marks complete
9. Verify auto-lock

---

### 19. Test Scenario 3: Observation Approval Workflow

**Action**: Test complete observation approval flow from creation to approval with field restrictions

**Context**: Validates approval workflow transitions and field-level permissions at each stage.

**Acceptance**:
- [ ] AUDITOR creates draft observation
- [ ] AUDITOR edits auditor fields in DRAFT state
- [ ] AUDITOR submits observation (status → SUBMITTED)
- [ ] AUDITOR cannot edit after submission (403)
- [ ] AUDIT_HEAD approves observation (status → APPROVED)
- [ ] AUDITOR cannot edit auditor fields after approval (403)
- [ ] AUDITEE is assigned to observation
- [ ] AUDITEE can edit auditee fields even after approval (while audit open)
- [ ] AUDITEE cannot edit auditor fields (read-only)
- [ ] Audit trail logs all state changes

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/scenarios/observation-approval-flow.spec.ts`

**Test Flow**:
1. Auditor creates draft observation
2. Auditor fills auditor fields
3. Auditor submits for approval
4. Audit Head reviews and approves
5. Auditee is assigned
6. Auditee edits auditee fields
7. Verify field restrictions at each stage

---

### 20. Test Scenario 4: Auditee Assignment & Restrictions

**Action**: Test auditee assignment workflow and access restrictions

**Context**: Validates that auditees only see assigned observations and can only edit auditee fields.

**Acceptance**:
- [ ] AUDIT_HEAD creates observation
- [ ] AUDIT_HEAD assigns AUDITEE to observation
- [ ] AUDITEE sees assigned observation in list
- [ ] AUDITEE can view observation detail
- [ ] AUDITEE can edit auditee fields (tier1, tier2, feedback, targetDate, personResponsible)
- [ ] AUDITEE cannot edit auditor fields (observationText, risksInvolved, etc.)
- [ ] Non-assigned AUDITEE2 does not see the observation in list
- [ ] Non-assigned AUDITEE2 cannot access observation detail (403)
- [ ] Audit gets locked
- [ ] Assigned AUDITEE cannot edit after lock (403)
- [ ] CFO can still assign/unassign auditees after lock

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/scenarios/auditee-assignment.spec.ts`

**Test Flow**:
1. Audit Head creates observation
2. Audit Head assigns auditee1
3. Auditee1 logs in and sees observation
4. Auditee1 edits auditee fields
5. Auditee2 logs in and doesn't see observation
6. Audit gets locked
7. Auditee1 cannot edit anymore
8. CFO assigns another auditee after lock

---

### 21. Test Scenario 5: Visibility Rules Enforcement

**Action**: Test audit visibility rules for historical audit access

**Context**: Validates that visibility rules correctly filter audit lists for AUDIT_HEAD and AUDITOR.

**Acceptance**:
- [ ] CXO_TEAM creates 5 audits with different dates (2 years ago, 1 year ago, 6 months ago, current, future)
- [ ] CXO_TEAM sets visibility rule `hide_all` on audit config
- [ ] AUDITOR sees only assigned current audits, not historical
- [ ] CXO_TEAM changes visibility to `show_all`
- [ ] AUDITOR sees all historical audits
- [ ] CXO_TEAM changes visibility to `last_12m`
- [ ] AUDITOR sees only audits from last 12 months plus assigned current
- [ ] CXO_TEAM changes visibility to `explicit:{auditIds:[audit1.id, audit2.id]}`
- [ ] AUDITOR sees only specified audits plus assigned current
- [ ] AUDIT_HEAD respects same visibility rules
- [ ] CFO and CXO_TEAM always see all audits regardless of visibility rules

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/scenarios/visibility-rules.spec.ts`

**Test Flow**:
1. CXO creates multiple audits across time periods
2. CXO sets `hide_all` visibility
3. Auditor logs in and verifies limited visibility
4. CXO changes to `show_all`
5. Auditor verifies all visible
6. CXO changes to `last_12m`
7. Auditor verifies time-based filtering
8. CXO changes to explicit list
9. Auditor verifies explicit filtering
10. CFO logs in and sees all regardless

---

### 22. Integration Test: End-to-End Complete Workflow

**Action**: Run complete end-to-end workflow with all roles collaborating

**Context**: Integration test that simulates a real audit process from start to finish with all roles participating.

**Acceptance**:
- [ ] CFO creates users (or uses seeded users)
- [ ] CXO_TEAM creates plant
- [ ] CXO_TEAM creates audit and assigns AUDIT_HEAD and AUDITOR
- [ ] AUDITOR creates 3 observations in DRAFT
- [ ] AUDITOR submits observations for approval
- [ ] AUDIT_HEAD reviews and approves 2 observations
- [ ] AUDIT_HEAD rejects 1 observation with comment
- [ ] AUDITOR edits rejected observation and resubmits
- [ ] AUDIT_HEAD approves resubmitted observation
- [ ] AUDIT_HEAD assigns AUDITEE to all 3 observations
- [ ] AUDITEE logs in and sees all 3 assigned observations
- [ ] AUDITEE fills auditee feedback fields
- [ ] AUDITEE creates action plans
- [ ] AUDITOR uploads attachments to observations
- [ ] CXO_TEAM locks audit
- [ ] Verify no one except CFO can edit
- [ ] AUDIT_HEAD generates report for audit
- [ ] CXO_TEAM marks audit complete
- [ ] Verify audit is completed and locked
- [ ] Audit trail contains all events

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/tests/integration/complete-workflow.spec.ts`

**Test Flow**: (See acceptance criteria above - comprehensive multi-role workflow)

---

### 23. Test Documentation & Reporting

**Action**: Create test documentation, README, and automated reporting

**Context**: Document test suite structure, setup instructions, and create automated test reports for sign-off.

**Acceptance**:
- [ ] Test README created at `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/README.md`
- [ ] README includes setup instructions (database, environment variables, seed data)
- [ ] README includes how to run tests (`npm run test:e2e`)
- [ ] README includes how to run specific test suites
- [ ] README includes how to debug tests
- [ ] Playwright HTML reporter configured in `playwright.config.ts`
- [ ] Test report generation script added (`npm run test:report`)
- [ ] CI configuration documented (GitHub Actions or other CI)
- [ ] Test coverage summary created showing all permission matrix entries tested

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/e2e/README.md`
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/.github/workflows/e2e-tests.yml` (optional)

**Documentation Sections**:
1. Test Suite Overview
2. Prerequisites (Docker, Node, Environment)
3. Setup Instructions
4. Running Tests
5. Test Structure
6. Debugging Failed Tests
7. Adding New Tests
8. CI/CD Integration

---

### 24. Final QA Sign-off Checklist

**Action**: Execute comprehensive QA validation and document sign-off

**Context**: Final validation pass to ensure all permission matrix entries are tested and documented.

**Acceptance**:
- [ ] All permission matrix entries from RBAC_updated.md validated
- [ ] All 5 test scenarios from RBAC_TASK_6.md pass
- [ ] Field-level permissions enforced (auditor vs auditee fields)
- [ ] Lock mechanism working correctly across all roles
- [ ] Visibility rules applied correctly
- [ ] Approval workflow transitions validated
- [ ] Auditee assignment and restrictions verified
- [ ] CFO override capabilities confirmed
- [ ] No unauthorized access possible
- [ ] Audit trail logging verified for all major operations
- [ ] UI reflects correct permissions per role
- [ ] All tests pass in CI environment
- [ ] Test coverage report shows >95% permission matrix coverage
- [ ] Documentation updated in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/docs/RBAC.md`

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/docs/RBAC_TASK_6_SIGNOFF.md` (sign-off document)

**Sign-off Document Sections**:
1. Executive Summary
2. Test Coverage Summary (permission matrix vs tests)
3. Test Results (all scenarios passed)
4. Known Issues (if any)
5. Recommendations
6. Sign-off signatures (Development, QA, Product Owner)

---

## Dependencies

**Task Sequencing**:
- Subtasks 1 (Infrastructure) must be completed before all other subtasks
- Subtasks 2-16 (Individual permission tests) can run in parallel after subtask 1
- Subtasks 17-21 (Scenarios) depend on relevant permission tests passing
- Subtask 22 (Integration) depends on all scenarios passing
- Subtask 23 (Documentation) can run in parallel with tests
- Subtask 24 (Sign-off) must be last

**External Dependencies**:
- Docker container `audit-postgres` must be running
- Seed data must be loaded (`npm run db:seed`)
- Both Next.js (port 3005) and WebSocket (port 3001) servers must be running
- Environment variables configured for test user credentials

---

## Verification Checklist

### Permission Matrix Coverage

**Users & Teams**:
- [x] Manage all users - CFO, CXO_TEAM only (Subtask 2)
- [x] View team members - Role-based visibility (Subtask 2)

**Plants**:
- [x] Create/Edit/Delete - CFO, CXO_TEAM only (Subtask 3)
- [x] View - CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR (Subtask 3)

**Audits**:
- [x] Create/Edit - CFO, CXO_TEAM only (Subtask 4)
- [x] Assign Auditors - CFO, CXO_TEAM only (Subtask 4)
- [x] Assign Auditees - CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR (Subtask 12)
- [x] Lock/Unlock/Complete - CFO, CXO_TEAM only (Subtask 5)
- [x] Visibility Rules - CFO, CXO_TEAM only (Subtask 6)
- [x] View All - CFO, CXO_TEAM only (Subtask 4)
- [x] View Assigned - AUDIT_HEAD, AUDITOR (Subtask 4)

**Observations**:
- [x] Create - CFO, AUDIT_HEAD, AUDITOR (Subtask 7)
- [x] Edit Auditor Fields - CFO, AUDIT_HEAD, AUDITOR (Subtask 8)
- [x] Edit Auditee Fields - CFO, assigned AUDITEE (Subtask 9)
- [x] Submit - CFO, AUDIT_HEAD, AUDITOR (Subtask 10)
- [x] Approve/Reject - CFO, AUDIT_HEAD (Subtask 10)
- [x] Delete - CFO always, AUDIT_HEAD when open (Subtask 11)
- [x] View - Role-based with assignment filtering (Subtasks 7-12)

**Attachments**:
- [x] Upload - CFO, AUDIT_HEAD, AUDITOR (Subtask 13)
- [x] Delete - CFO always, AUDIT_HEAD/AUDITOR when open (Subtask 13)
- [x] View - All assigned users (Subtask 13)

**Action Plans**:
- [x] Create/Edit - CFO, AUDIT_HEAD, AUDITOR, assigned AUDITEE (Subtask 14)
- [x] View - All assigned users (Subtask 14)

**Reports**:
- [x] Generate - CFO, CXO_TEAM (all), AUDIT_HEAD (assigned) (Subtask 15)
- [x] Export - CFO, CXO_TEAM, AUDIT_HEAD (Subtask 15)

**Navigation**:
- [x] Page visibility per role (Subtask 16)

### Test Scenarios Coverage

- [x] Scenario 1: CFO Override (Subtask 17)
- [x] Scenario 2: Audit Lifecycle (Subtask 18)
- [x] Scenario 3: Observation Approval Flow (Subtask 19)
- [x] Scenario 4: Auditee Assignment (Subtask 20)
- [x] Scenario 5: Visibility Rules (Subtask 21)

### Technical Requirements

- [ ] Audit trail logging verified (all subtasks)
- [ ] UI reflects correct permissions per role (all subtasks)
- [ ] Field-level permissions enforced (Subtasks 8, 9)
- [ ] Lock mechanism working correctly (Subtasks 5, 11, 18)
- [ ] Visibility rules applied correctly (Subtasks 6, 21)
- [ ] No unauthorized access possible (all subtasks)
- [ ] Documentation updated (Subtask 23)

---

## Sign-off

- [ ] Development team sign-off (all tests pass)
- [ ] QA sign-off (permission matrix validated)
- [ ] Product owner sign-off (scenarios meet requirements)

---

**Implementation Notes**:

1. **Test Isolation**: Each test should clean up its own data to avoid cross-contamination
2. **Parallel Execution**: Use Playwright workers to run tests in parallel (set in config)
3. **Retry Strategy**: Configure retries for flaky network/timing issues
4. **Screenshots on Failure**: Capture screenshots and traces for debugging
5. **Database State**: Use transactions or cleanup functions to reset database between tests
6. **Environment Variables**: Use `.env.test` for test-specific configuration
7. **Test Data**: Prefer creating test data in tests over relying on seed data (except for users)
8. **API vs UI Testing**: Test permissions at API level (faster) and spot-check UI visibility
9. **Real-time WebSocket**: Test WebSocket broadcasts where applicable (observation updates)
10. **Audit Trail**: Verify audit events are logged for all major operations

**Estimated Effort**:
- Subtask 1 (Infrastructure): 4-6 hours
- Subtasks 2-16 (Permission Tests): 2-3 hours each (30-45 hours total)
- Subtasks 17-21 (Scenarios): 3-4 hours each (15-20 hours total)
- Subtask 22 (Integration): 6-8 hours
- Subtask 23 (Documentation): 3-4 hours
- Subtask 24 (Sign-off): 2-3 hours
- **Total: 60-86 hours** (adjust based on team size and parallel work)
