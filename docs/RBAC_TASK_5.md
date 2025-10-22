# RBAC Task 5: UI Implementation

**Status**: Pending
**Dependencies**: RBAC_TASK_3, RBAC_TASK_4
**Document Reference**: RBAC_updated.md - Step 6

---

## Overview

Update UI components with new RBAC controls and role-specific views.

---

## UI Implementation

### Navigation in `src/components/NavBar.tsx`

- **CFO**: Plants, Audits, Observations, Reports, Users
- **CXO Team**: Plants, Audits, Reports, Users
- **Audit Head**: Audits, Observations, Reports
- **Auditor**: Audits, Observations
- **Auditee**: Observations

### Audits detail page in `src/app/(dashboard)/audits/[auditId]/page.tsx`

- Add Lock, Unlock, Complete buttons for CFO/CXO only
- Reflect current locked/completed status
- Visibility config panel for CFO/CXO

### Audits list page in `src/app/(dashboard)/audits/page.tsx`

- Creation form visible to CFO/CXO only
- Listing filters per role

### Observation detail page in `src/app/(dashboard)/observations/[id]/page.tsx`

- **Buttons**:
  - Submit (Auditor/Head)
  - Approve/Reject (Audit Head/CFO)
  - Delete (Audit Head if open, CFO always)
- **Sections** with clear labels for auditor vs auditee fields
- Disable editing for auditee fields when not assigned or when audit locked
- Show assigned auditees

---

## Files Touched

### UI Components
- `src/components/NavBar.tsx`
- `src/app/(dashboard)/audits/page.tsx`
- `src/app/(dashboard)/audits/[auditId]/page.tsx`
- `src/app/(dashboard)/observations/[id]/page.tsx`

---

## Navigation Access (Pages Visible in UI)

| Page | CFO | CXO Team | Audit Head | Auditor | Auditee |
|------|-----|----------|------------|---------|---------|
| Plants | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audits | ✅ | ✅ | ✅ | ✅ | ❌ |
| Observations | ✅ | ❌ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Users | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Verification

- [ ] Navigation shows correct items per role
- [ ] Audit list shows creation form for CFO/CXO only
- [ ] Audit detail shows lock/unlock/complete buttons for CFO/CXO
- [ ] Audit detail shows visibility config for CFO/CXO
- [ ] Observation detail shows correct buttons per role
- [ ] Observation detail disables fields appropriately
- [ ] Observation detail shows assigned auditees
- [ ] Field sections clearly labeled (auditor vs auditee)
