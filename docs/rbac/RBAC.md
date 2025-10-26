# Role-Based Access Control (RBAC) Documentation

This document provides a comprehensive guide to the roles and permissions system in the Internal Audit Platform.

## Table of Contents

1. [⚠️ NEW REQUIREMENTS - Proposed RBAC Redesign](#️-new-requirements---proposed-rbac-redesign)
2. [Overview](#overview)
3. [Roles & Capabilities](#roles--capabilities)
4. [Permission Matrix](#permission-matrix)
5. [Enforcement Mechanisms](#enforcement-mechanisms)
6. [Key Workflows](#key-workflows)
7. [Field-Level Permissions](#field-level-permissions)
8. [Implementation Patterns](#implementation-patterns)
9. [Future Considerations](#future-considerations)

---

## ⚠️ NEW REQUIREMENTS - Proposed RBAC Redesign

> **Status**: PROPOSED - NOT YET IMPLEMENTED
>
> **Date**: 2025-01-22
>
> **Purpose**: This section outlines the new role structure and permissions model for the MVP phase. The current implementation (documented below) will be redesigned to match these requirements.

### Executive Summary

The new RBAC system organizes users into **three teams** with **five roles**:

1. **CXO Team** (Leadership & Administration)
   - **CFO**: Ultimate authority with full system access
   - **CXO Team Members**: Create/manage audits, plants, and control visibility

2. **Auditor Team** (Audit Execution)
   - **Audit Head**: Approves observations, can delete, leads audit team
   - **Auditor**: Creates observations, submits for approval

3. **Auditee Team** (Plant/Department Response)
   - **Auditee**: Responds to observations, edits designated fields only

**Key Features**:
- ✅ **Audit Locking**: CXO Team locks audits to prevent changes after completion
- ✅ **Internal Approval**: Audit Head approves observations (not CFO/Admin)
- ✅ **Visibility Control**: CXO Team controls what historical audits Auditor Team can see
- ✅ **Field-Level Permissions**: Auditees can only edit specific fields (feedback, dates, contacts)
- ✅ **Assignment-Based Access**: Auditees see only observations they're assigned to

---

### New Organizational Structure

The platform will support **three teams** with distinct roles and responsibilities:

#### 1. CXO Team (Leadership & Administration)

##### **CFO (Chief Financial Officer)**
- **Description**: Highest authority with unrestricted access to all platform features
- **Equivalent to**: Current ADMIN role
- **Unique Identifier**: Single user with CFO designation

**Capabilities**:
- ✅ All system permissions (inherits all capabilities)
- ✅ Ultimate authority over all audits and observations
- ✅ Can override any decision or lock
- ✅ Manages user roles and team assignments

##### **CXO Team Members (Staff & Analysts)**
- **Description**: Combined role for CXO office staff and financial analysts
- **Reports to**: CFO
- **Team Size**: Multiple users

**Capabilities**:
- ✅ Create and manage **Plants** (facilities)
- ✅ Create and manage **Audits**
- ✅ Assign auditors to audits
- ✅ **Control audit visibility**: Decide which past audits and observations are visible to the Auditor Team
- ✅ **Lock audits**: Once locked, no changes can be made to observations, action plans, or audit details
- ✅ **Mark audit completion**: Marking an audit as complete automatically locks it
- ✅ View all observations (regardless of status)
- ✅ Generate reports across all audits
- ❌ Cannot create or edit observations (this is the Auditor Team's responsibility)
- ❌ Cannot approve individual observations (Audit Head's responsibility)

**Key Workflows**:
1. **Audit Creation**: CXO Team creates audit → assigns Auditor Team → sets visibility rules
2. **Audit Locking**: CXO Team can lock audit at any time → prevents further changes
3. **Audit Completion**: CXO Team marks audit complete → audit is automatically locked
4. **Visibility Control**: CXO Team configures which historical data is visible to auditors

---

#### 2. Auditor Team (Audit Execution)

##### **Audit Head**
- **Description**: Leader of the audit team, responsible for approving observations
- **Reports to**: CXO Team
- **Team Size**: Typically one per audit or organization

**Capabilities**:
- ✅ View all observations in assigned audits
- ✅ **Approve observations**: Review and approve observations created by auditors
- ✅ **Delete observations**: Can delete observations while audit is still open (not locked)
- ✅ Create observations (same as Auditor)
- ✅ Edit observations in DRAFT mode
- ✅ Submit observations for approval
- ✅ Manage checklists and action plans
- ❌ Cannot delete observations after audit is locked
- ❌ Cannot create or manage plants or audits
- ❌ Cannot lock or unlock audits

**Approval Authority**:
- Observations created by Auditors → Reviewed by Audit Head → Approved/Rejected
- Once approved, observations can only be modified via Change Request workflow (if audit is still open)

##### **Auditor**
- **Description**: Team members who conduct audits and create observations
- **Reports to**: Audit Head
- **Team Size**: Multiple users per audit

**Capabilities**:
- ✅ View audits they are assigned to
- ✅ **Create observations** for assigned audits
- ✅ **Edit observations** while in **DRAFT mode**
- ✅ Submit observations for Audit Head approval
- ✅ Add annexures and management documents (attachments)
- ✅ Create and manage action plans
- ✅ Mark checklist items as complete
- ✅ Add internal notes to observations
- ❌ Cannot approve their own observations (requires Audit Head approval)
- ❌ Cannot delete observations
- ❌ Cannot edit observations after submission (unless rejected by Audit Head)
- ❌ Cannot edit observations after audit is locked
- ❌ Cannot create or manage plants or audits
- ❌ Cannot see audits they are not assigned to

**Workflow**:
1. **Draft**: Auditor creates observation → edits freely in draft mode
2. **Submit**: Auditor submits observation → sent to Audit Head for review
3. **Approval**: Audit Head approves/rejects → if rejected, returns to draft
4. **Locked**: Once audit is locked by CXO Team → no further edits possible

---

#### 3. Auditee Team (Plant/Department Personnel)

##### **Auditee**
- **Description**: Plant or department personnel who respond to observations and provide feedback
- **Assignment Model**: Assigned to specific audits and/or observations
- **Team Size**: Multiple users per plant/department

**Capabilities**:
- ✅ View observations they are assigned to
- ✅ **Edit specific fields** designated for auditees on observations
- ✅ Add feedback and responses to observations
- ✅ View action plans related to their observations
- ❌ Cannot create new observations
- ❌ Cannot delete observations
- ❌ Cannot approve or reject observations
- ❌ Cannot edit fields designated for auditors or CXO Team
- ❌ Cannot see observations they are not assigned to
- ❌ Cannot create or manage plants or audits

**Auditee-Specific Fields** (editable by Auditees only):
- `auditeePersonTier1` - Primary contact person from auditee side
- `auditeePersonTier2` - Secondary contact person from auditee side
- `auditeeFeedback` - Auditee's response/feedback to the observation
- `personResponsibleToImplement` - Person responsible for implementing corrective actions
- `targetDate` - Target date for implementation
- Action plan fields (if applicable)

**Read-Only Fields for Auditees**:
- `observationText` - Cannot modify the observation description
- `risksInvolved` - Cannot modify risk assessment
- `riskCategory` - Cannot change risk categorization
- `auditorPerson` - Cannot modify auditor details
- `approvalStatus` - Cannot change approval state
- `currentStatus` - Cannot change observation status

**Assignment Workflow**:
```
CXO Team or Auditor assigns Auditee to observation
   ↓
Auditee receives notification
   ↓
Auditee logs in and sees assigned observations
   ↓
Auditee fills in their designated fields:
   ├─ auditeePersonTier1
   ├─ auditeePersonTier2
   ├─ auditeeFeedback
   ├─ personResponsibleToImplement
   └─ targetDate
   ↓
Auditor/Audit Head reviews auditee feedback
   ↓
Observation proceeds through approval workflow
```

**Access Restrictions**:
- Auditees can ONLY see observations where they are explicitly assigned
- Auditees can ONLY edit their designated fields
- Once audit is locked, auditees cannot edit any fields
- Auditees cannot access audit management or plant management features

---

### New Role Hierarchy

```
CFO (Chief Financial Officer)
  └─ Unrestricted access to entire platform
     └─ CXO Team (Staff & Analysts)
        ├─ Create & manage Plants and Audits
        ├─ Control audit visibility for Auditor Team
        ├─ Lock and complete audits
        └─ Cannot create observations
           ├─ Audit Head
           │  ├─ Approve/reject observations
           │  ├─ Delete observations (while audit is open)
           │  └─ Can create observations (like Auditor)
           │     └─ Auditor
           │        ├─ Create and edit observations (draft mode)
           │        ├─ Submit for Audit Head approval
           │        └─ Cannot delete observations
           │
           └─ Auditee Team (Plant/Department Personnel)
              ├─ Assigned to specific observations
              ├─ Edit designated auditee fields only
              ├─ Provide feedback and responses
              └─ Cannot create, delete, or approve observations
```

---

### Key Differences from Current System

| Current System | New System | Change Impact |
|----------------|------------|---------------|
| **ADMIN** (single role) | **CFO** (one user) + **CXO Team** (multiple users) | Split admin responsibilities: CFO = ultimate authority, CXO Team = operational management |
| **AUDITOR** (creates + submits for admin approval) | **Auditor** (creates) + **Audit Head** (approves) | Two-tier auditor hierarchy with internal approval workflow |
| Observations approved by ADMIN | Observations approved by **Audit Head** | Approval authority delegated to Audit Head |
| No concept of audit locking | **Audit locking** by CXO Team | Prevents changes after audit completion |
| ADMIN can see all audits | **Visibility control** by CXO Team | CXO Team controls what historical audits auditors can see |
| AUDITOR cannot delete | **Audit Head can delete** (while audit is open) | Audit Head has deletion authority |
| **AUDITEE** (view-only) | **Auditee** (assignment-based with field editing) | Auditees now assigned to observations and can edit specific fields (feedback, target dates, etc.) |
| **GUEST** role exists | To be determined | Need clarification on whether GUEST role still needed |

---

### New Permission Matrix (Proposed)

| Resource | CFO | CXO Team | Audit Head | Auditor | Auditee |
|----------|-----|----------|------------|---------|---------|
| **Users & Teams** |
| Manage all users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View team members | ✅ | ✅ | ✅ (own team) | ✅ (own team) | ❌ |
| **Plants** |
| Create/Edit/Delete Plants | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Plants | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Audits** |
| Create Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Auditors/Auditees | ✅ | ✅ | ✅ (auditees only) | ✅ (auditees only) | ❌ |
| Lock/Unlock Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark Audit Complete (auto-locks) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Control Audit Visibility | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Assigned Audits | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Observations** |
| Create Observations | ✅ | ❌ | ✅ | ✅ | ❌ |
| Edit Draft Observations (all fields) | ✅ | ❌ | ✅ (own) | ✅ (own) | ❌ |
| Edit Auditee Fields (assigned obs) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Delete Observations (audit open) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Delete Observations (audit locked) | ✅ (override) | ❌ | ❌ | ❌ | ❌ |
| Submit for Approval | ✅ | ❌ | ✅ | ✅ | ❌ |
| Approve/Reject Observations | ✅ (override) | ❌ | ✅ | ❌ | ❌ |
| Edit After Submission | ❌ (must reject first) | ❌ | ❌ (must reject first) | ❌ | ✅ (auditee fields only) |
| Edit After Approval | ❌ (change request) | ❌ | ❌ (change request) | ❌ (change request) | ✅ (auditee fields, if audit open) |
| Edit After Audit Lock | ✅ (override) | ❌ | ❌ | ❌ | ❌ |
| View All Observations | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Assigned Observations | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Attachments** |
| Upload Attachments | ✅ | ❌ | ✅ | ✅ | ❌ |
| Delete Attachments (audit open) | ✅ | ❌ | ✅ | ✅ (own) | ❌ |
| View Attachments (assigned obs) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Action Plans** |
| Create/Edit Action Plans | ✅ | ❌ | ✅ | ✅ | ✅ (assigned obs) |
| View Action Plans | ✅ | ✅ | ✅ | ✅ | ✅ (assigned obs) |
| **Reports** |
| Generate All Reports | ✅ | ✅ | ✅ (assigned audits) | ✅ (assigned audits) | ❌ |
| Export Data | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### New Workflows

#### Workflow 1: Observation Lifecycle (New)

```
1. DRAFT (Auditor creates)
   └─ Auditor edits freely
   └─ Auditor submits → Status: SUBMITTED

2. SUBMITTED (Awaiting Audit Head Review)
   └─ Audit Head reviews
   ├─ APPROVE → Status: APPROVED
   └─ REJECT → Status: DRAFT (back to step 1)

3. APPROVED
   ├─ If audit is OPEN: Can request changes (change request workflow)
   └─ If audit is LOCKED: No changes allowed (CFO can override)

4. AUDIT LOCKED (by CXO Team)
   └─ All observations frozen
   └─ No edits, deletions, or new observations allowed
```

#### Workflow 2: Audit Locking & Completion

```
Audit Created (by CXO Team)
   ↓
Auditors Assigned (by CXO Team)
   ↓
Audit IN PROGRESS
   ├─ Auditors create observations
   ├─ Audit Head approves observations
   └─ Status: OPEN (editable)
      ↓
      ├─ OPTION A: CXO Team manually locks audit
      │     └─ Status: LOCKED (no further changes)
      │
      └─ OPTION B: CXO Team marks audit complete
            └─ Status: COMPLETED + AUTO-LOCKED (no further changes)
```

#### Workflow 3: Visibility Control

```
CXO Team configures visibility rules for Auditor Team:
   ├─ "Show all past audits" (default)
   ├─ "Show audits from last 12 months only"
   ├─ "Show specific audits: Audit A, Audit B, Audit C"
   └─ "Hide all historical audits" (only current assignments visible)

Auditor Team sees only:
   ├─ Current assigned audits (always visible)
   └─ Historical audits (based on CXO Team visibility rules)
```

#### Workflow 4: Auditee Response & Feedback

```
Observation Created (by Auditor)
   ↓
Auditor or Audit Head assigns Auditee to observation
   ↓
Auditee logs in and sees assigned observation
   ↓
Auditee fills in designated fields:
   ├─ auditeePersonTier1 (Primary contact)
   ├─ auditeePersonTier2 (Secondary contact)
   ├─ auditeeFeedback (Response/explanation)
   ├─ personResponsibleToImplement
   ├─ targetDate (Implementation deadline)
   └─ Action plans (if applicable)
   ↓
Auditee saves changes
   ↓
Auditor/Audit Head reviews auditee feedback
   ↓
   ├─ If satisfactory → Observation proceeds to approval
   └─ If needs clarification → Auditor adds notes, auditee updates
      ↓
Audit Head approves observation
   ↓
   ├─ If audit is OPEN:
   │  └─ Auditee can still update their fields (feedback, dates, etc.)
   │
   └─ If audit is LOCKED:
      └─ Auditee fields frozen (no further edits)
```

---

### Implementation Requirements

#### Database Schema Changes

1. **User Role Updates**:
   ```prisma
   enum Role {
     CFO           // New: Single user with ultimate authority
     CXO_TEAM      // New: Staff and analysts (replaces ADMIN for operational tasks)
     AUDIT_HEAD    // New: Approves observations and can delete
     AUDITOR       // Modified: Creates observations, submits for approval
     AUDITEE       // Modified: Assigned to observations, edits designated fields
     GUEST         // TBD: To be determined if still needed
   }
   ```

2. **Audit Model Updates**:
   ```prisma
   model Audit {
     // ... existing fields
     isLocked           Boolean   @default(false)
     lockedAt           DateTime?
     lockedById         String?
     completedAt        DateTime?
     completedById      String?
     visibilityRules    Json?     // Stores visibility configuration
   }
   ```

3. **Observation Approval Flow**:
   ```prisma
   enum ApprovalStatus {
     DRAFT           // Created by Auditor, editable
     SUBMITTED       // Submitted for Audit Head review
     APPROVED        // Approved by Audit Head
     REJECTED        // Rejected by Audit Head, returns to DRAFT
   }
   ```

4. **Auditee Assignment Model** (New):
   ```prisma
   model ObservationAssignment {
     id            String      @id @default(cuid())
     observationId String
     auditeeId     String
     assignedAt    DateTime    @default(now())
     assignedById  String?     // Who assigned this auditee
     observation   Observation @relation(fields: [observationId], references: [id], onDelete: Cascade)
     auditee       User        @relation("AuditeeAssignments", fields: [auditeeId], references: [id], onDelete: Cascade)
     assignedBy    User?       @relation("AssignedBy", fields: [assignedById], references: [id])

     @@unique([observationId, auditeeId])
     @@index([auditeeId])
   }
   ```

5. **Update Observation Model**:
   ```prisma
   model Observation {
     // ... existing fields
     assignments   ObservationAssignment[]  // New: Track auditee assignments
   }
   ```

#### API Changes Required

1. **New Permission Helpers** (`src/lib/rbac.ts`):
   ```typescript
   isCFO(role)
   isCXOTeam(role)
   isAuditHead(role)
   isAuditee(role)
   assertCFOOrCXOTeam(role)
   assertAuditHead(role)
   assertAuditorOrAuditHead(role)
   ```

2. **Audit Locking Enforcement**:
   - Check `audit.isLocked` before allowing any modifications
   - Only CFO can override locks
   - CXO Team can lock/unlock audits

3. **Observation Deletion**:
   - Audit Head can delete if audit is open
   - CFO can delete even if audit is locked
   - Others cannot delete

4. **Visibility Control**:
   - Filter audits based on `visibilityRules` JSON field
   - CXO Team can configure visibility via new API endpoint
   - Auditor Team sees only assigned + visible audits

5. **Auditee Assignment & Field Restrictions**:
   - New API endpoint: `POST /api/v1/observations/{id}/assign-auditee`
   - Check auditee assignment before allowing field edits
   - Enforce field-level permissions based on role:
     ```typescript
     const AUDITEE_EDITABLE_FIELDS = [
       'auditeePersonTier1',
       'auditeePersonTier2',
       'auditeeFeedback',
       'personResponsibleToImplement',
       'targetDate'
     ];

     const AUDITOR_EDITABLE_FIELDS = [
       'observationText',
       'risksInvolved',
       'riskCategory',
       'likelyImpact',
       'concernedProcess',
       'auditorPerson'
     ];
     ```
   - Validate field access in observation PATCH/PUT endpoints
   - Auditees can edit their fields even after approval (if audit is open)

#### UI Changes Required

1. **Navigation Updates**:
   - **CFO**: All menus (Plants, Audits, Observations, Reports, Users)
   - **CXO Team**: Plants, Audits, Reports, Users
   - **Audit Head**: Audits (assigned), Observations, Reports
   - **Auditor**: Audits (assigned), Observations
   - **Auditee**: Observations (assigned only)

2. **Audit Management UI**:
   - Lock/Unlock button (CXO Team & CFO only)
   - Mark Complete button (CXO Team & CFO only, auto-locks)
   - Visibility configuration panel (CXO Team & CFO only)

3. **Observation UI**:
   - **Approve/Reject buttons** (Audit Head & CFO only)
   - **Delete button** (Audit Head if audit open, CFO always)
   - **Assign Auditee button/dropdown** (Auditor, Audit Head, CXO Team, CFO)
   - **Submission status indicator** (Draft/Submitted/Approved/Rejected)
   - **Field-level restrictions**:
     - Auditor fields (highlighted/editable for Auditor/Audit Head only)
     - Auditee fields (highlighted/editable for Auditee only)
     - Read-only fields clearly marked
   - **Auditee assignment indicator** (shows which auditees are assigned)

4. **Observation Form - Role-Based Field Access**:
   ```
   [Auditor/Audit Head Section] - Editable only by Auditor/Audit Head
   ├─ Observation Text
   ├─ Risks Involved
   ├─ Risk Category
   ├─ Likely Impact
   ├─ Concerned Process
   └─ Auditor Person

   [Auditee Section] - Editable only by Auditee (if assigned)
   ├─ Auditee Person Tier 1
   ├─ Auditee Person Tier 2
   ├─ Auditee Feedback
   ├─ Person Responsible to Implement
   ├─ Target Date
   └─ Action Plans (shared editing)

   [Status Section] - Auto-managed by system
   ├─ Current Status
   ├─ Approval Status
   └─ Is Published
   ```

---

### Open Questions & Clarifications Needed

1. ~~**AUDITEE Role**~~ - ✅ CLARIFIED:
   - Auditee role will be assignment-based
   - Auditees assigned to specific observations
   - Can edit designated fields only (feedback, contact persons, target dates)

2. **GUEST Role**:
   - Is GUEST role still needed in the new system?
   - If yes, what are their responsibilities vs. Auditee?
   - Suggested: Remove GUEST role or merge with Auditee

3. **Multi-Audit Head Support**:
   - Can there be multiple Audit Heads in the organization?
   - Can an Audit Head be assigned to specific audits only, or do they approve all observations?

4. **CFO as Single User**:
   - Should CFO be enforced as a single user (only one CFO at a time)?
   - Or can there be multiple users with CFO role?

5. **Observation Editing After Approval**:
   - ✅ CLARIFIED for Auditees: They can edit their fields even after approval (if audit is open)
   - For Auditors: If audit is still open and observation is approved, can Auditor request changes?
   - Or is the observation frozen after approval until audit is locked?

6. **Visibility Granularity**:
   - Should visibility be controlled at audit level or observation level?
   - Can CXO Team hide specific observations while showing the audit?

7. **Report Access**:
   - Should Auditors have access to reports for their assigned audits? (Currently: YES per matrix)
   - What level of reporting should CXO Team have access to? (Currently: ALL per matrix)

8. **Change Request Workflow**:
   - Does the change request workflow still apply?
   - If yes, who can submit and who can approve in the new system?
   - Suggested: Auditors submit change requests for approved observations, Audit Head (not Admin) approves

---

### Migration Strategy

When implementing these changes, the following migration path is recommended:

1. **Phase 1: Database Schema**
   - Add new roles to `Role` enum
   - Add `isLocked`, `lockedAt`, `lockedById`, `completedAt`, `completedById`, `visibilityRules` to `Audit` model
   - Create migration script

2. **Phase 2: User Migration**
   - Map existing ADMIN users → CFO or CXO_TEAM (manual decision)
   - Map existing AUDITOR users → AUDIT_HEAD or AUDITOR (manual decision)
   - Update user records

3. **Phase 3: RBAC Logic**
   - Update `src/lib/rbac.ts` with new helper functions
   - Update all API routes to use new permission checks
   - Implement audit locking enforcement

4. **Phase 4: Workflows**
   - Implement new approval workflow (Auditor → Audit Head)
   - Implement audit locking mechanism
   - Implement visibility control system

5. **Phase 5: UI Updates**
   - Update navigation based on new roles
   - Add audit locking UI
   - Add approval UI for Audit Head
   - Add visibility configuration UI for CXO Team

6. **Phase 6: Testing & Validation**
   - Test all permission combinations
   - Test audit locking enforcement
   - Test approval workflow end-to-end
   - Test visibility control

---

**Next Steps**:
1. Review and approve this proposed design
2. Answer open questions above
3. Create detailed implementation tickets
4. Begin Phase 1 (Database Schema) implementation

---

## Overview

The platform implements a **role-based access control (RBAC)** system with four distinct roles. Permissions are enforced at multiple layers:

- **Database Schema**: User role stored in Prisma schema (`prisma/schema.prisma:15`)
- **API Layer**: Route-level permission checks using helper functions
- **Session Management**: NextAuth v5 with JWT-based sessions
- **UI Layer**: Conditional rendering based on user role
- **Scope System**: Optional fine-grained access control for guest users

### Roles Hierarchy

```
ADMIN
  └─ Full system access
     └─ AUDITOR
        └─ Limited to assigned audits
           └─ AUDITEE
              └─ View-only access to published observations
                 └─ GUEST
                    └─ Scoped view-only access
```

### Authentication & Session Management

- **Provider**: NextAuth v5 with Credentials provider (`src/lib/auth.ts`)
- **Password Hashing**: bcrypt
- **Session Strategy**: JWT (not database sessions)
- **Session Timeouts**:
  - **Absolute**: 24 hours (configurable via `ABSOLUTE_SESSION_HOURS`)
  - **Idle**: 15 minutes (configurable via `IDLE_TIMEOUT_MINUTES`)
- **Audit Trail**: All login events logged to `AuditEvent` table

---

## Roles & Capabilities

### 1. ADMIN (Administrator)

**Purpose**: System administrators with full control over the platform.

**Capabilities**:
- ✅ Full CRUD access to all resources (users, plants, audits, observations, checklists)
- ✅ Approve/reject observations (approval workflow)
- ✅ Approve/deny change requests from auditors
- ✅ Invite users with any role (including other admins)
- ✅ Manage user accounts (create, disable, modify)
- ✅ Access all observations regardless of assignment or publication status
- ✅ Bypass field locks on observations
- ✅ Generate all reports
- ✅ Manage checklist applicability

**Restrictions**:
- ❌ None (unrestricted access)

**Key Implementation**:
```typescript
// src/lib/rbac.ts:3-5
export function isAdmin(role?: Role | string | null) {
  return role === "ADMIN" || role === Role.ADMIN;
}
```

---

### 2. AUDITOR

**Purpose**: Internal auditors who conduct audits and create observations.

**Capabilities**:
- ✅ View audits they are assigned to
- ✅ Create observations for their assigned audits
- ✅ Edit observations in DRAFT or SUBMITTED status
- ✅ Submit observations for approval
- ✅ Request changes to APPROVED observations (via change request workflow)
- ✅ View and manage action plans
- ✅ Upload attachments (annexures, management documents)
- ✅ Add internal notes to observations
- ✅ Mark checklist items as done

**Restrictions**:
- ❌ Cannot see audits they are not assigned to
- ❌ Cannot approve observations (ADMIN only)
- ❌ Cannot directly edit APPROVED observations (must submit change request)
- ❌ Cannot edit certain fields once observation is locked
- ❌ Cannot create/modify plants or users
- ❌ Change requests limited to specific fields (see [Field-Level Permissions](#field-level-permissions))

**Key Implementation**:
```typescript
// src/app/api/v1/observations/route.ts:92-103
} else if (session.user.role === "AUDITOR") {
  // Auditor can only see observations from audits they're assigned to
  const auditorFilter: Prisma.ObservationWhereInput = {
    audit: {
      assignments: {
        some: {
          auditorId: session.user.id
        }
      }
    }
  };
  where = { AND: [where, auditorFilter] };
```

---

### 3. AUDITEE

**Purpose**: Plant/department personnel who view observations relevant to them.

**Capabilities**:
- ✅ View observations that are both **APPROVED** and **PUBLISHED**
- ✅ Add feedback to observations (if allowed)
- ✅ View action plans assigned to them

**Restrictions**:
- ❌ Cannot see DRAFT, SUBMITTED, or unpublished observations
- ❌ Cannot create or edit observations
- ❌ Cannot upload attachments
- ❌ Cannot access admin functions
- ❌ Cannot approve or reject anything

**Key Implementation**:
```typescript
// src/app/api/v1/observations/route.ts:109-119
} else {
  // Auditee/Guest: restrict by published+approved, plus any scoped access
  const scope = await getUserScope(session.user.id);
  const scopeWhere = buildScopeWhere(scope);
  const allowPublished: Prisma.ObservationWhereInput = {
    AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
  };
  const or: Prisma.ObservationWhereInput[] = [allowPublished];
  if (scopeWhere) or.push(scopeWhere);

  where = { AND: [where, { OR: or }] };
```

---

### 4. GUEST

**Purpose**: External users or temporary collaborators with restricted access.

**Capabilities**:
- ✅ Same as AUDITEE by default
- ✅ **Optional scope restrictions** via `GuestInvite.scope` JSON field
- ✅ Can be granted access to specific observations or audits only

**Restrictions**:
- ❌ Same as AUDITEE
- ❌ Additional restrictions via scope (if configured)

**Scope System**:

Guests can be invited with a `scope` object that restricts access:

```json
{
  "observationIds": ["obs-1", "obs-2", "obs-3"],
  "auditIds": ["audit-1"]
}
```

When a guest redeems an invite, their scope is stored and checked on every API request.

**Key Implementation**:
```typescript
// src/lib/scope.ts:5-11
export async function getUserScope(userId: string) {
  const invite = await prisma.guestInvite.findFirst({
    where: { redeemedById: userId },
    orderBy: { redeemedAt: "desc" }
  });
  return (invite?.scope as any) ?? null;
}
```

---

## Permission Matrix

| Resource | ADMIN | AUDITOR | AUDITEE | GUEST |
|----------|-------|---------|---------|-------|
| **Users** |
| View Users | ✅ | ❌ | ❌ | ❌ |
| Create Users | ✅ | ❌ | ❌ | ❌ |
| Invite Users | ✅ | ❌ | ❌ | ❌ |
| Disable Users | ✅ | ❌ | ❌ | ❌ |
| **Plants** |
| View Plants | ✅ | ✅ | ✅ | ✅ |
| Create Plants | ✅ | ❌ | ❌ | ❌ |
| Edit Plants | ✅ | ❌ | ❌ | ❌ |
| Delete Plants | ✅ | ❌ | ❌ | ❌ |
| **Audits** |
| View All Audits | ✅ | ❌ | ❌ | ❌ |
| View Assigned Audits | ✅ | ✅ | ❌ | ❌ |
| Create Audits | ✅ | ❌ | ❌ | ❌ |
| Edit Audits | ✅ | ❌ | ❌ | ❌ |
| Assign Auditors | ✅ | ❌ | ❌ | ❌ |
| Attach Checklists | ✅ | ❌ | ❌ | ❌ |
| **Observations** |
| View All Observations | ✅ | ❌ | ❌ | ❌ |
| View Assigned Observations | ✅ | ✅ (assigned audits) | ❌ | ❌ |
| View Published Observations | ✅ | ✅ | ✅ (approved only) | ✅ (approved + scoped) |
| Create Observations | ✅ | ✅ (assigned audits) | ❌ | ❌ |
| Edit Draft Observations | ✅ | ✅ (own) | ❌ | ❌ |
| Edit Approved Observations | ✅ (direct) | ✅ (via change request) | ❌ | ❌ |
| Submit for Approval | ✅ | ✅ | ❌ | ❌ |
| Approve/Reject | ✅ | ❌ | ❌ | ❌ |
| Publish | ✅ | ✅ | ❌ | ❌ |
| **Attachments** |
| Upload Attachments | ✅ | ✅ | ❌ | ❌ |
| View Attachments | ✅ | ✅ | ✅ (published obs) | ✅ (scoped) |
| **Action Plans** |
| Create Action Plans | ✅ | ✅ | ❌ | ❌ |
| Edit Action Plans | ✅ | ✅ | ❌ | ❌ |
| View Action Plans | ✅ | ✅ | ✅ (published obs) | ✅ (scoped) |
| **Checklists** |
| View Checklists | ✅ | ✅ | ❌ | ❌ |
| Create Checklists | ✅ | ❌ | ❌ | ❌ |
| Edit Checklists | ✅ | ❌ | ❌ | ❌ |
| Mark Items as Done | ✅ | ✅ | ❌ | ❌ |
| **Change Requests** |
| Submit Change Request | ✅ | ✅ (approved obs) | ❌ | ❌ |
| Approve/Deny CR | ✅ | ❌ | ❌ | ❌ |
| **Reports** |
| View Reports | ✅ | ✅ | ❌ | ❌ |
| Export Reports | ✅ | ✅ | ❌ | ❌ |

---

## Enforcement Mechanisms

### 1. API Route Protection

All API routes use NextAuth session validation and RBAC helpers.

**Pattern**:
```typescript
import { auth } from "@/lib/auth";
import { assertAdmin, assertAdminOrAuditor } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  assertAdmin(session.user.role); // Throws 403 if not admin

  // ... protected logic
}
```

**Files**:
- `src/lib/auth.ts` - NextAuth configuration and session management
- `src/lib/rbac.ts` - RBAC helper functions

### 2. RBAC Helper Functions

Located in `src/lib/rbac.ts`:

| Function | Purpose |
|----------|---------|
| `isAdmin(role)` | Check if role is ADMIN |
| `isAuditor(role)` | Check if role is AUDITOR |
| `isAuditee(role)` | Check if role is AUDITEE |
| `isGuest(role)` | Check if role is GUEST |
| `isAdminOrAuditor(role)` | Check if role is ADMIN or AUDITOR |
| `assertAdmin(role)` | Throw 403 error if not ADMIN |
| `assertAdminOrAuditor(role)` | Throw 403 error if not ADMIN or AUDITOR |

**Example Usage**:
```typescript
// src/app/api/v1/users/route.ts:6-8
export async function GET(req: NextRequest) {
  const session = await auth();
  assertAdmin(session?.user?.role); // Only admins can list users
```

### 3. Scope-Based Access Control

For GUEST users, additional restrictions can be applied via the scope system.

**Files**:
- `src/lib/scope.ts` - Scope utilities
- `prisma/schema.prisma:56-72` - GuestInvite model with scope field

**Functions**:

```typescript
// Get the most recent scope for a user
getUserScope(userId: string): Promise<any>

// Build Prisma where clause for scoped observations
buildScopeWhere(scope: any): Prisma.ObservationWhereInput | null

// Check if observation is within scope
isObservationInScope(obs: {id, auditId}, scope: any): boolean
```

**Scope Object Structure**:
```typescript
{
  observationIds?: string[];  // Specific observation IDs
  auditIds?: string[];        // Specific audit IDs
}
```

**Implementation**:
```typescript
// src/lib/scope.ts:13-25
export function buildScopeWhere(
  scope: any
): Prisma.ObservationWhereInput | null {
  const or: Prisma.ObservationWhereInput[] = [];
  if (scope?.observationIds?.length) {
    or.push({ id: { in: scope.observationIds as string[] } });
  }
  if (scope?.auditIds?.length) {
    or.push({ auditId: { in: scope.auditIds as string[] } });
  }
  return or.length ? { OR: or } : null;
}
```

### 4. Data Filtering in Queries

Rather than denying access, some endpoints filter data based on role.

**Example**: Observation listing (`src/app/api/v1/observations/route.ts:88-119`)

```typescript
if (session.user.role === "ADMIN") {
  // Admin sees everything
} else if (session.user.role === "AUDITOR") {
  // Filter by audit assignments
  where = { AND: [where, { audit: { assignments: { some: { auditorId: session.user.id } } } }] };
} else {
  // Auditee/Guest: only published + approved, plus scoped access
  const scope = await getUserScope(session.user.id);
  const scopeWhere = buildScopeWhere(scope);
  where = { AND: [where, { OR: [{ approvalStatus: "APPROVED", isPublished: true }, scopeWhere] }] };
}
```

### 5. UI-Level Restrictions

The frontend conditionally renders UI elements based on the user's role.

**Example**: Navigation bar (`src/components/NavBar.tsx:51-55`)

```tsx
{session?.user?.role === "ADMIN" && (
  <Link href="/admin/users" className={navLinkClass("/admin")}>
    Users
  </Link>
)}
```

**Note**: UI restrictions are **not a security measure** and must always be backed by API-level enforcement.

### 6. Audit Trail

All significant actions are logged to the `AuditEvent` table via `writeAuditEvent()` from `src/server/auditTrail.ts`.

**Events Logged**:
- User login
- Observation create/update/approve/reject
- Change request create/approve/deny
- Approval submissions
- User invites

**Example**:
```typescript
// src/lib/auth.ts:44-49
await writeAuditEvent({
  entityType: "USER",
  entityId: user.id,
  action: "LOGIN",
  actorId: user.id
});
```

---

## Key Workflows

### 1. Observation Approval Workflow

Observations move through states controlled by the `approvalStatus` field:

```
DRAFT → SUBMITTED → APPROVED
                 ↘ REJECTED
```

**States**:
- **DRAFT**: Initial state, editable by creator (ADMIN/AUDITOR)
- **SUBMITTED**: Submitted for approval, awaiting ADMIN review
- **APPROVED**: Approved by ADMIN, can be published
- **REJECTED**: Rejected by ADMIN, reverts to editable

**Permissions by State**:

| Action | DRAFT | SUBMITTED | APPROVED | REJECTED |
|--------|-------|-----------|----------|----------|
| Edit (Creator) | ✅ | ❌ | ❌ (CR only) | ✅ |
| Submit | ✅ | ❌ | ❌ | ❌ |
| Approve | ❌ | ✅ (ADMIN) | ❌ | ❌ |
| Reject | ❌ | ✅ (ADMIN) | ❌ | ❌ |
| Publish | ❌ | ❌ | ✅ | ❌ |

**Implementation**:
- Submit: `src/app/api/v1/observations/[id]/submit/route.ts`
- Approve/Reject: `src/app/api/v1/observations/[id]/approve/route.ts`
- Publish: `src/app/api/v1/observations/[id]/publish/route.ts`

**Example**: Approval enforcement
```typescript
// src/app/api/v1/observations/[id]/approve/route.ts:14-17
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdmin(session?.user?.role); // Only ADMIN can approve
```

---

### 2. Change Request System

When observations are **APPROVED**, they often have locked fields. Auditors cannot directly edit them but can submit **change requests**.

**Flow**:
```
Auditor → Create Change Request → ADMIN → Approve/Deny
                                         ↓
                                   Observation Updated (if approved)
```

**Who Can Submit**:
- ADMIN (can submit for any observation)
- AUDITOR (only for APPROVED observations)

**Who Can Approve/Deny**:
- ADMIN only

**Allowed Fields for Auditor Change Requests**:

Defined in `src/app/api/v1/observations/[id]/change-requests/route.ts:13-20`:

```typescript
const AUDITOR_FIELDS = new Set([
  "observationText",
  "risksInvolved",
  "riskCategory",
  "likelyImpact",
  "concernedProcess",
  "auditorPerson"
]);
```

**Implementation**:
- Create CR: `src/app/api/v1/observations/[id]/change-requests/route.ts:55-102`
- Approve/Deny CR: `src/app/api/v1/observations/[id]/change-requests/[crId]/route.ts`

**Example**: Auditor field restriction
```typescript
// src/app/api/v1/observations/[id]/change-requests/route.ts:76-82
if (userIsAuditor) {
  for (const k of Object.keys(patch)) {
    if (!AUDITOR_FIELDS.has(k)) {
      return NextResponse.json(
        { ok: false, error: `Field "${k}" not allowed in change request` },
        { status: 400 }
      );
    }
  }
}
```

---

### 3. Guest Invite & Scoping

Guests are created via invite tokens with optional scope restrictions.

**Flow**:
```
ADMIN creates invite → Email sent → Guest registers → Scope applied
```

**Invite Structure**:
```typescript
{
  email: "guest@example.com",
  role: "GUEST",
  token: "unique-token",
  scope: {
    observationIds: ["obs-1", "obs-2"],
    auditIds: ["audit-1"]
  },
  expiresAt: "2025-12-31T23:59:59Z"
}
```

**Scope Evaluation**:

When a guest makes a request, their scope is retrieved and applied:

```typescript
// src/app/api/v1/observations/route.ts:110-119
const scope = await getUserScope(session.user.id);
const scopeWhere = buildScopeWhere(scope);
const allowPublished: Prisma.ObservationWhereInput = {
  AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
};
const or: Prisma.ObservationWhereInput[] = [allowPublished];
if (scopeWhere) or.push(scopeWhere);

where = { AND: [where, { OR: or }] };
```

**Files**:
- `src/app/api/v1/auth/invite/route.ts` - Create and redeem invites
- `prisma/schema.prisma:56-72` - GuestInvite model

---

### 4. Audit Assignment

Auditors are assigned to specific audits via the `AuditAssignment` table.

**Who Can Assign**:
- ADMIN only

**Effect**:
- Auditors can **only** see and create observations for audits they are assigned to

**Implementation**:
- Assign: `src/app/api/v1/audits/[id]/assign/route.ts`
- Filter: `src/app/api/v1/observations/route.ts:92-103`

**Example**:
```typescript
// Assign auditor to audit
POST /api/v1/audits/{auditId}/assign
{
  "auditorId": "user-123"
}

// Creates record in AuditAssignment table
{
  auditId: "audit-1",
  auditorId: "user-123"
}
```

---

## Field-Level Permissions

### Observation Fields

| Field | ADMIN | AUDITOR (Draft) | AUDITOR (Approved) | AUDITEE | GUEST |
|-------|-------|-----------------|-------------------|---------|-------|
| `observationText` | ✅ | ✅ | ✅ (via CR) | ❌ | ❌ |
| `risksInvolved` | ✅ | ✅ | ✅ (via CR) | ❌ | ❌ |
| `riskCategory` | ✅ | ✅ | ✅ (via CR) | ❌ | ❌ |
| `likelyImpact` | ✅ | ✅ | ✅ (via CR) | ❌ | ❌ |
| `concernedProcess` | ✅ | ✅ | ✅ (via CR) | ❌ | ❌ |
| `auditorPerson` | ✅ | ✅ | ✅ (via CR) | ❌ | ❌ |
| `auditeePersonTier1` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `auditeePersonTier2` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `auditeeFeedback` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `auditorResponseToAuditee` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `targetDate` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `personResponsibleToImplement` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `currentStatus` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `approvalStatus` | ✅ (direct) | ✅ (submit only) | ❌ | ❌ | ❌ |
| `isPublished` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `lockedFields` | ✅ (bypass) | ❌ (enforced) | ❌ | ❌ | ❌ |

### Change Request Allowed Fields (for Auditors)

From `src/app/api/v1/observations/[id]/change-requests/route.ts:13-20`:

```typescript
const AUDITOR_FIELDS = new Set([
  "observationText",
  "risksInvolved",
  "riskCategory",
  "likelyImpact",
  "concernedProcess",
  "auditorPerson"
]);
```

### Admin Change Request Allowed Fields

From `src/app/api/v1/observations/[id]/change-requests/[crId]/route.ts:34-38`:

```typescript
const allowed = new Set([
  "observationText","risksInvolved","riskCategory","likelyImpact","concernedProcess","auditorPerson",
  "auditeePersonTier1","auditeePersonTier2","auditeeFeedback","hodActionPlan",
  "targetDate","personResponsibleToImplement","currentStatus"
]);
```

### Locked Fields

Observations can have a `lockedFields` JSON field that specifies which fields cannot be edited.

**Example**:
```json
{
  "lockedFields": ["observationText", "riskCategory"]
}
```

**Enforcement**:
- ADMIN bypasses locks
- AUDITOR must submit change request for locked fields on APPROVED observations
- Lock checking not yet implemented in all edit endpoints (potential gap)

---

## Implementation Patterns

### Pattern 1: Admin-Only Endpoint

**File**: `src/app/api/v1/users/route.ts`

```typescript
import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  assertAdmin(session?.user?.role); // Throws 403 if not admin

  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true }
  });

  return NextResponse.json({ ok: true, users });
}
```

---

### Pattern 2: Role-Based Data Filtering

**File**: `src/app/api/v1/observations/route.ts:88-119`

```typescript
let where: Prisma.ObservationWhereInput = /* base filters */;

if (session.user.role === "ADMIN") {
  // Admin can see all observations
  if (published === "1") where = { AND: [where, { isPublished: true }] };
  else if (published === "0") where = { AND: [where, { isPublished: false }] };

} else if (session.user.role === "AUDITOR") {
  // Auditor can only see observations from assigned audits
  const auditorFilter: Prisma.ObservationWhereInput = {
    audit: {
      assignments: {
        some: { auditorId: session.user.id }
      }
    }
  };
  where = { AND: [where, auditorFilter] };

} else {
  // Auditee/Guest: published+approved + scoped access
  const scope = await getUserScope(session.user.id);
  const scopeWhere = buildScopeWhere(scope);
  const allowPublished: Prisma.ObservationWhereInput = {
    AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
  };
  const or: Prisma.ObservationWhereInput[] = [allowPublished];
  if (scopeWhere) or.push(scopeWhere);

  where = { AND: [where, { OR: or }] };
}

const obs = await prisma.observation.findMany({ where });
```

---

### Pattern 3: Conditional Permission (Admin or Auditor)

**File**: `src/app/api/v1/observations/route.ts:149-151`

```typescript
export async function POST(req: NextRequest) {
  const session = await auth();
  assertAdminOrAuditor(session?.user?.role); // Only ADMIN or AUDITOR

  // Create observation logic
}
```

---

### Pattern 4: Change Request Workflow

**File**: `src/app/api/v1/observations/[id]/change-requests/route.ts:55-102`

```typescript
export async function POST(req: NextRequest, { params }) {
  const session = await auth();
  const userIsAuditor = isAdminOrAuditor(session.user.role) && !isAdmin(session.user.role);
  const userIsAdmin = isAdmin(session.user.role);

  if (!userIsAuditor && !userIsAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const obs = await prisma.observation.findUnique({ where: { id } });

  // Auditors can only request changes for APPROVED observations
  if (obs.approvalStatus !== "APPROVED" && userIsAuditor) {
    return NextResponse.json(
      { ok: false, error: "Change request only for approved observations" },
      { status: 400 }
    );
  }

  const { patch, comment } = createSchema.parse(await req.json());

  // Restrict patch keys for auditors
  if (userIsAuditor) {
    for (const k of Object.keys(patch)) {
      if (!AUDITOR_FIELDS.has(k)) {
        return NextResponse.json(
          { ok: false, error: `Field "${k}" not allowed in change request` },
          { status: 400 }
        );
      }
    }
  }

  const cr = await prisma.observationChangeRequest.create({
    data: {
      observationId: id,
      requesterId: session.user.id,
      patch: patch as any,
      comment: comment ?? null
    }
  });

  return NextResponse.json({ ok: true, requestId: cr.id });
}
```

**Approval**: `src/app/api/v1/observations/[id]/change-requests/[crId]/route.ts:13-93`

```typescript
export async function POST(req: NextRequest, { params }) {
  const session = await auth();
  assertAdmin(session?.user?.role); // Only ADMIN can approve/deny

  const { approve, decisionComment } = decideSchema.parse(await req.json());

  if (approve) {
    // Apply the patch to observation
    const updated = await prisma.observation.update({ where: { id }, data });

    await prisma.observationChangeRequest.update({
      where: { id: crId },
      data: {
        status: "APPROVED",
        decidedById: session.user.id,
        decidedAt: new Date(),
        decisionComment
      }
    });
  } else {
    await prisma.observationChangeRequest.update({
      where: { id: crId },
      data: { status: "DENIED", decidedById: session.user.id, decidedAt: new Date() }
    });
  }
}
```

---

### Pattern 5: Scope-Based Access

**File**: `src/lib/scope.ts`

```typescript
// 1. Retrieve user's scope
export async function getUserScope(userId: string) {
  const invite = await prisma.guestInvite.findFirst({
    where: { redeemedById: userId },
    orderBy: { redeemedAt: "desc" }
  });
  return (invite?.scope as any) ?? null;
}

// 2. Build Prisma where clause
export function buildScopeWhere(scope: any): Prisma.ObservationWhereInput | null {
  const or: Prisma.ObservationWhereInput[] = [];
  if (scope?.observationIds?.length) {
    or.push({ id: { in: scope.observationIds as string[] } });
  }
  if (scope?.auditIds?.length) {
    or.push({ auditId: { in: scope.auditIds as string[] } });
  }
  return or.length ? { OR: or } : null;
}

// 3. Check if specific observation is in scope
export function isObservationInScope(
  obs: { id: string; auditId: string },
  scope: any
) {
  if (!scope) return false;
  const obsIds: string[] = Array.isArray(scope.observationIds) ? scope.observationIds : [];
  const audIds: string[] = Array.isArray(scope.auditIds) ? scope.auditIds : [];
  return obsIds.includes(obs.id) || audIds.includes(obs.auditId);
}
```

---

## Future Considerations

As the MVP evolves, consider the following areas for enhancement:

### 1. **Permission Gaps**

- [ ] **Locked field enforcement**: The `lockedFields` JSON field exists but is not consistently checked across all edit endpoints
- [ ] **Direct observation edits**: Some update endpoints may not fully enforce approval status checks
- [ ] **Attachment permissions**: No fine-grained control over who can download specific attachments
- [ ] **Running notes visibility**: `NoteVisibility` enum exists (INTERNAL/ALL) but enforcement is not implemented

### 2. **Role Expansion**

Consider adding more granular roles:
- **Audit Manager**: Can assign auditors and manage audits but cannot approve observations
- **Reviewer**: Can review and comment but not approve
- **Read-Only Admin**: Can see everything but not modify

### 3. **Permission Scoping**

- [ ] Extend scope system to AUDITEE role (currently only for GUEST)
- [ ] Add plant-level scoping (user can only see observations for specific plants)
- [ ] Add department-level scoping
- [ ] Support role hierarchy (e.g., ADMIN inherits AUDITOR permissions)

### 4. **Audit Trail Enhancements**

- [ ] Add more granular action types (e.g., "FIELD_LOCK", "PUBLISH", "UNPUBLISH")
- [ ] Track permission denials (failed access attempts)
- [ ] Add IP address and user agent to audit events

### 5. **Field-Level Permissions**

- [ ] Implement a permission matrix for individual fields
- [ ] Allow customizable locked fields based on observation state
- [ ] Add time-based field locking (e.g., lock after 30 days)

### 6. **Multi-Tenant Support**

If the platform needs to support multiple organizations:
- [ ] Add organization/tenant model
- [ ] Scope all permissions within tenant boundaries
- [ ] Add tenant-specific roles

### 7. **WebSocket Authorization**

Current WebSocket implementation:
- Token-based authentication (`src/websocket/auth.ts`)
- No room-level authorization (anyone can join any room)

Improvements needed:
- [ ] Verify room access permissions before joining
- [ ] Filter broadcast messages based on recipient permissions
- [ ] Add audit trail for WebSocket connections

### 8. **API Rate Limiting**

Currently no rate limiting exists:
- [ ] Add rate limits per role (e.g., GUEST has lower limits)
- [ ] Track API usage per user
- [ ] Implement exponential backoff for failed auth attempts

### 9. **Testing**

No automated tests currently exist:
- [ ] Add unit tests for RBAC helper functions
- [ ] Add integration tests for permission enforcement
- [ ] Test scope system edge cases
- [ ] Test change request workflow end-to-end

### 10. **Documentation Maintenance**

- [ ] Keep this document synchronized with code changes
- [ ] Add inline code comments referencing RBAC rules
- [ ] Create permission decision flowcharts
- [ ] Document permission migration strategy for data model changes

---

## Quick Reference

### Default User Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@example.com | admin123 |
| AUDITOR | auditor@example.com | auditor123 |
| AUDITEE | auditee@example.com | auditee123 |
| GUEST | guest@example.com | guest123 |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/rbac.ts` | RBAC helper functions |
| `src/lib/scope.ts` | Guest scope utilities |
| `src/lib/auth.ts` | NextAuth configuration |
| `prisma/schema.prisma` | Database schema with User and GuestInvite models |
| `src/server/auditTrail.ts` | Audit event logging |
| `src/app/(dashboard)/layout.tsx` | Protected layout wrapper |
| `src/components/NavBar.tsx` | UI-level role restrictions |

### Quick Commands

```bash
# Seed database with default users
npm run db:seed

# View database in GUI
npx prisma studio

# Check user roles
psql -d <db_name> -c "SELECT email, role FROM \"User\";"

# View audit events
psql -d <db_name> -c "SELECT * FROM \"AuditEvent\" ORDER BY \"createdAt\" DESC LIMIT 10;"
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-22
**Maintainer**: Development Team

For questions or updates to this document, please contact the development team or create an issue in the repository.
