# RBAC Task 4: Observation Management API

**Status**: ✅ COMPLETED
**Dependencies**: RBAC_TASK_2
**Document Reference**: RBAC_updated.md - Step 5 (Observation endpoints)
**Implementation Date**: 2025-01-23

---

## Implementation Notes

### Summary
All 7 subtasks have been successfully implemented with full RBAC v2 compliance. The observation management API now enforces proper role-based access control, field-level permissions, and audit lock checks throughout.

### Key Implementation Highlights

1. **AUDIT_HEAD Filtering Enhancement**
   - AUDIT_HEAD can now see observations from audits where they are the audit head (`audit.auditHeadId`) OR have an `AuditAssignment` as auditor
   - This dual-access pattern was correctly implemented in both GET and PATCH endpoints

2. **AUDITEE Assignment-Based Filtering**
   - AUDITEE role now properly filters observations via `ObservationAssignment` table
   - Separated from GUEST scope-based filtering for clarity and correctness

3. **Audit Lock Enforcement**
   - All mutation endpoints (PATCH, submit, approve, reject, DELETE) enforce audit lock checks
   - CFO short-circuit principle consistently applied (CFO bypasses all locks)
   - Lock checks happen early in the request flow to fail fast

4. **Field-Level Permissions**
   - Auditor fields: Only editable by AUDITOR/AUDIT_HEAD when observation is DRAFT or REJECTED
   - Auditee fields: Only editable by AUDITEE (with assignment) even when APPROVED (unless audit locked)
   - CFO can edit all fields regardless of approval status or lock state

5. **Approval Workflow**
   - DRAFT/REJECTED → SUBMITTED → APPROVED/REJECTED cycle properly enforced
   - Only AUDIT_HEAD for the specific audit (`audit.auditHeadId`) can approve/reject (plus CFO override)
   - Proper state validation prevents invalid transitions

6. **Audit Trail Logging**
   - All actions (UPDATE, SUBMIT, APPROVE, REJECT, DELETE, ASSIGN_AUDITEE) logged with proper diff data
   - Deletion logs include observation snapshot before deletion for forensics

7. **WebSocket Broadcasting**
   - Real-time notifications sent for all mutations except DELETE
   - Clients can react to observation status changes instantly

### Notable Implementation Decisions

- **Removed `auditorResponseToAuditee` from AUDITOR_FIELDS**: This field was in the original AUDITOR_FIELDS set but is not in the RBAC v2 specification. Removed for consistency with spec.

- **DELETE Endpoint**: Implemented as additional handler in existing `[id]/route.ts` file rather than separate endpoint, following Next.js conventions.

- **Error Messages**: Used descriptive error messages for better developer experience while maintaining security (no information leakage).

- **Authorization Checks**: Implemented in consistent order: authentication → role check → audit lock → specific permissions → state validation.

### Files Created (4 new endpoints)
- `src/app/api/v1/observations/[id]/submit/route.ts`
- `src/app/api/v1/observations/[id]/approve/route.ts`
- `src/app/api/v1/observations/[id]/reject/route.ts`
- `src/app/api/v1/observations/[id]/assign-auditee/route.ts`

### Files Modified (2 existing endpoints)
- `src/app/api/v1/observations/route.ts` (GET with improved filtering)
- `src/app/api/v1/observations/[id]/route.ts` (GET, PATCH, DELETE with RBAC v2)

### Deprecated Code Removed
- Removed imports and usage of `isAdmin`, `isAdminOrAuditor` from observation routes
- Replaced with proper RBAC v2 helpers (`isCFO`, `isAuditHead`, `isAuditor`, `isAuditee`)

### Testing Recommendations
1. Test each role's access to observations via GET endpoint
2. Test field-level permissions for AUDITOR vs AUDITEE
3. Test audit lock enforcement across all mutation endpoints
4. Test approval workflow state transitions
5. Test DELETE restrictions (CFO vs AUDIT_HEAD, locked vs unlocked)
6. Test auditee assignment and verify filtering works correctly
7. Verify audit trail events are logged correctly
8. Verify WebSocket notifications are sent

---

## Analysis

After examining the codebase, I've identified the current state and requirements:

**Current Implementation:**
- Observation GET collection (`/api/v1/observations/route.ts`) exists but uses old RBAC helpers (isAdmin)
- Observation PATCH (`/api/v1/observations/[id]/route.ts`) exists but needs RBAC v2 updates
- Field-level permissions are partially implemented but need alignment with RBAC v2
- No submit, approve, reject, or assign-auditee endpoints exist yet
- No DELETE handler in observation detail route
- Audit lock checks are missing throughout
- Observation assignments to auditees are not properly filtered in GET requests

**Key Patterns from Existing Code:**
- API routes use `auth()` from `@/lib/auth` for session management
- RBAC helpers from `@/lib/rbac.ts` are used for permission checks
- Audit trail logging via `writeAuditEvent()` from `@/server/auditTrail.ts`
- WebSocket broadcasting via `notifyObservationUpdate()` from `@/websocket/broadcast`
- Async params pattern: `{ params }: { params: Promise<{ id: string }> }`
- Error responses: 401 for unauthorized, 403 for forbidden, 404 for not found

**Approach:**
1. Update existing observation GET and PATCH routes to use RBAC v2 helpers
2. Add audit lock enforcement across all mutation endpoints
3. Implement new approval workflow endpoints (submit, approve, reject)
4. Implement observation DELETE handler
5. Implement auditee assignment endpoint
6. Add proper filtering for AUDITEE role to show only assigned observations
7. Ensure comprehensive audit trail logging for all actions
8. Add proper field-level permission enforcement based on approval status

---

## Subtasks

### 1. Update Observation Collection GET Endpoint
**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/route.ts`

**Action**:
- Replace deprecated RBAC helpers (`isAdmin`, `isAdminOrAuditor`) with RBAC v2 helpers
- Add proper filtering for AUDITEE role to show only assigned observations via `ObservationAssignment`
- Add filtering for AUDIT_HEAD to show observations from audits where they are the audit head (`audit.auditHeadId`)
- Respect `visibilityRules` for historical audits (currently partially implemented but needs audit head check)

**Context**:
The GET endpoint currently uses old role helpers and doesn't properly filter observations for auditees based on assignments. AUDIT_HEAD should see observations from audits they lead (via `auditHeadId`) in addition to audits they're assigned to as auditors.

**Acceptance**:
- CFO and CXO_TEAM see all observations
- AUDIT_HEAD sees observations from audits where `audit.auditHeadId = user.id` OR where they have an `AuditAssignment`
- AUDITOR sees observations from audits with `AuditAssignment`
- AUDITEE sees only observations with `ObservationAssignment` for their user ID
- GUEST continues to use scope-based filtering
- All deprecated RBAC helpers removed from this file

**RBAC Helpers Used**: `isCFO`, `isCXOTeam`, `isAuditHead`, `isAuditor`, `isAuditee`, `isGuest`

**Audit Trail**: No audit event (read-only operation)

**Dependencies**: None

---

### 2. Update Observation PATCH Endpoint with RBAC v2 and Audit Lock Checks
**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/route.ts`

**Action**:
- Replace deprecated RBAC helpers with RBAC v2 equivalents
- Add audit lock check: Load the parent audit and check `audit.isLocked`
  - If locked and user is NOT CFO, return 403 error
- Update field-level permission logic:
  - **CFO**: All fields (short-circuit all checks)
  - **AUDIT_HEAD and AUDITOR**: Auditor fields only when `approvalStatus` is DRAFT or REJECTED
  - **AUDITEE**: Auditee fields only, must have `ObservationAssignment`, allowed even if APPROVED (as long as audit not locked)
- Add check for AUDITOR assignment to the parent audit
- Add check for AUDIT_HEAD: allow if they are the audit head (`audit.auditHeadId`) OR have an `AuditAssignment`
- Verify AUDITEE has `ObservationAssignment` before allowing edits

**Context**:
Current implementation uses `isAdmin` and `isAdminOrAuditor` which are deprecated. The endpoint needs proper RBAC v2 role checks and must enforce audit lock status. Field-level permissions must align with approval workflow: auditors can only edit their fields when observation is in DRAFT or REJECTED state, but auditees can edit their fields even after approval (unless audit is locked).

**Acceptance**:
- Audit lock blocks all updates except for CFO
- CFO can edit any field regardless of approval status or lock
- AUDIT_HEAD/AUDITOR can edit auditor fields only when approvalStatus is DRAFT or REJECTED
- AUDIT_HEAD/AUDITOR blocked from editing when approvalStatus is SUBMITTED or APPROVED (unless CFO)
- AUDITEE can edit auditee fields on assigned observations even when APPROVED (but not when audit locked)
- AUDITEE without `ObservationAssignment` receives 403
- AUDITOR without `AuditAssignment` to parent audit receives 403
- AUDIT_HEAD allowed if `audit.auditHeadId = user.id` OR has `AuditAssignment`
- Proper audit trail logging with before/after diff

**RBAC Helpers Used**: `isCFO`, `isAuditHead`, `isAuditor`, `isAuditee`

**Audit Trail**:
```typescript
await writeAuditEvent({
  entityType: "OBSERVATION",
  entityId: id,
  action: "UPDATE",
  actorId: session.user.id,
  diff: { before: orig, after: updated, fields: Object.keys(data) }
});
```

**Dependencies**: Subtask 1 (for consistency)

---

### 3. Add Observation Submit Endpoint (NEW)
**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/submit/route.ts`

**Action**:
- Create new POST endpoint at this path
- Check authentication and assert role is AUDITOR or AUDIT_HEAD using `assertAuditorOrAuditHead`
- Load observation and parent audit
- Check audit lock: if `audit.isLocked` and user is not CFO, return 403
- Verify user has permission to submit:
  - AUDITOR must have `AuditAssignment` to parent audit
  - AUDIT_HEAD must be `audit.auditHeadId` OR have `AuditAssignment`
  - CFO always allowed
- Check current `approvalStatus`:
  - Allow submission only if DRAFT or REJECTED
  - If already SUBMITTED or APPROVED, return 400 error
- Update observation: set `approvalStatus` to SUBMITTED
- Create `Approval` record with status SUBMITTED
- Log audit event
- Broadcast WebSocket notification

**Context**:
This endpoint transitions an observation from DRAFT/REJECTED to SUBMITTED state, triggering the approval workflow. Only the observation author (auditor/audit head assigned to the audit) can submit.

**Acceptance**:
- Only AUDITOR and AUDIT_HEAD can submit (CFO can override)
- Audit lock blocks submission except for CFO
- Can only submit when approvalStatus is DRAFT or REJECTED
- Creates Approval record with SUBMITTED status
- Returns 400 if already submitted or approved
- Returns 403 if audit locked (unless CFO)
- Audit trail logged
- WebSocket notification sent

**RBAC Helpers Used**: `assertAuditorOrAuditHead`, `isCFO`, `isAuditHead`, `isAuditor`

**Audit Trail**:
```typescript
await writeAuditEvent({
  entityType: "OBSERVATION",
  entityId: id,
  action: "SUBMIT",
  actorId: session.user.id,
  diff: { approvalStatus: { from: orig.approvalStatus, to: "SUBMITTED" } }
});
```

**Dependencies**: Subtask 2 (audit lock pattern)

---

### 4. Add Observation Approve Endpoint (NEW)
**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/approve/route.ts`

**Action**:
- Create new POST endpoint at this path
- Check authentication
- Load observation and parent audit
- Check authorization:
  - CFO always allowed (short-circuit)
  - AUDIT_HEAD allowed only if `audit.auditHeadId = user.id`
  - All others receive 403
- Check audit lock: if `audit.isLocked` and user is not CFO, return 403
- Verify `approvalStatus` is SUBMITTED (can't approve DRAFT, REJECTED, or already APPROVED)
- Update observation: set `approvalStatus` to APPROVED
- Create `Approval` record with status APPROVED and optional comment
- Log audit event
- Broadcast WebSocket notification

**Context**:
Only the Audit Head assigned to the audit can approve observations. This is a critical approval workflow action that must be tightly controlled.

**Acceptance**:
- Only AUDIT_HEAD for the specific audit can approve (CFO can override)
- Audit lock blocks approval except for CFO
- Can only approve when approvalStatus is SUBMITTED
- Creates Approval record with APPROVED status
- Returns 403 if user is not the audit head or CFO
- Returns 400 if not in SUBMITTED state
- Audit trail logged with actor and comment
- WebSocket notification sent

**RBAC Helpers Used**: `isCFO`, `assertAuditHead` (but with additional audit head ID check)

**Audit Trail**:
```typescript
await writeAuditEvent({
  entityType: "OBSERVATION",
  entityId: id,
  action: "APPROVE",
  actorId: session.user.id,
  diff: { approvalStatus: { from: "SUBMITTED", to: "APPROVED" }, comment }
});
```

**Dependencies**: Subtask 3 (workflow consistency)

---

### 5. Add Observation Reject Endpoint (NEW)
**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/reject/route.ts`

**Action**:
- Create new POST endpoint at this path
- Check authentication
- Accept request body with optional `comment` field (zod schema: `z.object({ comment: z.string().optional() })`)
- Load observation and parent audit
- Check authorization:
  - CFO always allowed (short-circuit)
  - AUDIT_HEAD allowed only if `audit.auditHeadId = user.id`
  - All others receive 403
- Check audit lock: if `audit.isLocked` and user is not CFO, return 403
- Verify `approvalStatus` is SUBMITTED (can't reject DRAFT, REJECTED, or APPROVED)
- Update observation: set `approvalStatus` to REJECTED
- Create `Approval` record with status REJECTED and comment
- Log audit event with rejection comment
- Broadcast WebSocket notification

**Context**:
Rejection keeps the observation in the REJECTED state so the auditor can make changes and resubmit. Only the assigned Audit Head can reject.

**Acceptance**:
- Only AUDIT_HEAD for the specific audit can reject (CFO can override)
- Audit lock blocks rejection except for CFO
- Can only reject when approvalStatus is SUBMITTED
- Creates Approval record with REJECTED status and comment
- Returns 403 if user is not the audit head or CFO
- Returns 400 if not in SUBMITTED state
- Audit trail logged with rejection reason
- WebSocket notification sent

**RBAC Helpers Used**: `isCFO`, `assertAuditHead` (but with additional audit head ID check)

**Audit Trail**:
```typescript
await writeAuditEvent({
  entityType: "OBSERVATION",
  entityId: id,
  action: "REJECT",
  actorId: session.user.id,
  diff: { approvalStatus: { from: "SUBMITTED", to: "REJECTED" }, comment }
});
```

**Dependencies**: Subtask 3 (workflow consistency)

---

### 6. Add Observation DELETE Handler
**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/route.ts`

**Action**:
- Add DELETE handler function to existing route file
- Check authentication
- Load observation and parent audit
- Check authorization:
  - CFO always allowed (short-circuit)
  - AUDIT_HEAD allowed only if `audit.auditHeadId = user.id` AND audit is NOT locked
  - All others receive 403
- If audit locked and user is not CFO, return 403
- Delete observation using `prisma.observation.delete({ where: { id } })`
  - Cascade deletes will remove attachments, approvals, assignments, notes, action plans automatically
- Log audit event with deleted observation data
- Broadcast WebSocket notification (if applicable)

**Context**:
Deletion is restricted to CFO (always) and Audit Head (only when audit is not locked). This prevents accidental data loss after audit completion.

**Acceptance**:
- CFO can delete any observation regardless of lock status
- AUDIT_HEAD can delete only if `audit.auditHeadId = user.id` AND `audit.isLocked = false`
- All other roles receive 403
- Locked audits prevent deletion (except CFO)
- Cascade deletes related records (attachments, approvals, assignments)
- Audit trail logged with observation details before deletion
- Returns 404 if observation doesn't exist

**RBAC Helpers Used**: `isCFO`, `isAuditHead`

**Audit Trail**:
```typescript
await writeAuditEvent({
  entityType: "OBSERVATION",
  entityId: id,
  action: "DELETE",
  actorId: session.user.id,
  diff: { observation: obs } // Include observation data before deletion
});
```

**Dependencies**: Subtask 2 (audit lock pattern)

---

### 7. Add Observation Assign Auditee Endpoint (NEW)
**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/assign-auditee/route.ts`

**Action**:
- Create new POST endpoint at this path
- Accept request body: `z.object({ auditeeId: z.string().min(1) })`
- Check authentication
- Verify user role is one of: CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR
  - Use assertion helper or manual check with proper error
- Load observation and verify it exists
- Load auditee user and verify they exist
- Verify auditee user has role AUDITEE (return 400 if not)
- Check if assignment already exists using `ObservationAssignment` unique constraint
  - If exists, return 400 "Already assigned"
- Create `ObservationAssignment` record:
  ```typescript
  await prisma.observationAssignment.create({
    data: {
      observationId: id,
      auditeeId: input.auditeeId,
      assignedById: session.user.id
    }
  });
  ```
- Log audit event
- Return success with created assignment

**Context**:
Auditee assignment is required before an auditee can edit auditee fields on an observation. Multiple roles can assign auditees to facilitate workflow flexibility.

**Acceptance**:
- CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR can assign auditees
- AUDITEE and GUEST cannot assign
- Assigned user must have AUDITEE role
- Duplicate assignments return 400 error
- Creates ObservationAssignment with assignedById
- Audit trail logged
- Returns 404 if observation or auditee user not found
- Returns 400 if user being assigned is not an AUDITEE

**RBAC Helpers Used**: `isCFO`, `isCXOTeam`, `isAuditHead`, `isAuditor`, `isAuditee` (for validation)

**Audit Trail**:
```typescript
await writeAuditEvent({
  entityType: "OBSERVATION",
  entityId: id,
  action: "ASSIGN_AUDITEE",
  actorId: session.user.id,
  diff: { auditeeId: input.auditeeId, assignedBy: session.user.id }
});
```

**Dependencies**: Subtask 1 (for auditee filtering to work correctly)

---

## Dependencies Between Subtasks

```
Subtask 1 (GET observations) ─┐
                               ├─> Subtask 7 (assign-auditee) requires proper AUDITEE filtering
Subtask 2 (PATCH observation) ─┤
                               └─> Provides audit lock pattern for all mutation endpoints

Subtask 3 (submit) ──> Subtask 4 (approve) ──┐
                  └──> Subtask 5 (reject)  ───┴─> All three form the approval workflow

Subtask 6 (DELETE) depends on Subtask 2 for audit lock pattern
```

**Recommended Implementation Order:**
1. Subtask 1 - Update GET endpoint (foundational, no mutations)
2. Subtask 2 - Update PATCH with audit lock checks (establishes lock pattern)
3. Subtask 3 - Add submit endpoint (starts workflow)
4. Subtask 4 - Add approve endpoint (workflow continuation)
5. Subtask 5 - Add reject endpoint (workflow continuation)
6. Subtask 6 - Add DELETE handler (uses lock pattern from Subtask 2)
7. Subtask 7 - Add assign-auditee endpoint (depends on Subtask 1 for filtering)

---

## Field-Level Permission Reference

### Auditor Fields
- `observationText`
- `risksInvolved`
- `riskCategory`
- `likelyImpact`
- `concernedProcess`
- `auditorPerson`

### Auditee Fields
- `auditeePersonTier1`
- `auditeePersonTier2`
- `auditeeFeedback`
- `personResponsibleToImplement`
- `targetDate`
- `currentStatus` (for action plan updates)

### Status Fields (controlled via endpoints, not direct PATCH)
- `approvalStatus` (via submit, approve, reject endpoints)
- `isPublished` (separate endpoint, not in this task)

---

## Verification Checklist

After implementing all subtasks, verify:

- [ ] Observations filtered correctly by role (CFO/CXO all, AUDIT_HEAD assigned audits, AUDITOR assigned audits, AUDITEE assigned observations)
- [ ] Field-level permissions enforced (auditor fields vs auditee fields)
- [ ] Audit lock prevents all mutations except CFO override
- [ ] Submit endpoint working for Auditor/Audit Head on DRAFT/REJECTED observations
- [ ] Approve endpoint working only for Audit Head of the specific audit
- [ ] Reject endpoint working only for Audit Head of the specific audit
- [ ] Delete restricted to CFO (always) and Audit Head (when not locked)
- [ ] Auditee assignment working for CFO/CXO/AUDIT_HEAD/AUDITOR
- [ ] Auditee can only edit auditee fields on assigned observations
- [ ] Auditor can only edit auditor fields when observation is DRAFT or REJECTED
- [ ] Audit trail logging all actions (UPDATE, SUBMIT, APPROVE, REJECT, DELETE, ASSIGN_AUDITEE)
- [ ] WebSocket notifications sent for all mutations
- [ ] All deprecated RBAC helpers removed (`isAdmin`, `isAdminOrAuditor`)
- [ ] Proper error responses (401, 403, 404, 400) with descriptive messages

---

## Files to Create

1. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/submit/route.ts`
2. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/approve/route.ts`
3. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/reject/route.ts`
4. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/assign-auditee/route.ts`

## Files to Modify

1. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/route.ts` (GET and POST)
2. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/route.ts` (GET, PATCH, add DELETE)

---

## Permission Matrix Reference

### Observations - Creation & Basic Operations

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Create Observations | ✅ | ❌ | ✅ | ✅ | ❌ |
| Edit Draft Observations (all fields) | ✅ | ❌ | ✅ (own) | ✅ (own) | ❌ |
| Edit Auditor Fields (draft/rejected) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Edit Auditee Fields (assigned obs) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Submit for Approval | ✅ | ❌ | ✅ | ✅ | ❌ |
| Approve Observations | ✅ | ❌ | ✅ | ❌ | ❌ |
| Reject Observations | ✅ | ❌ | ✅ | ❌ | ❌ |
| Assign Auditees to Observations | ✅ | ✅ | ✅ | ✅ | ❌ |

### Observations - Delete & Advanced Operations

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Delete Observations (audit open) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Delete Observations (audit locked) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit After Submission (must be rejected) | ✅ (override) | ❌ | ✅ (if rejected) | ✅ (if rejected) | ❌ |
| Edit After Approval (auditor fields) | ✅ (override) | ❌ | ❌ (CR only) | ❌ (CR only) | ❌ |
| Edit After Approval (auditee fields, audit open) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Edit After Audit Lock | ✅ (override) | ❌ | ❌ | ❌ | ❌ |

### Observations - Viewing

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| View All Observations | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Assigned Audit Observations | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Assigned Observations (auditee) | ✅ | ✅ | ✅ | ✅ | ✅ |

### Field-Level Permissions (Observation Fields)

| Field Group | CFO | CXO Team | Audit Head | Auditor | Auditee |
|-------------|-----|----------|------------|---------|---------|
| **Auditor Fields** (observationText, risksInvolved, riskCategory, likelyImpact, concernedProcess, auditorPerson) | ✅ | ❌ | ✅ | ✅ | ❌ (read-only) |
| **Auditee Fields** (auditeePersonTier1, auditeePersonTier2, auditeeFeedback, personResponsibleToImplement, targetDate) | ✅ | ❌ | ❌ (read-only) | ❌ (read-only) | ✅ (assigned obs) |
| **Status Fields** (approvalStatus, currentStatus, isPublished) | ✅ | ❌ | ✅ (via approve/reject) | ✅ (submit only) | ❌ (read-only) |
