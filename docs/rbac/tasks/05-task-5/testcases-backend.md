# RBAC Task 5: Backend API Test Cases

**Test Suite**: RBAC v2 Backend API Testing
**Date Created**: 2025-01-23
**Test Environment**: Development (localhost:3005)
**Database**: PostgreSQL (audit-postgres container)

## Test Summary

- **Total Test Cases**: 42
- **Coverage Areas**:
  - Navigation and Route Authorization (6 tests)
  - Audit Management API (8 tests)
  - Observation Management API (12 tests)
  - Assignment Management API (8 tests)
  - Audit Lifecycle Operations (8 tests)

---

## Prerequisites

### Test Data Setup
Run the following to seed test data:
```bash
npm run db:seed
```

### Default Test Credentials
- **CFO**: cfo@example.com / cfo123
- **CXO Team**: cxo@example.com / cxo123
- **Audit Head**: audithead@example.com / audithead123
- **Auditor**: auditor@example.com / auditor123
- **Auditee**: auditee@example.com / auditee123

### Authentication Pattern
All tests require authentication. Get JWT token via:
```bash
POST /api/auth/callback/credentials
{
  "email": "cfo@example.com",
  "password": "cfo123"
}
```
Include token in subsequent requests as session cookie or Authorization header.

---

## Test Cases

### Category 1: Navigation and Route Authorization

#### API-001: CFO Access to All Endpoints
**Objective**: Verify CFO role has unrestricted access to all API endpoints
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO (cfo@example.com)

**Test Steps**:
1. GET /api/v1/plants
2. GET /api/v1/audits
3. GET /api/v1/observations
4. GET /api/v1/users
5. POST /api/v1/audits (with valid plant data)
6. POST /api/v1/observations (with valid audit data)
7. PATCH /api/v1/audits/{auditId}/lock
8. DELETE /api/v1/observations/{observationId}

**Expected Results**:
- All requests return HTTP 200/201
- No 403 Forbidden errors
- CFO short-circuit bypasses all permission checks
- Operations succeed regardless of audit lock status

**Assertions**:
- Response status code is 2xx for all requests
- No authorization errors in response body

---

#### API-002: CXO Team Cannot Create Observations
**Objective**: Verify CXO_TEAM role cannot author observations
**Role**: CXO_TEAM
**Prerequisites**:
- Authenticated as CXO_TEAM (cxo@example.com)
- Existing audit with ID `{auditId}`

**Test Steps**:
1. POST /api/v1/observations
   ```json
   {
     "auditId": "{auditId}",
     "observationText": "Test observation from CXO"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden
- Error message: "Forbidden" or similar
- Observation is NOT created in database

**Assertions**:
- Response status code is 403
- Database query returns no observation with matching text

---

#### API-003: Audit Head Can Create Observations
**Objective**: Verify AUDIT_HEAD role can author observations
**Role**: AUDIT_HEAD
**Prerequisites**:
- Authenticated as AUDIT_HEAD (audithead@example.com)
- Existing audit with ID `{auditId}` where audit head is assigned

**Test Steps**:
1. POST /api/v1/observations
   ```json
   {
     "auditId": "{auditId}",
     "observationText": "Test observation from Audit Head"
   }
   ```

**Expected Results**:
- HTTP 201 Created
- Response body contains created observation with ID
- Observation exists in database with approvalStatus = "DRAFT"

**Assertions**:
- Response status code is 201
- Response.observation.approvalStatus === "DRAFT"
- Database query confirms observation exists

---

#### API-004: Auditor Can Create Observations
**Objective**: Verify AUDITOR role can author observations
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR (auditor@example.com)
- Existing audit with ID `{auditId}` where auditor is assigned

**Test Steps**:
1. POST /api/v1/observations
   ```json
   {
     "auditId": "{auditId}",
     "observationText": "Test observation from Auditor"
   }
   ```

**Expected Results**:
- HTTP 201 Created
- Response body contains created observation
- Observation has approvalStatus = "DRAFT"

**Assertions**:
- Response status code is 201
- Observation is created successfully
- Creator is the authenticated auditor

---

#### API-005: Auditee Cannot Create Observations
**Objective**: Verify AUDITEE role cannot author observations
**Role**: AUDITEE
**Prerequisites**:
- Authenticated as AUDITEE (auditee@example.com)
- Existing audit with ID `{auditId}`

**Test Steps**:
1. POST /api/v1/observations
   ```json
   {
     "auditId": "{auditId}",
     "observationText": "Test observation from Auditee"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden
- Error message indicates insufficient permissions
- No observation created

**Assertions**:
- Response status code is 403
- Database remains unchanged

---

#### API-006: User List Access Control
**Objective**: Verify only CFO and CXO_TEAM can list users
**Roles**: CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE
**Prerequisites**: Authenticated as each role

**Test Steps**:
1. For each role, send: GET /api/v1/users
2. Record response status and body

**Expected Results**:
- **CFO**: HTTP 200, user list returned
- **CXO_TEAM**: HTTP 200, user list returned
- **AUDIT_HEAD**: HTTP 403 Forbidden
- **AUDITOR**: HTTP 403 Forbidden
- **AUDITEE**: HTTP 403 Forbidden

**Assertions**:
- CFO and CXO_TEAM receive user data
- Other roles receive 403 error
- No sensitive user data leaked in error responses

---

### Category 2: Audit Management API

#### API-007: Create Audit - CFO Authorization
**Objective**: Verify CFO can create audits
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Existing plant with ID `{plantId}`

**Test Steps**:
1. POST /api/v1/audits
   ```json
   {
     "plantId": "{plantId}",
     "title": "Q1 2025 CFO Audit",
     "visitStartDate": "2025-02-01T00:00:00Z",
     "visitEndDate": "2025-02-15T00:00:00Z"
   }
   ```

**Expected Results**:
- HTTP 201 Created
- Response contains audit object with ID
- Audit exists in database with correct plant association
- Audit status is "PLANNED"
- isLocked is false

**Assertions**:
- Response.audit.id is present
- Response.audit.plantId === {plantId}
- Response.audit.isLocked === false

---

#### API-008: Create Audit - CXO Team Authorization
**Objective**: Verify CXO_TEAM can create audits
**Role**: CXO_TEAM
**Prerequisites**:
- Authenticated as CXO_TEAM
- Existing plant with ID `{plantId}`

**Test Steps**:
1. POST /api/v1/audits (same payload as API-007)

**Expected Results**:
- HTTP 201 Created
- Audit created successfully
- Audit accessible via GET /api/v1/audits/{auditId}

**Assertions**:
- Response status is 201
- Audit persists in database

---

#### API-009: Create Audit - Non-Management Roles Denied
**Objective**: Verify AUDIT_HEAD, AUDITOR, AUDITEE cannot create audits
**Roles**: AUDIT_HEAD, AUDITOR, AUDITEE
**Prerequisites**: Authenticated as each role

**Test Steps**:
1. For each role, attempt POST /api/v1/audits
2. Use valid plant ID and audit data

**Expected Results**:
- HTTP 403 Forbidden for all three roles
- Error message: "Forbidden"
- No audit created in database

**Assertions**:
- All requests return 403
- Database audit count unchanged

---

#### API-010: Lock Audit - CFO Authorization
**Objective**: Verify CFO can lock audits
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Existing unlocked audit with ID `{auditId}`

**Test Steps**:
1. POST /api/v1/audits/{auditId}/lock

**Expected Results**:
- HTTP 200 OK
- Response contains updated audit with isLocked = true
- lockedAt timestamp is present
- lockedById is CFO's user ID

**Assertions**:
- Response.audit.isLocked === true
- Response.audit.lockedAt is ISO date string
- Response.audit.lockedById === CFO user ID

---

#### API-011: Lock Audit - CXO Team Authorization
**Objective**: Verify CXO_TEAM can lock audits
**Role**: CXO_TEAM
**Prerequisites**:
- Authenticated as CXO_TEAM
- Existing unlocked audit with ID `{auditId}`

**Test Steps**:
1. POST /api/v1/audits/{auditId}/lock

**Expected Results**:
- HTTP 200 OK
- Audit is locked
- Lock metadata recorded

**Assertions**:
- Response.audit.isLocked === true
- Lock operation creates audit trail event

---

#### API-012: Unlock Audit After Lock
**Objective**: Verify CFO/CXO can unlock previously locked audits
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Existing locked audit with ID `{auditId}` (locked via API-010)

**Test Steps**:
1. POST /api/v1/audits/{auditId}/unlock

**Expected Results**:
- HTTP 200 OK
- Response.audit.isLocked === false
- lockedAt and lockedById remain for audit trail
- Audit operations are now permitted

**Assertions**:
- Audit is unlocked successfully
- Subsequent observation edits are allowed

---

#### API-013: Complete Audit Operation
**Objective**: Verify CFO/CXO can mark audits as complete
**Role**: CXO_TEAM
**Prerequisites**:
- Authenticated as CXO_TEAM
- Existing audit with ID `{auditId}` (unlocked)

**Test Steps**:
1. POST /api/v1/audits/{auditId}/complete

**Expected Results**:
- HTTP 200 OK
- Response.audit.completedAt is present
- Response.audit.isLocked === true (completion auto-locks)
- completedById is CXO_TEAM user ID

**Assertions**:
- Audit marked as complete
- Audit is automatically locked
- Audit trail event created

---

#### API-014: Assign Audit Head to Audit
**Objective**: Verify CFO/CXO can assign audit head to audit
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Existing audit with ID `{auditId}`
- Existing AUDIT_HEAD user with ID `{auditHeadId}`

**Test Steps**:
1. PATCH /api/v1/audits/{auditId}
   ```json
   {
     "auditHeadId": "{auditHeadId}"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Response.audit.auditHeadId === {auditHeadId}
- Audit head can now approve observations in this audit

**Assertions**:
- Audit head assignment persists
- Audit head can access audit details
- Audit head appears in audit assignments

---

### Category 3: Observation Management API

#### API-015: Submit Observation for Approval - Auditor
**Objective**: Verify AUDITOR can submit draft observations
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- Existing DRAFT observation with ID `{observationId}` created by this auditor
- Parent audit is unlocked

**Test Steps**:
1. POST /api/v1/observations/{observationId}/submit

**Expected Results**:
- HTTP 200 OK
- Response.observation.approvalStatus === "SUBMITTED"
- Approval record created with status "SUBMITTED"
- Audit trail event logged

**Assertions**:
- Observation status changed to SUBMITTED
- Cannot be edited by auditor without change request
- Audit head can now approve/reject

---

#### API-016: Submit Observation - Locked Audit Blocked
**Objective**: Verify locked audit prevents submission
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- Existing DRAFT observation with ID `{observationId}`
- Parent audit is LOCKED

**Test Steps**:
1. POST /api/v1/observations/{observationId}/submit

**Expected Results**:
- HTTP 403 Forbidden
- Error message: "Audit is locked"
- Observation status remains DRAFT

**Assertions**:
- Submission is blocked
- No approval record created
- Observation unchanged

---

#### API-017: Approve Observation - CFO Authorization
**Objective**: Verify CFO can approve observations
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Existing SUBMITTED observation with ID `{observationId}`

**Test Steps**:
1. POST /api/v1/observations/{observationId}/approve
   ```json
   {
     "approve": true,
     "comment": "Approved by CFO"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Response.observation.approvalStatus === "APPROVED"
- Approval record created with actor = CFO, status = "APPROVED"
- Comment stored in approval record

**Assertions**:
- Observation approved successfully
- Approval history includes CFO decision
- Audit trail logged

---

#### API-018: Approve Observation - Audit Head Authorization
**Objective**: Verify AUDIT_HEAD can approve observations
**Role**: AUDIT_HEAD
**Prerequisites**:
- Authenticated as AUDIT_HEAD
- AUDIT_HEAD is assigned to parent audit
- Existing SUBMITTED observation with ID `{observationId}`

**Test Steps**:
1. POST /api/v1/observations/{observationId}/approve
   ```json
   {
     "approve": true,
     "comment": "Approved by Audit Head"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Observation approved
- Approval actor is AUDIT_HEAD

**Assertions**:
- Approval succeeds
- Audit head role recorded in approval

---

#### API-019: Reject Observation - Audit Head
**Objective**: Verify AUDIT_HEAD can reject observations
**Role**: AUDIT_HEAD
**Prerequisites**:
- Authenticated as AUDIT_HEAD
- SUBMITTED observation with ID `{observationId}`

**Test Steps**:
1. POST /api/v1/observations/{observationId}/approve
   ```json
   {
     "approve": false,
     "comment": "Needs more detail on risk assessment"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Response.observation.approvalStatus === "REJECTED"
- Approval record with status "REJECTED" and comment
- Observation becomes editable by auditor again

**Assertions**:
- Observation rejected
- Auditor can now edit and resubmit
- Rejection comment visible

---

#### API-020: Approve Observation - Auditor Denied
**Objective**: Verify AUDITOR cannot approve observations
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- SUBMITTED observation with ID `{observationId}`

**Test Steps**:
1. POST /api/v1/observations/{observationId}/approve
   ```json
   {
     "approve": true
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden
- Observation status unchanged
- No approval record created

**Assertions**:
- Request denied
- Auditor cannot approve own work

---

#### API-021: Delete Observation - CFO Override
**Objective**: Verify CFO can delete observations regardless of audit lock status
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Existing observation with ID `{observationId}`
- Parent audit is LOCKED

**Test Steps**:
1. DELETE /api/v1/observations/{observationId}

**Expected Results**:
- HTTP 200 OK
- Observation deleted from database
- Audit trail event logged

**Assertions**:
- Observation no longer exists
- DELETE succeeds despite locked audit
- CFO short-circuit applies

---

#### API-022: Delete Observation - Audit Head on Unlocked Audit
**Objective**: Verify AUDIT_HEAD can delete observations when audit is unlocked
**Role**: AUDIT_HEAD
**Prerequisites**:
- Authenticated as AUDIT_HEAD
- Existing observation with ID `{observationId}`
- Parent audit is UNLOCKED

**Test Steps**:
1. DELETE /api/v1/observations/{observationId}

**Expected Results**:
- HTTP 200 OK
- Observation deleted successfully

**Assertions**:
- Deletion succeeds
- Observation removed from database

---

#### API-023: Delete Observation - Audit Head on Locked Audit Denied
**Objective**: Verify AUDIT_HEAD cannot delete observations when audit is locked
**Role**: AUDIT_HEAD
**Prerequisites**:
- Authenticated as AUDIT_HEAD
- Existing observation with ID `{observationId}`
- Parent audit is LOCKED

**Test Steps**:
1. DELETE /api/v1/observations/{observationId}

**Expected Results**:
- HTTP 403 Forbidden
- Error: "Cannot delete observation - audit is locked"
- Observation remains in database

**Assertions**:
- Deletion blocked by audit lock
- Observation unchanged

---

#### API-024: Update Observation - Auditor on Draft
**Objective**: Verify AUDITOR can edit draft observations
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- DRAFT observation with ID `{observationId}` created by this auditor
- Audit is unlocked

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "observationText": "Updated observation text",
     "riskCategory": "A"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Observation updated with new values
- Audit trail event logged

**Assertions**:
- Fields updated successfully
- Change recorded in audit trail

---

#### API-025: Update Observation - Auditor on Approved (Blocked)
**Objective**: Verify AUDITOR cannot directly edit approved observations
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- APPROVED observation with ID `{observationId}`

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "observationText": "Attempting to change approved obs"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden OR HTTP 200 with no changes applied
- Error message indicates change request workflow required
- Observation text unchanged

**Assertions**:
- Direct edit blocked
- Observation remains unchanged
- Change request workflow must be used

---

#### API-026: Update Observation - Locked Audit Blocks Edits
**Objective**: Verify locked audit prevents observation edits (except CFO)
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- DRAFT observation with ID `{observationId}`
- Parent audit is LOCKED

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "observationText": "Trying to edit locked audit observation"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden
- Error: "Cannot edit observation - audit is locked"
- Observation unchanged

**Assertions**:
- Edit blocked by audit lock
- Only CFO can override

---

### Category 4: Assignment Management API

#### API-027: Assign Auditee to Observation - Auditor
**Objective**: Verify AUDITOR can assign auditees to observations
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- Existing observation with ID `{observationId}`
- Existing AUDITEE user with ID `{auditeeId}`

**Test Steps**:
1. POST /api/v1/observations/{observationId}/assign-auditee
   ```json
   {
     "auditeeId": "{auditeeId}"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Response includes assignment record
- Auditee appears in observation.assignments array
- Audit trail event logged

**Assertions**:
- Assignment created successfully
- Auditee can now edit designated fields
- Assignment date recorded

---

#### API-028: Assign Auditee - Audit Head Authorization
**Objective**: Verify AUDIT_HEAD can assign auditees
**Role**: AUDIT_HEAD
**Prerequisites**:
- Authenticated as AUDIT_HEAD
- Observation and auditee as in API-027

**Test Steps**:
1. POST /api/v1/observations/{observationId}/assign-auditee
   ```json
   {
     "auditeeId": "{auditeeId}"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Assignment created

**Assertions**:
- Audit head can manage assignments
- Assignment persists

---

#### API-029: Assign Auditee - Auditee Denied
**Objective**: Verify AUDITEE cannot assign other auditees
**Role**: AUDITEE
**Prerequisites**:
- Authenticated as AUDITEE
- Observation and auditee IDs

**Test Steps**:
1. POST /api/v1/observations/{observationId}/assign-auditee
   ```json
   {
     "auditeeId": "{auditeeId}"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden
- No assignment created

**Assertions**:
- Auditees cannot manage assignments
- Authorization properly enforced

---

#### API-030: Remove Auditee Assignment
**Objective**: Verify authorized roles can remove auditee assignments
**Role**: AUDIT_HEAD
**Prerequisites**:
- Authenticated as AUDIT_HEAD
- Existing assignment with ID `{assignmentId}`

**Test Steps**:
1. DELETE /api/v1/observations/{observationId}/assign-auditee?assignmentId={assignmentId}

**Expected Results**:
- HTTP 200 OK
- Assignment removed from database
- Auditee loses edit access to observation fields

**Assertions**:
- Assignment deleted successfully
- Auditee can no longer edit fields

---

#### API-031: Auditee Edit Fields - Assigned User
**Objective**: Verify assigned AUDITEE can edit designated fields
**Role**: AUDITEE
**Prerequisites**:
- Authenticated as AUDITEE with ID `{auditeeId}`
- Observation with ID `{observationId}` where auditee is assigned
- Parent audit is unlocked

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "auditeePersonTier1": "John Doe",
     "auditeeFeedback": "We have implemented corrective actions",
     "targetDate": "2025-03-01T00:00:00Z",
     "currentStatus": "MR_UNDER_REVIEW"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Fields updated successfully
- Only auditee-editable fields changed
- Auditor fields remain unchanged

**Assertions**:
- Auditee fields updated
- Auditor fields protected
- Update logged in audit trail

---

#### API-032: Auditee Edit Fields - Non-Assigned User Denied
**Objective**: Verify non-assigned AUDITEE cannot edit observation fields
**Role**: AUDITEE
**Prerequisites**:
- Authenticated as AUDITEE (not assigned to observation)
- Observation with ID `{observationId}`

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "auditeeFeedback": "Unauthorized edit attempt"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden
- Error: "Not assigned to this observation"
- No fields changed

**Assertions**:
- Edit blocked
- Assignment check enforced
- Observation unchanged

---

#### API-033: Auditee Edit Auditor Fields Denied
**Objective**: Verify AUDITEE cannot edit auditor-owned fields
**Role**: AUDITEE
**Prerequisites**:
- Authenticated as AUDITEE (assigned to observation)
- Observation with ID `{observationId}`

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "observationText": "Trying to change observation text",
     "riskCategory": "A",
     "auditorPerson": "Changing auditor"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden OR HTTP 200 with auditor fields unchanged
- Auditor fields remain original values
- Only auditee fields (if present) are updated

**Assertions**:
- Auditor fields protected
- Field-level access control enforced

---

#### API-034: Auditee Edit - Locked Audit Blocked
**Objective**: Verify locked audit prevents auditee edits
**Role**: AUDITEE
**Prerequisites**:
- Authenticated as AUDITEE (assigned to observation)
- Observation with ID `{observationId}`
- Parent audit is LOCKED

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "auditeeFeedback": "Trying to edit with locked audit"
   }
   ```

**Expected Results**:
- HTTP 403 Forbidden
- Error: "Audit is locked"
- No fields changed

**Assertions**:
- Locked audit blocks all edits except CFO
- Auditee respects audit lock

---

### Category 5: Audit Lifecycle Operations

#### API-035: Lock Audit Blocks Submissions
**Objective**: Verify locking audit prevents observation submissions
**Role**: Multi-role workflow
**Prerequisites**:
- CFO authenticated
- Unlocked audit with draft observation
- AUDITOR user exists

**Test Steps**:
1. As CFO: POST /api/v1/audits/{auditId}/lock
2. Authenticate as AUDITOR
3. As AUDITOR: POST /api/v1/observations/{observationId}/submit

**Expected Results**:
- Step 1: Audit locked successfully
- Step 3: HTTP 403 Forbidden - submission blocked by audit lock

**Assertions**:
- Lock operation cascades to prevent submissions
- Error message indicates audit lock reason

---

#### API-036: Complete Audit Locks Operations
**Objective**: Verify completing audit automatically locks it
**Role**: CXO_TEAM
**Prerequisites**:
- Authenticated as CXO_TEAM
- Unlocked audit with ID `{auditId}`

**Test Steps**:
1. POST /api/v1/audits/{auditId}/complete
2. Verify audit.isLocked === true
3. Verify audit.completedAt is present
4. Attempt to edit observation in completed audit

**Expected Results**:
- Audit marked complete
- isLocked automatically set to true
- Observation edit blocked (except CFO)

**Assertions**:
- Completion implies lock
- Operations restricted as expected

---

#### API-037: CFO Override on Locked Audit
**Objective**: Verify CFO can edit observations in locked audits
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Locked audit with observation

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "observationText": "CFO override edit on locked audit"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Edit succeeds despite audit lock
- CFO short-circuit allows operation

**Assertions**:
- CFO bypasses audit lock
- Edit persists to database

---

#### API-038: CFO Override on Completed Audit
**Objective**: Verify CFO can edit observations in completed audits
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- Completed audit (isLocked=true, completedAt present)

**Test Steps**:
1. PATCH /api/v1/observations/{observationId}
   ```json
   {
     "observationText": "CFO edit on completed audit"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Edit succeeds
- CFO can modify completed audit observations

**Assertions**:
- CFO has full override capability
- Completion doesn't block CFO

---

#### API-039: Unlock Allows Operations Again
**Objective**: Verify unlocking audit re-enables operations
**Role**: Multi-role workflow
**Prerequisites**:
- CFO authenticated
- Locked audit with draft observation

**Test Steps**:
1. As CFO: POST /api/v1/audits/{auditId}/unlock
2. Authenticate as AUDITOR
3. As AUDITOR: POST /api/v1/observations/{observationId}/submit

**Expected Results**:
- Step 1: Audit unlocked (isLocked = false)
- Step 3: HTTP 200 OK - submission succeeds

**Assertions**:
- Unlock re-enables operations
- Auditor can submit after unlock

---

#### API-040: Visibility Rules Applied to Audit Lists
**Objective**: Verify visibility configuration affects audit list for auditors
**Role**: Multi-role workflow
**Prerequisites**:
- Authenticated as CXO_TEAM
- Multiple audits exist (some older than 12 months)

**Test Steps**:
1. As CXO_TEAM: PATCH /api/v1/audits/{auditId}/visibility
   ```json
   {
     "visibilityRules": {
       "mode": "last_12m"
     }
   }
   ```
2. Authenticate as AUDITOR
3. As AUDITOR: GET /api/v1/audits
4. Count audits in response

**Expected Results**:
- Auditor only sees audits from last 12 months
- Older audits filtered out
- CFO/CXO still see all audits

**Assertions**:
- Visibility rules enforced for auditors
- CFO/CXO bypass visibility rules

---

#### API-041: Change Request Workflow - Create
**Objective**: Verify auditor can request changes on approved observations
**Role**: AUDITOR
**Prerequisites**:
- Authenticated as AUDITOR
- APPROVED observation with ID `{observationId}`

**Test Steps**:
1. POST /api/v1/observations/{observationId}/change-requests
   ```json
   {
     "patch": {
       "observationText": "Updated text after approval"
     },
     "comment": "Need to clarify wording"
   }
   ```

**Expected Results**:
- HTTP 201 Created
- Change request created with status "PENDING"
- Original observation unchanged
- CFO/Audit Head can approve or deny request

**Assertions**:
- Change request workflow activated
- Request recorded in database
- WebSocket notification sent

---

#### API-042: Change Request Workflow - Approve
**Objective**: Verify CFO can approve change requests
**Role**: CFO
**Prerequisites**:
- Authenticated as CFO
- PENDING change request with ID `{changeRequestId}` (from API-041)

**Test Steps**:
1. POST /api/v1/observations/{observationId}/change-requests/{changeRequestId}
   ```json
   {
     "approve": true,
     "decisionComment": "Approved - clarification is helpful"
   }
   ```

**Expected Results**:
- HTTP 200 OK
- Change request status = "APPROVED"
- Observation updated with patch values
- Decision metadata recorded

**Assertions**:
- Change applied to observation
- Audit trail updated
- Change request marked approved

---

## Test Execution Notes

### Test Data Cleanup
After running tests, clean up test data:
```bash
npm run db:reset
npm run db:seed
```

### Common Assertions Pattern
```javascript
// Status code check
expect(response.status).toBe(expectedStatusCode);

// Response structure
expect(response.data).toHaveProperty('audit');
expect(response.data.audit).toHaveProperty('id');

// Authorization verification
if (shouldBeDenied) {
  expect(response.status).toBe(403);
  expect(response.data.error).toMatch(/forbidden/i);
}

// Database verification
const dbRecord = await prisma.observation.findUnique({
  where: { id: observationId }
});
expect(dbRecord).not.toBeNull();
```

### Error Response Format
All API errors should follow this format:
```json
{
  "error": "Forbidden",
  "details": "Optional detailed explanation"
}
```

---

## Test Coverage Matrix

| Role | Create Audit | Lock Audit | Create Obs | Submit Obs | Approve Obs | Delete Obs | Assign Auditee | Edit Auditee Fields |
|------|--------------|------------|------------|------------|-------------|------------|----------------|---------------------|
| **CFO** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (always) | ✅ | ✅ |
| **CXO_TEAM** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **AUDIT_HEAD** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ (if unlocked) | ✅ | ❌ |
| **AUDITOR** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **AUDITEE** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (if assigned) |

---

## Known Issues and Edge Cases

1. **Guest Role**: Not tested in this suite - guest role should be read-only across all endpoints
2. **Concurrent Edits**: WebSocket real-time updates not tested in API-only tests
3. **Audit Trail**: Verify audit trail events are created for all state changes
4. **Scope Restrictions**: Guest scope filtering not covered in these tests

---

## Next Steps

1. Implement these test cases using Vitest or Jest
2. Add integration tests for WebSocket broadcasting
3. Create performance tests for list endpoints with large datasets
4. Add E2E tests using Playwright (see RBAC_TASK_5_TESTCASES.md)
