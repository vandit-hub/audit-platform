# RBAC Task 3: Audit Management API

**Status**: Pending
**Dependencies**: RBAC_TASK_2
**Document Reference**: RBAC_updated.md - Step 5 (Audit endpoints)

---

## Overview

Implement audit management API endpoints with new RBAC controls.

---

## API Implementation

### 8. Audits collection and detail

**Files**: `src/app/api/v1/audits/route.ts` and `src/app/api/v1/audits/[id]/route.ts`

- **Creation/editing**: CFO and CXO Team only
- **Listing**:
  - CFO and CXO Team see all
  - Audit Head and Auditor see assigned audits, filtered by visibility for historical lists

### 9. Audit lock, unlock, complete (NEW)

**Add POST routes**:
- `src/app/api/v1/audits/[id]/lock/route.ts`
- `src/app/api/v1/audits/[id]/unlock/route.ts`
- `src/app/api/v1/audits/[id]/complete/route.ts`

- **Allowed roles**: CFO and CXO Team
- Completion sets `completedAt` and `completedById` and auto-locks
- CFO can unlock locked audits; CXO Team should typically not unlock completed audits (enforce by policy)

### 10. Audit visibility (NEW)

**Add**: `src/app/api/v1/audits/[id]/visibility/route.ts`

- **Allowed roles**: CFO and CXO Team only
- Set `visibilityRules`
- Keep rules simple: `show_all`, `last_12m`, `explicit:{auditIds:[]}`, `hide_all` (stored as JSON)

---

## Audit Trail Implementation

Use `src/server/auditTrail.ts`:

- Log lock, unlock, complete, visibility changes
- Include `actorId` and `entityId` in records

---

## Files Touched

### API Routes - Audits
- `src/app/api/v1/audits/route.ts`
- `src/app/api/v1/audits/[id]/route.ts`
- `src/app/api/v1/audits/[id]/lock/route.ts` ← **NEW**
- `src/app/api/v1/audits/[id]/unlock/route.ts` ← **NEW**
- `src/app/api/v1/audits/[id]/complete/route.ts` ← **NEW**
- `src/app/api/v1/audits/[id]/visibility/route.ts` ← **NEW**

### Server
- `src/server/auditTrail.ts`

---

## Permission Matrix Reference

### Audits

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Create Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Auditors to Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lock Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Unlock Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark Audit Complete (auto-locks) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Control Audit Visibility Rules | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Assigned Audits | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## Verification

- [ ] Audit creation/editing restricted to CFO/CXO
- [ ] Lock/unlock/complete endpoints working
- [ ] Visibility rules can be set and applied
- [ ] Audit trail logging all actions
- [ ] Audit Head and Auditor see only assigned audits
- [ ] CFO and CXO see all audits
