# RBAC Task 4: Observation Management API - Backend Test Cases

## Test Summary

This document contains comprehensive backend API test cases for the RBAC v2 Observation Management implementation. All tests use HTTP/REST API calls with authentication via NextAuth JWT sessions.

**Total Test Cases**: 87
**Coverage Areas**:
- Observation listing with role-based filtering (12 tests)
- Observation detail retrieval with RBAC checks (8 tests)
- Observation updates with field-level permissions (18 tests)
- Submit workflow endpoint (10 tests)
- Approve workflow endpoint (12 tests)
- Reject workflow endpoint (12 tests)
- Delete observation endpoint (9 tests)
- Assign auditee endpoint (6 tests)

**Base URL**: `http://localhost:3005`

**Authentication**: All tests require authentication cookie from POST `/api/auth/callback/credentials`

---

## Test Data Setup Prerequisites

Before running these tests, ensure:
1. Database is seeded with `npm run db:seed`
2. Test audit exists with `isLocked = false` and `isLocked = true` variants
3. Test observation exists in DRAFT, SUBMITTED, APPROVED, and REJECTED states
4. AuditAssignment records link auditors to test audits
5. ObservationAssignment records link auditees to test observations

### Required Test Users (from seed data)
- **CFO**: cfo@example.com / cfo123
- **CXO**: cxo@example.com / cxo123
- **Audit Head**: audithead@example.com / audithead123
- **Auditor**: auditor@example.com / auditor123
- **Auditee**: auditee@example.com / auditee123
- **Guest**: guest@example.com / guest123

---

## Authentication Helper

All tests require a valid session cookie. Use this helper to authenticate:

```bash
# Login and extract session cookie
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cfo@example.com",
    "password": "cfo123",
    "csrfToken": ""
  }' \
  -c cookies.txt -b cookies.txt

# Use cookies.txt with -b flag in subsequent requests
```

For all test cases below, assume `-b cookies.txt` is included in curl commands.

---

## Test Group 1: GET /api/v1/observations (List Observations with RBAC Filtering)

### API-001: CFO Can View All Observations
**Objective**: Verify CFO can retrieve all observations regardless of assignments
**Prerequisites**: Login as CFO, at least 5 observations exist in database
**Test Data**: N/A

**Steps**:
```bash
# Login as CFO
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "cfo@example.com", "password": "cfo123"}' \
  -c cfo-cookies.txt

# Get all observations
curl -X GET http://localhost:3005/api/v1/observations \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response body: `{ "ok": true, "observations": [...] }`
- All observations returned (no filtering applied)
- Response includes observations from all audits and plants

---

### API-002: CXO Team Can View All Observations
**Objective**: Verify CXO_TEAM can retrieve all observations
**Prerequisites**: Login as CXO Team member

**Steps**:
```bash
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "cxo@example.com", "password": "cxo123"}' \
  -c cxo-cookies.txt

curl -X GET http://localhost:3005/api/v1/observations \
  -b cxo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- All observations returned (CXO_TEAM has full visibility)

---

### API-003: Audit Head Sees Observations From Assigned Audits (as Head)
**Objective**: Verify AUDIT_HEAD sees observations where `audit.auditHeadId = user.id`
**Prerequisites**:
- Login as Audit Head
- Audit exists with `auditHeadId` set to audit head user ID
- Audit has at least 2 observations

**Steps**:
```bash
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "audithead@example.com", "password": "audithead123"}' \
  -c audithead-cookies.txt

curl -X GET http://localhost:3005/api/v1/observations \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response includes observations from audits where audit head is designated
- Response excludes observations from audits where they are NOT the head and have no assignment

---

### API-004: Audit Head Sees Observations From Audits With AuditAssignment
**Objective**: Verify AUDIT_HEAD sees observations where they have `AuditAssignment`
**Prerequisites**:
- Login as Audit Head
- AuditAssignment exists linking audit head as auditor to an audit
- That audit has observations

**Steps**:
```bash
curl -X GET http://localhost:3005/api/v1/observations \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response includes observations from audits with AuditAssignment (even if not audit head)

---

### API-005: Auditor Sees Only Assigned Audit Observations
**Objective**: Verify AUDITOR sees only observations from audits with AuditAssignment
**Prerequisites**:
- Login as Auditor
- AuditAssignment exists for auditor on specific audit
- Other audits exist without assignments

**Steps**:
```bash
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "auditor@example.com", "password": "auditor123"}' \
  -c auditor-cookies.txt

curl -X GET http://localhost:3005/api/v1/observations \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response includes ONLY observations from audits with AuditAssignment for this auditor
- Observations from other audits are excluded

---

### API-006: Auditee Sees Only Assigned Observations
**Objective**: Verify AUDITEE sees only observations with ObservationAssignment
**Prerequisites**:
- Login as Auditee
- ObservationAssignment exists linking auditee to specific observations
- Other observations exist without assignments

**Steps**:
```bash
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "auditee@example.com", "password": "auditee123"}' \
  -c auditee-cookies.txt

curl -X GET http://localhost:3005/api/v1/observations \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response includes ONLY observations with ObservationAssignment for this auditee
- No observations from audits without assignment

---

### API-007: Guest Sees Only Published and Approved Observations
**Objective**: Verify GUEST sees only observations with `isPublished = true` and `approvalStatus = APPROVED`
**Prerequisites**:
- Login as Guest
- Mix of published/unpublished observations exist
- Mix of approval statuses exist

**Steps**:
```bash
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "guest@example.com", "password": "guest123"}' \
  -c guest-cookies.txt

curl -X GET http://localhost:3005/api/v1/observations \
  -b guest-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response includes ONLY observations where `isPublished = true` AND `approvalStatus = APPROVED`
- Draft and unpublished observations excluded

---

### API-008: Filter Observations by Plant ID
**Objective**: Verify plantId query parameter filters observations correctly
**Prerequisites**: Login as CFO, observations exist for multiple plants

**Steps**:
```bash
# Get specific plant ID first
PLANT_ID=$(curl -X GET http://localhost:3005/api/v1/plants -b cfo-cookies.txt | jq -r '.plants[0].id')

# Filter by plant
curl -X GET "http://localhost:3005/api/v1/observations?plantId=$PLANT_ID" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- All observations have matching `plantId`

---

### API-009: Filter Observations by Audit ID
**Objective**: Verify auditId query parameter filters observations correctly
**Prerequisites**: Login as CFO, observations exist for multiple audits

**Steps**:
```bash
AUDIT_ID="<audit_id_from_seed>"
curl -X GET "http://localhost:3005/api/v1/observations?auditId=$AUDIT_ID" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- All observations have matching `auditId`

---

### API-010: Filter by Risk Category
**Objective**: Verify risk query parameter filters by riskCategory
**Prerequisites**: Login as CFO, observations with different risk categories exist

**Steps**:
```bash
curl -X GET "http://localhost:3005/api/v1/observations?risk=A" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- All observations have `riskCategory = "A"`

---

### API-011: Search Observations by Text Query
**Objective**: Verify q query parameter searches observation text fields
**Prerequisites**: Login as CFO, observations with searchable text exist

**Steps**:
```bash
curl -X GET "http://localhost:3005/api/v1/observations?q=compliance" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Observations returned contain "compliance" in `observationText`, `risksInvolved`, or `auditeeFeedback`

---

### API-012: Sort Observations by Created Date Descending
**Objective**: Verify sortBy and sortOrder parameters work correctly
**Prerequisites**: Login as CFO, multiple observations exist

**Steps**:
```bash
curl -X GET "http://localhost:3005/api/v1/observations?sortBy=createdAt&sortOrder=desc" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Observations sorted by `createdAt` in descending order (newest first)

---

## Test Group 2: GET /api/v1/observations/[id] (Single Observation Retrieval)

### API-013: CFO Can View Any Observation
**Objective**: Verify CFO can retrieve any observation by ID
**Prerequisites**: Login as CFO, observation ID exists

**Steps**:
```bash
OBS_ID="<observation_id>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Full observation object returned with all relations (audit, plant, attachments, approvals, notes, assignments)

---

### API-014: Audit Head Can View Observation From Assigned Audit
**Objective**: Verify AUDIT_HEAD can view observation where they are audit head
**Prerequisites**: Audit head user, observation from audit where `audit.auditHeadId = user.id`

**Steps**:
```bash
OBS_ID="<observation_id_from_assigned_audit>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Full observation object returned

---

### API-015: Audit Head Cannot View Observation From Unassigned Audit
**Objective**: Verify AUDIT_HEAD receives 404 for observations from unassigned audits
**Prerequisites**: Audit head user, observation from audit where they have no association

**Steps**:
```bash
OBS_ID="<observation_id_from_unassigned_audit>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 404 Not Found
- Response: `{ "ok": false, "error": "Not found" }`

---

### API-016: Auditor Can View Observation From Assigned Audit
**Objective**: Verify AUDITOR can view observation from audit with AuditAssignment
**Prerequisites**: Auditor user, AuditAssignment exists, observation from that audit

**Steps**:
```bash
OBS_ID="<observation_id_from_assigned_audit>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Full observation object returned

---

### API-017: Auditor Cannot View Observation From Unassigned Audit
**Objective**: Verify AUDITOR receives 404 for observations from unassigned audits
**Prerequisites**: Auditor user, observation from audit without AuditAssignment

**Steps**:
```bash
OBS_ID="<observation_id_from_unassigned_audit>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 404 Not Found

---

### API-018: Auditee Can View Assigned Observation
**Objective**: Verify AUDITEE can view observation with ObservationAssignment
**Prerequisites**: Auditee user, ObservationAssignment exists for this observation

**Steps**:
```bash
OBS_ID="<observation_id_with_assignment>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Observation returned with notes filtered to `visibility = ALL`

---

### API-019: Auditee Cannot View Unassigned Observation
**Objective**: Verify AUDITEE receives 404 for observations without ObservationAssignment
**Prerequisites**: Auditee user, observation without ObservationAssignment

**Steps**:
```bash
OBS_ID="<observation_id_without_assignment>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 404 Not Found

---

### API-020: Guest Can View Published Approved Observation
**Objective**: Verify GUEST can view observation with `isPublished = true` and `approvalStatus = APPROVED`
**Prerequisites**: Guest user, observation is published and approved

**Steps**:
```bash
OBS_ID="<published_approved_observation_id>"
curl -X GET "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b guest-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Observation returned with notes filtered to `visibility = ALL`

---

## Test Group 3: PATCH /api/v1/observations/[id] (Update Observation)

### API-021: CFO Can Update Any Field Regardless of Approval Status
**Objective**: Verify CFO short-circuit allows editing all fields even when APPROVED
**Prerequisites**: CFO user, observation with `approvalStatus = APPROVED`

**Steps**:
```bash
OBS_ID="<approved_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "observationText": "Updated by CFO on approved observation",
    "auditeeFeedback": "CFO can edit auditee fields too"
  }' \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Both auditor and auditee fields updated successfully
- Audit trail logged with action "UPDATE"
- WebSocket notification sent

---

### API-022: CFO Can Update Observation in Locked Audit
**Objective**: Verify CFO bypasses audit lock restrictions
**Prerequisites**: CFO user, observation in audit with `isLocked = true`

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "CFO update in locked audit"}' \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Update succeeds despite audit lock

---

### API-023: Auditor Can Update Auditor Fields in DRAFT Status
**Objective**: Verify AUDITOR can edit auditor fields when `approvalStatus = DRAFT`
**Prerequisites**: Auditor user, observation with `approvalStatus = DRAFT`, AuditAssignment exists

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "observationText": "Updated observation text",
    "riskCategory": "B",
    "concernedProcess": "P2P"
  }' \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Auditor fields updated successfully
- Audit trail logged
- WebSocket notification sent

---

### API-024: Auditor Can Update Auditor Fields in REJECTED Status
**Objective**: Verify AUDITOR can edit auditor fields when `approvalStatus = REJECTED`
**Prerequisites**: Auditor user, observation with `approvalStatus = REJECTED`

**Steps**:
```bash
OBS_ID="<rejected_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Addressing rejection feedback"}' \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Update succeeds for rejected observation

---

### API-025: Auditor Cannot Update Auditor Fields When SUBMITTED
**Objective**: Verify AUDITOR blocked from editing when `approvalStatus = SUBMITTED`
**Prerequisites**: Auditor user, observation with `approvalStatus = SUBMITTED`

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Trying to update submitted"}' \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Can only edit auditor fields when observation is DRAFT or REJECTED"

---

### API-026: Auditor Cannot Update Auditor Fields When APPROVED
**Objective**: Verify AUDITOR blocked from editing when `approvalStatus = APPROVED`
**Prerequisites**: Auditor user, observation with `approvalStatus = APPROVED`

**Steps**:
```bash
OBS_ID="<approved_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Trying to update approved"}' \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Can only edit auditor fields when observation is DRAFT or REJECTED"

---

### API-027: Auditor Cannot Update Auditee Fields
**Objective**: Verify AUDITOR cannot edit auditee fields
**Prerequisites**: Auditor user, draft observation

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"auditeeFeedback": "Auditor trying to set feedback"}' \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "No permitted fields to update"

---

### API-028: Auditor Cannot Update When Audit Locked
**Objective**: Verify AUDITOR blocked by audit lock
**Prerequisites**: Auditor user, observation in locked audit

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Update attempt"}' \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Audit is locked. No modifications allowed."

---

### API-029: Auditor Cannot Update Without AuditAssignment
**Objective**: Verify AUDITOR blocked without AuditAssignment to parent audit
**Prerequisites**: Auditor user, observation from audit without AuditAssignment

**Steps**:
```bash
OBS_ID="<observation_from_unassigned_audit>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Update attempt"}' \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Forbidden"

---

### API-030: Audit Head Can Update Auditor Fields in DRAFT
**Objective**: Verify AUDIT_HEAD can edit auditor fields when DRAFT
**Prerequisites**: Audit head user, observation with `approvalStatus = DRAFT`, audit head is `audit.auditHeadId`

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Audit head updating draft"}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Update succeeds

---

### API-031: Audit Head Cannot Update Auditor Fields When APPROVED
**Objective**: Verify AUDIT_HEAD blocked from editing auditor fields when APPROVED
**Prerequisites**: Audit head user, observation with `approvalStatus = APPROVED`

**Steps**:
```bash
OBS_ID="<approved_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Audit head update attempt"}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Can only edit auditor fields when observation is DRAFT or REJECTED"

---

### API-032: Auditee Can Update Auditee Fields on Assigned Observation
**Objective**: Verify AUDITEE can edit auditee fields with ObservationAssignment
**Prerequisites**: Auditee user, ObservationAssignment exists, audit not locked

**Steps**:
```bash
OBS_ID="<assigned_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "auditeeFeedback": "Auditee response provided",
    "targetDate": "2025-12-31T23:59:59Z",
    "personResponsibleToImplement": "John Doe"
  }' \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Auditee fields updated
- Audit trail logged
- WebSocket notification sent

---

### API-033: Auditee Can Update Even When Observation APPROVED
**Objective**: Verify AUDITEE can edit auditee fields even when `approvalStatus = APPROVED` (as long as audit not locked)
**Prerequisites**: Auditee user, observation with `approvalStatus = APPROVED`, ObservationAssignment exists, audit not locked

**Steps**:
```bash
OBS_ID="<approved_assigned_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"auditeeFeedback": "Feedback on approved observation"}' \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Update succeeds despite APPROVED status

---

### API-034: Auditee Cannot Update Without ObservationAssignment
**Objective**: Verify AUDITEE blocked without ObservationAssignment
**Prerequisites**: Auditee user, observation without ObservationAssignment

**Steps**:
```bash
OBS_ID="<unassigned_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"auditeeFeedback": "Unauthorized attempt"}' \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "You are not assigned to this observation"

---

### API-035: Auditee Cannot Update When Audit Locked
**Objective**: Verify AUDITEE blocked by audit lock
**Prerequisites**: Auditee user, ObservationAssignment exists, audit is locked

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"auditeeFeedback": "Locked audit update"}' \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Audit is locked. No modifications allowed."

---

### API-036: Auditee Cannot Update Auditor Fields
**Objective**: Verify AUDITEE cannot edit auditor fields
**Prerequisites**: Auditee user, ObservationAssignment exists

**Steps**:
```bash
OBS_ID="<assigned_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Auditee trying to edit auditor field"}' \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "No permitted fields to update"

---

### API-037: Auto-Transition Status When Auditee Provides Feedback
**Objective**: Verify `currentStatus` transitions from PENDING_MR to MR_UNDER_REVIEW when auditee provides feedback
**Prerequisites**: Auditee user, observation with `currentStatus = PENDING_MR`

**Steps**:
```bash
OBS_ID="<observation_pending_mr>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"auditeeFeedback": "Management response provided"}' \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- `currentStatus` automatically set to "MR_UNDER_REVIEW"

---

### API-038: CXO Team Cannot Update Observations
**Objective**: Verify CXO_TEAM role cannot update observations
**Prerequisites**: CXO Team user, observation exists

**Steps**:
```bash
OBS_ID="<any_observation_id>"
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "CXO trying to update"}' \
  -b cxo-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

## Test Group 4: POST /api/v1/observations/[id]/submit (Submit for Approval)

### API-039: Auditor Can Submit DRAFT Observation
**Objective**: Verify AUDITOR can submit observation with `approvalStatus = DRAFT`
**Prerequisites**: Auditor user, AuditAssignment exists, observation is DRAFT, audit not locked

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response: `{ "ok": true, "observation": { "approvalStatus": "SUBMITTED", ... } }`
- Approval record created with status "SUBMITTED"
- Audit trail logged with action "SUBMIT"
- WebSocket notification sent

---

### API-040: Auditor Can Submit REJECTED Observation
**Objective**: Verify AUDITOR can resubmit observation with `approvalStatus = REJECTED`
**Prerequisites**: Auditor user, observation is REJECTED

**Steps**:
```bash
OBS_ID="<rejected_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- `approvalStatus` transitions from REJECTED to SUBMITTED

---

### API-041: Auditor Cannot Submit SUBMITTED Observation
**Objective**: Verify duplicate submission is blocked
**Prerequisites**: Auditor user, observation is already SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Observation is already submitted"

---

### API-042: Auditor Cannot Submit APPROVED Observation
**Objective**: Verify cannot submit approved observation
**Prerequisites**: Auditor user, observation is APPROVED

**Steps**:
```bash
OBS_ID="<approved_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Observation is already approved. Use change request workflow if needed."

---

### API-043: Auditor Cannot Submit Without AuditAssignment
**Objective**: Verify AUDITOR blocked without AuditAssignment
**Prerequisites**: Auditor user, observation from unassigned audit

**Steps**:
```bash
OBS_ID="<observation_from_unassigned_audit>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "You are not assigned to this audit"

---

### API-044: Auditor Cannot Submit When Audit Locked
**Objective**: Verify audit lock blocks submission
**Prerequisites**: Auditor user, observation in locked audit

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Audit is locked. Cannot submit observation."

---

### API-045: Audit Head Can Submit Observation
**Objective**: Verify AUDIT_HEAD can submit observations from assigned audits
**Prerequisites**: Audit head user, observation is DRAFT, audit head is designated

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Submission succeeds

---

### API-046: CFO Can Submit Any Observation
**Objective**: Verify CFO can submit any observation regardless of assignments or lock
**Prerequisites**: CFO user, observation in locked audit

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Submission succeeds despite lock

---

### API-047: Auditee Cannot Submit Observation
**Objective**: Verify AUDITEE role cannot submit observations
**Prerequisites**: Auditee user

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Forbidden" (from assertAuditorOrAuditHead)

---

### API-048: CXO Team Cannot Submit Observation
**Objective**: Verify CXO_TEAM role cannot submit observations
**Prerequisites**: CXO Team user

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b cxo-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

## Test Group 5: POST /api/v1/observations/[id]/approve (Approve Observation)

### API-049: Audit Head Can Approve SUBMITTED Observation
**Objective**: Verify AUDIT_HEAD can approve observation where they are audit head
**Prerequisites**: Audit head user, observation is SUBMITTED, `audit.auditHeadId = user.id`, audit not locked

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved by audit head"}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response: `{ "ok": true, "observation": { "approvalStatus": "APPROVED", ... } }`
- Approval record created with status "APPROVED" and comment
- Audit trail logged with action "APPROVE"
- WebSocket notification sent

---

### API-050: Audit Head Cannot Approve DRAFT Observation
**Objective**: Verify cannot approve observation that hasn't been submitted
**Prerequisites**: Audit head user, observation is DRAFT

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Cannot approve a draft observation. It must be submitted first."

---

### API-051: Audit Head Cannot Approve REJECTED Observation
**Objective**: Verify cannot approve rejected observation without resubmission
**Prerequisites**: Audit head user, observation is REJECTED

**Steps**:
```bash
OBS_ID="<rejected_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Cannot approve a rejected observation. It must be resubmitted first."

---

### API-052: Audit Head Cannot Approve Already APPROVED Observation
**Objective**: Verify duplicate approval is blocked
**Prerequisites**: Audit head user, observation is already APPROVED

**Steps**:
```bash
OBS_ID="<approved_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Observation is already approved"

---

### API-053: Audit Head Cannot Approve If Not Audit Head for That Audit
**Objective**: Verify AUDIT_HEAD blocked if they are not `audit.auditHeadId`
**Prerequisites**: Audit head user, observation from audit where different user is audit head

**Steps**:
```bash
# Login as different audit head
curl -X POST http://localhost:3005/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "audithead2@example.com", "password": "audithead2123"}' \
  -c audithead2-cookies.txt

OBS_ID="<observation_from_other_audit_head>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b audithead2-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Only the audit head for this audit can approve observations"

---

### API-054: Audit Head Cannot Approve When Audit Locked
**Objective**: Verify audit lock blocks approval
**Prerequisites**: Audit head user, observation in locked audit

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Audit is locked. Cannot approve observation."

---

### API-055: CFO Can Approve Any Observation Regardless of Lock
**Objective**: Verify CFO bypasses all approval restrictions
**Prerequisites**: CFO user, observation in locked audit, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_in_locked_audit>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -H "Content-Type: application/json" \
  -d '{"comment": "CFO override approval"}' \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Approval succeeds despite lock

---

### API-056: Auditor Cannot Approve Observation
**Objective**: Verify AUDITOR role cannot approve observations
**Prerequisites**: Auditor user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Forbidden" (from assertAuditHead)

---

### API-057: CXO Team Cannot Approve Observation
**Objective**: Verify CXO_TEAM role cannot approve observations
**Prerequisites**: CXO Team user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b cxo-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

### API-058: Auditee Cannot Approve Observation
**Objective**: Verify AUDITEE role cannot approve observations
**Prerequisites**: Auditee user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

### API-059: Approval Without Comment
**Objective**: Verify approval works without optional comment
**Prerequisites**: Audit head user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Approval created with `comment = null`

---

### API-060: Approval With Comment
**Objective**: Verify approval comment is stored correctly
**Prerequisites**: Audit head user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/approve" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Looks good, approved for implementation"}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Approval record contains comment
- Audit trail diff includes comment

---

## Test Group 6: POST /api/v1/observations/[id]/reject (Reject Observation)

### API-061: Audit Head Can Reject SUBMITTED Observation
**Objective**: Verify AUDIT_HEAD can reject observation where they are audit head
**Prerequisites**: Audit head user, observation is SUBMITTED, `audit.auditHeadId = user.id`, audit not locked

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Needs more detail on impact assessment"}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response: `{ "ok": true, "observation": { "approvalStatus": "REJECTED", ... } }`
- Approval record created with status "REJECTED" and comment
- Audit trail logged with action "REJECT"
- WebSocket notification sent

---

### API-062: Audit Head Cannot Reject DRAFT Observation
**Objective**: Verify cannot reject observation that hasn't been submitted
**Prerequisites**: Audit head user, observation is DRAFT

**Steps**:
```bash
OBS_ID="<draft_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Cannot reject a draft observation. It has not been submitted yet."

---

### API-063: Audit Head Cannot Reject Already REJECTED Observation
**Objective**: Verify duplicate rejection is blocked
**Prerequisites**: Audit head user, observation is already REJECTED

**Steps**:
```bash
OBS_ID="<rejected_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Observation is already rejected"

---

### API-064: Audit Head Cannot Reject APPROVED Observation
**Objective**: Verify cannot reject approved observation
**Prerequisites**: Audit head user, observation is APPROVED

**Steps**:
```bash
OBS_ID="<approved_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Cannot reject an approved observation. Use change request workflow if needed."

---

### API-065: Audit Head Cannot Reject If Not Audit Head for That Audit
**Objective**: Verify AUDIT_HEAD blocked if they are not `audit.auditHeadId`
**Prerequisites**: Audit head user, observation from audit where different user is audit head

**Steps**:
```bash
OBS_ID="<observation_from_other_audit_head>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Unauthorized rejection attempt"}' \
  -b audithead2-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Only the audit head for this audit can reject observations"

---

### API-066: Audit Head Cannot Reject When Audit Locked
**Objective**: Verify audit lock blocks rejection
**Prerequisites**: Audit head user, observation in locked audit

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Audit is locked. Cannot reject observation."

---

### API-067: CFO Can Reject Any Observation Regardless of Lock
**Objective**: Verify CFO bypasses all rejection restrictions
**Prerequisites**: CFO user, observation in locked audit, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_in_locked_audit>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{"comment": "CFO override rejection"}' \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Rejection succeeds despite lock

---

### API-068: Auditor Cannot Reject Observation
**Objective**: Verify AUDITOR role cannot reject observations
**Prerequisites**: Auditor user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

### API-069: CXO Team Cannot Reject Observation
**Objective**: Verify CXO_TEAM role cannot reject observations
**Prerequisites**: CXO Team user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -b cxo-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

### API-070: Rejection Without Comment
**Objective**: Verify rejection works without optional comment
**Prerequisites**: Audit head user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Rejection succeeds with `comment = null`

---

### API-071: Rejection With Detailed Comment
**Objective**: Verify rejection comment is stored correctly
**Prerequisites**: Audit head user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Risk assessment incomplete. Please elaborate on financial impact."}' \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Approval record contains detailed comment
- Audit trail diff includes comment

---

### API-072: Rejected Observation Can Be Edited and Resubmitted
**Objective**: Verify workflow cycle: SUBMITTED → REJECTED → edit → SUBMITTED
**Prerequisites**: Audit head user, auditor user, observation is SUBMITTED

**Steps**:
```bash
OBS_ID="<submitted_observation_id>"

# Step 1: Reject as audit head
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Needs revision"}' \
  -b audithead-cookies.txt

# Step 2: Edit as auditor
curl -X PATCH "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -H "Content-Type: application/json" \
  -d '{"observationText": "Revised observation text"}' \
  -b auditor-cookies.txt

# Step 3: Resubmit as auditor
curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/submit" \
  -b auditor-cookies.txt
```

**Expected Result**:
- All three steps succeed
- Final status: SUBMITTED
- Audit trail shows complete cycle

---

## Test Group 7: DELETE /api/v1/observations/[id] (Delete Observation)

### API-073: CFO Can Delete Any Observation
**Objective**: Verify CFO can delete any observation regardless of lock status
**Prerequisites**: CFO user, observation exists

**Steps**:
```bash
# Create test observation first
curl -X POST http://localhost:3005/api/v1/observations \
  -H "Content-Type: application/json" \
  -d '{
    "auditId": "<audit_id>",
    "observationText": "Test observation for deletion"
  }' \
  -b cfo-cookies.txt

OBS_ID="<created_observation_id>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response: `{ "ok": true, "message": "Observation deleted successfully" }`
- Observation removed from database
- Audit trail logged with action "DELETE" and observation snapshot

---

### API-074: CFO Can Delete Observation in Locked Audit
**Objective**: Verify CFO bypasses audit lock for deletion
**Prerequisites**: CFO user, observation in locked audit

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Deletion succeeds despite lock

---

### API-075: Audit Head Can Delete Observation When Audit Not Locked
**Objective**: Verify AUDIT_HEAD can delete from unlocked audit where they are audit head
**Prerequisites**: Audit head user, observation in unlocked audit, `audit.auditHeadId = user.id`

**Steps**:
```bash
OBS_ID="<observation_in_unlocked_audit>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Deletion succeeds

---

### API-076: Audit Head Cannot Delete Observation When Audit Locked
**Objective**: Verify AUDIT_HEAD blocked by audit lock
**Prerequisites**: Audit head user, observation in locked audit, `audit.auditHeadId = user.id`

**Steps**:
```bash
OBS_ID="<observation_in_locked_audit>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Audit is locked. Cannot delete observation."

---

### API-077: Audit Head Cannot Delete If Not Audit Head for That Audit
**Objective**: Verify AUDIT_HEAD blocked if they are not `audit.auditHeadId`
**Prerequisites**: Audit head user, observation from audit where different user is audit head

**Steps**:
```bash
OBS_ID="<observation_from_other_audit_head>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b audithead2-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Only the audit head for this audit can delete observations"

---

### API-078: Auditor Cannot Delete Observation
**Objective**: Verify AUDITOR role cannot delete observations
**Prerequisites**: Auditor user

**Steps**:
```bash
OBS_ID="<any_observation_id>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Only CFO or Audit Head can delete observations"

---

### API-079: CXO Team Cannot Delete Observation
**Objective**: Verify CXO_TEAM role cannot delete observations
**Prerequisites**: CXO Team user

**Steps**:
```bash
OBS_ID="<any_observation_id>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b cxo-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

### API-080: Auditee Cannot Delete Observation
**Objective**: Verify AUDITEE role cannot delete observations
**Prerequisites**: Auditee user

**Steps**:
```bash
OBS_ID="<any_observation_id>"
curl -X DELETE "http://localhost:3005/api/v1/observations/$OBS_ID" \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden

---

### API-081: Delete Non-Existent Observation Returns 404
**Objective**: Verify proper error handling for missing observation
**Prerequisites**: Any authenticated user

**Steps**:
```bash
curl -X DELETE "http://localhost:3005/api/v1/observations/nonexistent-id" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 404 Not Found
- Error: "Observation not found"

---

## Test Group 8: POST /api/v1/observations/[id]/assign-auditee (Assign Auditee)

### API-082: CFO Can Assign Auditee
**Objective**: Verify CFO can assign auditee to observation
**Prerequisites**: CFO user, observation exists, auditee user exists with AUDITEE role

**Steps**:
```bash
OBS_ID="<observation_id>"
AUDITEE_ID="<auditee_user_id>"

curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/assign-auditee" \
  -H "Content-Type: application/json" \
  -d "{\"auditeeId\": \"$AUDITEE_ID\"}" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Response: `{ "ok": true, "assignment": {...}, "message": "Successfully assigned auditee to observation" }`
- ObservationAssignment record created
- Audit trail logged with action "ASSIGN_AUDITEE"

---

### API-083: CXO Team Can Assign Auditee
**Objective**: Verify CXO_TEAM can assign auditee to observation
**Prerequisites**: CXO Team user, observation exists, auditee user exists

**Steps**:
```bash
OBS_ID="<observation_id>"
AUDITEE_ID="<auditee_user_id>"

curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/assign-auditee" \
  -H "Content-Type: application/json" \
  -d "{\"auditeeId\": \"$AUDITEE_ID\"}" \
  -b cxo-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Assignment succeeds

---

### API-084: Audit Head Can Assign Auditee
**Objective**: Verify AUDIT_HEAD can assign auditee to observation
**Prerequisites**: Audit head user, observation exists, auditee user exists

**Steps**:
```bash
OBS_ID="<observation_id>"
AUDITEE_ID="<auditee_user_id>"

curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/assign-auditee" \
  -H "Content-Type: application/json" \
  -d "{\"auditeeId\": \"$AUDITEE_ID\"}" \
  -b audithead-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Assignment succeeds

---

### API-085: Auditor Can Assign Auditee
**Objective**: Verify AUDITOR can assign auditee to observation
**Prerequisites**: Auditor user, observation exists, auditee user exists

**Steps**:
```bash
OBS_ID="<observation_id>"
AUDITEE_ID="<auditee_user_id>"

curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/assign-auditee" \
  -H "Content-Type: application/json" \
  -d "{\"auditeeId\": \"$AUDITEE_ID\"}" \
  -b auditor-cookies.txt
```

**Expected Result**:
- Status: 200 OK
- Assignment succeeds

---

### API-086: Auditee Cannot Assign Auditee
**Objective**: Verify AUDITEE role cannot assign auditees
**Prerequisites**: Auditee user

**Steps**:
```bash
OBS_ID="<observation_id>"
AUDITEE_ID="<another_auditee_user_id>"

curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/assign-auditee" \
  -H "Content-Type: application/json" \
  -d "{\"auditeeId\": \"$AUDITEE_ID\"}" \
  -b auditee-cookies.txt
```

**Expected Result**:
- Status: 403 Forbidden
- Error: "Forbidden. Only CFO, CXO Team, Audit Head, or Auditor can assign auditees."

---

### API-087: Cannot Assign User Without AUDITEE Role
**Objective**: Verify assignment validation checks for AUDITEE role
**Prerequisites**: CFO user, auditor user exists with AUDITOR role

**Steps**:
```bash
OBS_ID="<observation_id>"
AUDITOR_ID="<auditor_user_id>"

curl -X POST "http://localhost:3005/api/v1/observations/$OBS_ID/assign-auditee" \
  -H "Content-Type: application/json" \
  -d "{\"auditeeId\": \"$AUDITOR_ID\"}" \
  -b cfo-cookies.txt
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "User is not an auditee. Only users with AUDITEE role can be assigned to observations."

---

## Additional Integration Test Scenarios

### Integration-001: Complete Observation Lifecycle
**Objective**: Test full observation workflow from creation to approval

**Steps**:
1. CFO creates audit (unlocked)
2. Auditor creates observation (DRAFT)
3. Auditor updates observation with details
4. Auditor submits observation (DRAFT → SUBMITTED)
5. Audit head approves observation (SUBMITTED → APPROVED)
6. Auditee is assigned
7. Auditee provides feedback
8. Verify audit trail has all events

**Expected Result**: All steps succeed, audit trail complete

---

### Integration-002: Rejection and Resubmission Cycle
**Objective**: Test rejection workflow

**Steps**:
1. Auditor submits observation
2. Audit head rejects with comment
3. Auditor edits observation
4. Auditor resubmits
5. Audit head approves

**Expected Result**: All steps succeed, status transitions correctly

---

### Integration-003: Audit Lock Enforcement Across All Endpoints
**Objective**: Test audit lock blocks all mutations except CFO

**Steps**:
1. Create observation in unlocked audit
2. Lock audit (CFO action)
3. Attempt PATCH as auditor (blocked)
4. Attempt submit as auditor (blocked)
5. Attempt approve as audit head (blocked)
6. Attempt delete as audit head (blocked)
7. Attempt all operations as CFO (all succeed)

**Expected Result**: Only CFO operations succeed

---

## Test Execution Checklist

- [ ] All 87 API test cases executed
- [ ] Authentication working for all roles
- [ ] RBAC filtering verified for GET endpoints
- [ ] Field-level permissions enforced in PATCH
- [ ] Approval workflow state transitions validated
- [ ] Audit lock enforcement confirmed
- [ ] CFO short-circuit verified across all endpoints
- [ ] Audit trail logging confirmed for all mutations
- [ ] WebSocket notifications sent (verify via WebSocket client)
- [ ] Cascade deletes working correctly
- [ ] Error responses include appropriate status codes and messages

---

## Notes

- All test cases assume seeded database with default users
- Some tests require specific test data setup (locked/unlocked audits, different approval statuses)
- Use Prisma Studio or database queries to verify state changes
- WebSocket notifications can be monitored using a WebSocket client connected to `ws://localhost:3001`
- Audit trail events can be queried from `AuditEvent` table
