# RBAC Task 2: Core RBAC Infrastructure

**Status**: Pending
**Dependencies**: RBAC_TASK_1
**Document Reference**: RBAC_updated.md - Step 3, Step 4

---

## Overview

Implement RBAC helper functions and update seed data with new role structure.

---

## Implementation Steps

### Step 3: Update seed data in `prisma/seed.ts`

Create fresh seed users with new roles:
- 1 CFO user
- 1-2 CXO_TEAM users
- 1 AUDIT_HEAD user
- 2-3 AUDITOR users
- 1-2 AUDITEE users

Run seed: `npm run db:seed`

### Step 4: Implement RBAC helpers in `src/lib/rbac.ts`

Replace old helpers (isAdmin, etc.) with new role helpers.

#### New helpers

```typescript
isCFO(role)
isCXOTeam(role)
isAuditHead(role)
isAuditor(role)
isAuditee(role)
assertCFOOrCXOTeam(role)
assertAuditHead(role)
assertAuditorOrAuditHead(role)
```

#### CFO short-circuit

CFO passes all asserts.

---

## Enforcement Strategy

### Central RBAC helpers in `src/lib/rbac.ts`

**CFO short-circuit**: CFO passes all asserts.

### Audit lock checks everywhere

Before any mutation to audit or observations, check `audit.isLocked`. Deny unless CFO.

### Observation approval authority

Approve/Reject routes allow only Audit Head of the observation's audit (plus CFO override).

### Observation delete authority

Allowed to CFO always; Audit Head only when audit open.

### Visibility control

- For audit lists and related observation lists, apply `visibilityRules` if the requesting role is Auditor or Audit Head
- CXO and CFO see all
- Auditees see only observations where they have an `ObservationAssignment` record

### Field-level permissions for observation update

**Auditor set**: Observation authoring fields
- `observationText`
- `risksInvolved`
- `riskCategory`
- `likelyImpact`
- `concernedProcess`
- `auditorPerson`

**Auditee set**: Auditee response fields
- `auditeePersonTier1`
- `auditeePersonTier2`
- `auditeeFeedback`
- `personResponsibleToImplement`
- `targetDate`
- Action plan fields (where specifically allowed)

**Audit Head** inherits Auditor capabilities.

**After approval**: Only auditee fields can be edited by auditees while audit is open; others need change request (if retained).

### Scope system

Keep existing scope utilities in `src/lib/scope.ts` for GUEST if retained; not required for Auditee in v2.

---

## Files Touched

- `prisma/seed.ts`
- `src/lib/rbac.ts`
- `src/lib/auth.ts`
- `src/lib/scope.ts`

---

## Verification

- [ ] All new RBAC helpers implemented
- [ ] Old role helpers removed
- [ ] Seed data updated with new roles
- [ ] Seed runs successfully
- [ ] CFO short-circuit logic working
