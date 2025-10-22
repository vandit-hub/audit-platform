# RBAC Task 4: Observation Management API

**Status**: Pending
**Dependencies**: RBAC_TASK_2
**Document Reference**: RBAC_updated.md - Step 5 (Observation endpoints)

---

## Overview

Implement observation management API endpoints with approval workflow and field-level permissions.

---

## API Implementation

### 2. Observations collection GET in `src/app/api/v1/observations/route.ts`

- **CFO, CXO Team**: See all
- **Audit Head, Auditor**: See observations for audits they are assigned to
  - Audit Head is determined by `Audit.auditHeadId`
  - Auditor by existing `AuditAssignment`
- **Auditee**: See only assigned observations via `ObservationAssignment`
- Respect `visibilityRules` for Auditor and Audit Head on historical audits

### 3. Observation PATCH in `src/app/api/v1/observations/[id]/route.ts`

- Block if audit locked (unless CFO)
- Enforce field-level sets:
  - **CFO**: All fields
  - **Audit Head, Auditor**: Auditor fields on draft or rejected; block after submitted unless rejected or change request workflow applies
  - **Auditee**: Auditee fields only, must have `ObservationAssignment`, allowed even after approval if audit open

### 4. Observation submit route in `src/app/api/v1/observations/[id]/submit/route.ts`

- Allow Auditor and Audit Head
- Block if locked

### 5. Observation approve/reject routes (NEW)

**Add approve and reject routes**:
- `src/app/api/v1/observations/[id]/approve/route.ts`
- `src/app/api/v1/observations/[id]/reject/route.ts`

**Assertions**: Only Audit Head for the observation's audit (CFO override), block if locked

### 6. Observation delete

If a delete endpoint exists in `src/app/api/v1/observations/[id]/route.ts`, gate as:
- CFO always allowed
- Audit Head allowed only when audit not locked

If absent, add DELETE branch.

### 7. Observation assign auditee (NEW)

**Add**: `src/app/api/v1/observations/[id]/assign-auditee/route.ts`

- **Allowed roles**: CFO, CXO Team, Audit Head, Auditor
- Creates `ObservationAssignment` row with `assignedById`

---

## Audit Trail Implementation

Use `src/server/auditTrail.ts`:

- Log approve, reject, observation delete, auditee assignments
- Include `actorId` and `entityId` in records

---

## Files Touched

### API Routes - Observations
- `src/app/api/v1/observations/route.ts`
- `src/app/api/v1/observations/[id]/route.ts`
- `src/app/api/v1/observations/[id]/submit/route.ts`
- `src/app/api/v1/observations/[id]/approve/route.ts` ← **NEW**
- `src/app/api/v1/observations/[id]/reject/route.ts` ← **NEW**
- `src/app/api/v1/observations/[id]/assign-auditee/route.ts` ← **NEW**

### Server
- `src/server/auditTrail.ts`

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

---

## Verification

- [ ] Observations filtered correctly by role
- [ ] Field-level permissions enforced
- [ ] Submit endpoint working for Auditor/Audit Head
- [ ] Approve/reject endpoints working for Audit Head
- [ ] Delete restricted properly
- [ ] Auditee assignment working
- [ ] Audit lock prevents mutations (except CFO)
- [ ] Audit trail logging all actions
