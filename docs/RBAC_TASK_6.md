# RBAC Task 6: QA and Sign-off

**Status**: Pending
**Dependencies**: RBAC_TASK_1, RBAC_TASK_2, RBAC_TASK_3, RBAC_TASK_4, RBAC_TASK_5
**Document Reference**: RBAC_updated.md - Step 7

---

## Overview

Comprehensive testing and validation of RBAC implementation against permission matrix.

---

## QA Acceptance Matrix (High Level)

### CFO
- ✅ Can lock/unlock/complete any audit
- ✅ Approve/reject any observation
- ✅ Delete any observation
- ✅ Override edits after lock

### CXO Team
- ✅ Can create/edit audits and plants
- ✅ Set visibility, lock and complete audits
- ❌ Cannot approve, delete, or edit observation content

### Audit Head
- ✅ Sees assigned audits and observations
- ✅ Can approve/reject and delete observations while audit open
- ❌ Cannot do so after lock

### Auditor
- ✅ Sees assigned audits
- ✅ Can create/edit draft, submit
- ❌ Cannot edit after submit unless rejected

### Auditee
- ✅ Sees assigned observations only
- ✅ Can edit auditee fields while audit open
- ❌ Blocked after lock

---

## Permission Matrix Testing

### Users & Teams

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Manage all users (create, disable, modify) | ✅ | ✅ | ❌ | ❌ | ❌ |
| View team members | ✅ | ✅ | ✅ (own team) | ✅ (own team) | ❌ |

### Plants

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Create Plants | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Plants | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Plants | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Plants | ✅ | ✅ | ✅ | ✅ | ❌ |

### Audits

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Create Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Auditors to Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Auditees to Observations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Lock Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Unlock Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark Audit Complete (auto-locks) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Control Audit Visibility Rules | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Assigned Audits | ✅ | ✅ | ✅ | ✅ | ❌ |

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

### Attachments (Annexures & Management Documents)

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Upload Attachments | ✅ | ❌ | ✅ | ✅ | ❌ |
| Delete Attachments (audit open) | ✅ | ❌ | ✅ | ✅ (own) | ❌ |
| Delete Attachments (audit locked) | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Attachments (assigned obs) | ✅ | ✅ | ✅ | ✅ | ✅ |

### Action Plans

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Create Action Plans | ✅ | ❌ | ✅ | ✅ | ✅ (assigned obs) |
| Edit Action Plans | ✅ | ❌ | ✅ | ✅ | ✅ (assigned obs) |
| View Action Plans | ✅ | ✅ | ✅ | ✅ | ✅ (assigned obs) |

### Reports & Data Export

| Action | CFO | CXO Team | Audit Head | Auditor | Auditee |
|--------|-----|----------|------------|---------|---------|
| Generate Reports (all audits) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Generate Reports (assigned audits) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ | ❌ | ❌ |

### Field-Level Permissions (Observation Fields)

| Field Group | CFO | CXO Team | Audit Head | Auditor | Auditee |
|-------------|-----|----------|------------|---------|---------|
| **Auditor Fields** (observationText, risksInvolved, riskCategory, likelyImpact, concernedProcess, auditorPerson) | ✅ | ❌ | ✅ | ✅ | ❌ (read-only) |
| **Auditee Fields** (auditeePersonTier1, auditeePersonTier2, auditeeFeedback, personResponsibleToImplement, targetDate) | ✅ | ❌ | ❌ (read-only) | ❌ (read-only) | ✅ (assigned obs) |
| **Status Fields** (approvalStatus, currentStatus, isPublished) | ✅ | ❌ | ✅ (via approve/reject) | ✅ (submit only) | ❌ (read-only) |

### Navigation Access (Pages Visible in UI)

| Page | CFO | CXO Team | Audit Head | Auditor | Auditee |
|------|-----|----------|------------|---------|---------|
| Plants | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audits | ✅ | ✅ | ✅ | ✅ | ❌ |
| Observations | ✅ | ❌ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Users | ✅ | ✅ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ = Allowed
- ❌ = Not allowed
- **CR only** = Change Request workflow required
- **(own)** = Only for resources they created
- **(assigned obs)** = Only for observations they're assigned to
- **(override)** = CFO can bypass all restrictions

---

## Test Scenarios

### Scenario 1: CFO Override
- [ ] CFO can edit locked audits
- [ ] CFO can delete observations in locked audits
- [ ] CFO can approve/reject any observation

### Scenario 2: Audit Lifecycle
- [ ] CXO can create and lock audit
- [ ] Auditor cannot edit observation after lock
- [ ] Audit Head cannot delete observation after lock
- [ ] CFO can unlock and re-lock

### Scenario 3: Observation Approval Flow
- [ ] Auditor creates draft observation
- [ ] Auditor submits for approval
- [ ] Audit Head approves observation
- [ ] Auditor cannot edit after approval
- [ ] Auditee can still edit auditee fields

### Scenario 4: Auditee Assignment
- [ ] Audit Head assigns auditee to observation
- [ ] Auditee sees only assigned observations
- [ ] Auditee can edit only auditee fields
- [ ] Auditee blocked after audit lock

### Scenario 5: Visibility Rules
- [ ] CXO sets visibility rules on audit
- [ ] Auditor sees only allowed historical audits
- [ ] Audit Head respects visibility rules
- [ ] CFO and CXO see all audits

---

## Verification Checklist

- [ ] All permission matrix entries validated
- [ ] All test scenarios pass
- [ ] Audit trail logging verified
- [ ] UI reflects correct permissions per role
- [ ] Field-level permissions enforced
- [ ] Lock mechanism working correctly
- [ ] Visibility rules applied correctly
- [ ] No unauthorized access possible
- [ ] Documentation updated

---

## Sign-off

- [ ] Development team sign-off
- [ ] QA sign-off
- [ ] Product owner sign-off
