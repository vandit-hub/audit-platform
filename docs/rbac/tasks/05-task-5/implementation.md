# RBAC Task 5: UI Implementation

**Status**: ✅ COMPLETE - All subtasks implemented (12/12 - 100%)
**Dependencies**: RBAC_TASK_3, RBAC_TASK_4
**Document Reference**: RBAC_updated.md - Step 6
**Last Updated**: 2025-01-23

---

## Implementation Progress

### ✅ Completed Features (12/12)

1. **NavBar Role-Based Navigation** - All navigation items show/hide based on RBAC v2 roles
   - CFO/CXO: Plants, Audits, Observations, Reports, Users
   - Audit Head: Audits, Observations, Reports
   - Auditor: Audits, Observations
   - Auditee: Observations only

2. **Audit List Page Access Control** - Creation form restricted to CFO/CXO_TEAM using `isCFOOrCXOTeam()`

3. **Observation Detail Page Role Checks** - All role checks updated to RBAC v2 helpers
   - `canOverride`, `isAuditorRole`, `canApprove`, `canPublish`, `canSubmit`, `canRetest`, `canDelete`

4. **Lock/Unlock/Complete Buttons** - Full audit lifecycle management
   - Displays current state (Open/Locked/Completed)
   - Shows lock/completion metadata
   - Context-aware buttons with confirmation dialogs

5. **Audit Head Assignment Section** - Dedicated management interface
   - Prominent display with role badge
   - Assignment interface for CFO/CXO
   - Warning when no audit head assigned

6. **Observation Delete Button** - Role-based visibility
   - CFO: Always can delete
   - Audit Head: Can delete when audit unlocked
   - Others: Cannot delete

7. **Assigned Auditees Display** - Complete assignment management
   - List display with avatars and assignment dates
   - Add/remove interface for authorized roles
   - Read-only view for auditees

8. **Field-Level Access for Auditees** - Full enforcement
   - Audit lock check (blocks all edits except CFO)
   - Assignment verification (auditees must be assigned)
   - Field-level restrictions (AUDITEE_EDITABLE_FIELDS only)
   - Informational banners (not assigned/locked/can edit)

9. **Section Headers and Field Labels** - Clear visual distinction
   - Auditor Section: Blue left border with description
   - Auditee Section: Green left border with description
   - Helper text explains permissions for each section

10. **Approve/Reject/Submit Buttons** - Already functional with RBAC v2
    - Approve/Reject: Uses `canApproveObservations(role)` (CFO + Audit Head)
    - Submit: Uses `isAuditorOrAuditHead(role)`
    - Properly disabled when audit locked

11. **Audit Visibility Configuration Panel** - ✅ IMPLEMENTED
    - CFO/CXO Team can configure historical audit visibility
    - Three presets: Show All, Last 12 Months, Hide All Historical
    - Clear explanation of each visibility mode
    - Current visibility setting displayed with badge
    - Applies restrictions to auditors and audit heads (CFO/CXO always have full visibility)

12. **Locked Audit Indicators Throughout UI** - ✅ IMPLEMENTED
    - **Audits List Page**: Lock status column with lock icon badges (Completed/Locked/Open)
    - **Observations List Page**: Audit status column showing parent audit lock state
    - Lock indicators use warning badge (orange) for locked, success (green) for completed, neutral for open
    - Lock icon SVG included in locked status badges

### 📋 Implementation Summary

**All Features Complete:**
- ✅ All core RBAC v2 functionality implemented
- ✅ Role-based navigation, permissions, and field access fully enforced
- ✅ Audit lifecycle management (lock/unlock/complete) functional
- ✅ Assignment management for both audit heads and auditees works
- ✅ Approve/reject/submit workflows respect new roles
- ✅ Visibility configuration panel for advanced access control
- ✅ Lock indicators visible across all relevant pages

**Files Modified:**
1. `src/components/NavBar.tsx` - Role-based navigation
2. `src/app/(dashboard)/audits/page.tsx` - Creation access + lock indicators
3. `src/app/(dashboard)/audits/[auditId]/page.tsx` - Lock/unlock/complete buttons + visibility config + audit head assignment
4. `src/app/(dashboard)/observations/[id]/page.tsx` - Complete RBAC v2 implementation with delete, assignments, field access
5. `src/app/(dashboard)/observations/page.tsx` - Audit lock status column

---

## Analysis

The existing UI components were built for the old ADMIN/AUDITOR/AUDITEE role system. This task updates them for the new RBAC v2 system with five roles: CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE.

**Key Findings from Codebase Analysis**:

1. **Navigation (NavBar.tsx)**: Currently hardcoded to show "ADMIN" role check at line 51. Needs conditional rendering based on all five roles.

2. **Audits List Page**: Uses `isAdmin` check (line 28, 116) to control create form visibility. Needs updating to `isCFOOrCXOTeam()`.

3. **Audit Detail Page**: Currently shows assignment management for auditors. Needs to add lock/unlock/complete buttons and visibility configuration panel for CFO/CXO.

4. **Observation Detail Page**: Most complex component with extensive permission logic. Currently uses `isAdmin` and `isAuditor` checks (lines 463-472). Needs comprehensive RBAC v2 updates including:
   - Role-based button visibility (Submit, Approve/Reject, Delete)
   - Field-level access control for auditees
   - Audit lock enforcement
   - Assigned auditee display

**Implementation Strategy**:
- Import RBAC helpers from `src/lib/rbac.ts` in all UI components
- Replace all role string comparisons with RBAC helper functions
- Use `session.user.role` consistently across components
- Add new UI elements for RBAC v2 features (lock/unlock/complete buttons, visibility config)
- Ensure CFO short-circuit behavior is respected in UI (show all options)

---

## Subtasks

### 1. Update NavBar with Role-Based Navigation
**Action**: Modify `src/components/NavBar.tsx` to show navigation items based on RBAC v2 roles
**Context**: Navigation currently hardcodes ADMIN check. Need to implement role-specific menu visibility per the permission matrix.
**Acceptance**:
- Import RBAC helpers: `isCFOOrCXOTeam`, `isAuditHead`, `isAuditorOrAuditHead`, `isAuditee`
- Plants link visible to: CFO, CXO_TEAM (use `isCFOOrCXOTeam(role)`)
- Audits link visible to: CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR (hide for AUDITEE only)
- Observations link visible to: All roles (no restriction)
- Reports link visible to: CFO, CXO_TEAM, AUDIT_HEAD (use `isCFOOrCXOTeam(role) || isAuditHead(role)`)
- Users link visible to: CFO, CXO_TEAM (use `isCFOOrCXOTeam(role)`)
- Replace line 51 ADMIN check with RBAC helper
- Manual test: Login as each role and verify correct menu items show
**Files**: `src/components/NavBar.tsx`

---

### 2. Update Audit List Page Creation Form Access
**Action**: Modify `src/app/(dashboard)/audits/page.tsx` to restrict audit creation to CFO/CXO_TEAM
**Context**: Audit creation and management is reserved for CFO and CXO_TEAM roles. Auditors and Audit Heads can only view assigned audits.
**Acceptance**:
- Import `isCFOOrCXOTeam` from `src/lib/rbac.ts`
- Replace `isAdmin` variable (line 28) with: `const canManageAudits = isCFOOrCXOTeam(session?.user?.role)`
- Update all references to `isAdmin` in component (lines 116, 207, 220) with `canManageAudits`
- Form title changes from "Create Audit (Admin only)" to "Create Audit (CFO/CXO Team)"
- Info message for non-managers updates to explain role-based access
- Manual test: CFO/CXO can see form, AUDIT_HEAD/AUDITOR/AUDITEE cannot
**Files**: `src/app/(dashboard)/audits/page.tsx`

---

### 3. Add Lock/Unlock/Complete Buttons to Audit Detail Page
**Action**: Add audit state management buttons to `src/app/(dashboard)/audits/[auditId]/page.tsx` for CFO/CXO_TEAM
**Context**: CFO and CXO_TEAM can lock, unlock, and complete audits. These operations are performed via new API endpoints created in Tasks 2-4.
**Acceptance**:
- Import `isCFOOrCXOTeam` from `src/lib/rbac.ts`
- Add role check: `const canManageAudit = isCFOOrCXOTeam(session?.user?.role)`
- Add audit lock status fields to `Audit` type: `isLocked?: boolean`, `completedAt?: string | null`, `lockedAt?: string | null`
- Create new Card section titled "Audit Controls" visible only when `canManageAudit` is true
- Add three async functions:
  - `lockAudit()`: POST to `/api/v1/audits/${auditId}/lock`
  - `unlockAudit()`: POST to `/api/v1/audits/${auditId}/unlock`
  - `completeAudit()`: POST to `/api/v1/audits/${auditId}/complete`
- Display current status badges: "Locked" (orange), "Completed" (green), "Open" (blue)
- Show buttons based on state:
  - If not locked and not completed: Show "Lock Audit" and "Mark Complete" buttons
  - If locked but not completed: Show "Unlock Audit" button
  - If completed: Show "Unlock Audit" button (CFO override capability)
- Add confirmation dialogs for lock/complete operations
- Show lock/completion metadata (lockedAt, completedAt dates) when applicable
- Refresh audit data after any state change
- Manual test: CFO/CXO can lock/unlock/complete; other roles don't see buttons
**Files**: `src/app/(dashboard)/audits/[auditId]/page.tsx`

---

### 4. Add Audit Visibility Configuration Panel
**Action**: Add visibility rules configuration to `src/app/(dashboard)/audits/[auditId]/page.tsx` for CFO/CXO_TEAM
**Context**: Visibility rules control which historical audits are visible to auditors and audit heads. This is an optional feature for advanced access control.
**Acceptance**:
- Add `visibilityRules?: any` to `Audit` type definition
- Create new Card section titled "Visibility Configuration" visible only when `canManageAudit` is true
- Add visibility preset selector with options:
  - "Show All Audits" (value: `{mode: "show_all"}`)
  - "Last 12 Months Only" (value: `{mode: "last_12m"}`)
  - "Hide All Historical Audits" (value: `{mode: "hide_all"}`)
- Add async function `updateVisibility(rules)`: PATCH to `/api/v1/audits/${auditId}/visibility` with `{visibilityRules: rules}`
- Display current visibility rule in a badge/status indicator
- Show explanatory text: "Controls which historical audits are visible to auditors and audit heads assigned to this audit."
- Include Save button to persist changes
- Refresh audit data after updating visibility
- Manual test: CFO/CXO can change visibility; settings persist after reload
**Files**: `src/app/(dashboard)/audits/[auditId]/page.tsx`

---

### 5. Update Observation Detail Page Role Checks
**Action**: Replace all role checks in `src/app/(dashboard)/observations/[id]/page.tsx` with RBAC v2 helpers
**Context**: Observation detail page has extensive permission logic that needs to align with RBAC v2. Currently uses string comparisons for ADMIN/AUDITOR roles.
**Acceptance**:
- Import all needed helpers from `src/lib/rbac.ts`: `isCFO`, `isCXOTeam`, `isAuditHead`, `isAuditorOrAuditHead`, `isAuditee`, `canApproveObservations`
- Replace `isAdmin` variable (line 463) with: `const canOverride = isCFO(role)`
- Replace `isAuditor` variable (line 464) with: `const isAuditorRole = isAuditorOrAuditHead(role) && !isAuditHead(role)` (to distinguish pure auditor from audit head)
- Update `canApprove` (line 465): `const canApprove = canApproveObservations(role)`
- Update `canPublish` (line 466): Keep as `isCFO(role)` (CFO only)
- Update `canSubmit` (line 467): `const canSubmit = isAuditorOrAuditHead(role)`
- Update `canRetest` (line 468): `const canRetest = isAuditorOrAuditHead(role)`
- Update `canUploadAnnex` (line 469): `const canUploadAnnex = isAuditorOrAuditHead(role)`
- Update `canUploadMgmt` (line 470): Keep existing logic but add audit head check
- All occurrences of `isAdmin` throughout component replaced with `canOverride`
- Ensure CFO short-circuit: CFO sees all buttons and can edit all fields regardless of state
- Manual test: Each role sees correct buttons and can perform allowed actions
**Files**: `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtask 1 must complete first to ensure imports are correct

---

### 6. Add Observation Delete Button with Role-Based Visibility
**Action**: Add Delete button to observation detail page with proper RBAC authorization
**Context**: CFO can always delete observations. Audit Head can delete observations only when the parent audit is not locked.
**Acceptance**:
- Add `audit.isLocked` field to Observation type's nested audit object
- Import `isAuditHead` and `isCFO` from `src/lib/rbac.ts`
- Compute delete permission: `const canDelete = isCFO(role) || (isAuditHead(role) && !o.audit.isLocked)`
- Add DELETE function: `async function deleteObservation()` that:
  - Shows confirmation dialog: "Are you sure you want to delete this observation? This action cannot be undone."
  - Sends DELETE request to `/api/v1/observations/${id}`
  - On success: navigate back to observations list via `router.push('/observations')`
  - On error: show error toast
- Add "Delete Observation" button in the button group (line 756+), styled with destructive variant
- Button visible only when `canDelete` is true
- Show appropriate tooltip/explanation:
  - CFO: "Delete this observation (CFO override)"
  - Audit Head on open audit: "Delete this observation"
  - Audit Head on locked audit: Button hidden with explanation text "Cannot delete - audit is locked"
- Manual test: CFO can always delete; Audit Head can delete only on unlocked audits; others cannot delete
**Files**: `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtask 5 must complete first

---

### 7. Add Assigned Auditees Display Section
**Action**: Add a new section showing auditees assigned to the observation
**Context**: Observations can have multiple auditees assigned via ObservationAssignment. This information should be visible to all users viewing the observation.
**Acceptance**:
- Add `assignments?: {id: string, auditee: {id: string, name: string | null, email: string | null}, assignedAt: string}[]` to Observation type
- Update observation load to include assignments (API should already return this data)
- Create new Card section titled "Assigned Auditees" positioned after Observation Details form
- Display list of assigned auditees with:
  - Avatar/initials circle
  - Name or email
  - "Assigned on {date}" timestamp
- Show "No auditees assigned" message when assignments array is empty
- For CFO/CXO/AUDIT_HEAD/AUDITOR: Add assignment interface
  - User dropdown to select from AUDITEE role users
  - "Assign Auditee" button
  - POST to `/api/v1/observations/${id}/assign-auditee` with `{auditeeId}`
  - Remove auditee button for each assigned auditee (DELETE request)
- For AUDITEE: Show read-only list (no add/remove capability)
- Refresh observation data after assignment changes
- Manual test: Can assign/remove auditees; assignments persist; auditees can see their assignments
**Files**: `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtask 5 must complete first

---

### 8. Implement Field-Level Access for Auditees
**Action**: Update field disabling logic to properly restrict auditee field editing based on assignment and audit lock status
**Context**: Auditees can only edit designated fields (auditeePersonTier1, auditeePersonTier2, auditeeFeedback, targetDate, personResponsibleToImplement, currentStatus) and only when they are assigned to the observation and the parent audit is not locked.
**Acceptance**:
- Update `isFieldDisabled()` function (line 331) to include audit lock check
- For AUDITEE role:
  - Check if current user is assigned: `const isAssigned = o.assignments?.some(a => a.auditee.id === userId)`
  - Check if audit is locked: `const auditLocked = o.audit?.isLocked`
  - Disable all fields if not assigned OR if audit is locked
  - Enable only AUDITEE_EDITABLE_FIELDS if assigned AND audit not locked
- Update field className logic to show visual indication:
  - Locked by audit: Red border with "Audit Locked" indicator
  - Not assigned: Gray background with "Not Assigned" indicator
  - Editable: Normal styling
- Add informational banner at top of form for auditees:
  - If not assigned: "You are not assigned to this observation and cannot edit it."
  - If assigned but locked: "This audit is locked. You cannot edit fields at this time."
  - If assigned and open: "You can edit auditee fields marked in blue."
- Add visual labels to clearly distinguish "Auditor Fields" vs "Auditee Fields" sections (already exists at lines 531, 656)
- Manual test: Auditee can edit only their fields when assigned and audit open; cannot edit when locked or not assigned
**Files**: `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtasks 5 and 7 must complete first

---

### 9. Update Section Headers and Field Labels for Clarity
**Action**: Enhance visual clarity of field sections to distinguish auditor vs auditee responsibilities
**Context**: The observation form has two main sections: auditor-owned fields and auditee-owned fields. These need clear visual distinction.
**Acceptance**:
- Section 1 header (line 532): Update to "Auditor Section — Fields managed by auditors and audit heads"
- Section 2 header (line 657): Update to "Auditee Section — Fields managed by assigned auditees"
- Add colored accent borders:
  - Auditor section: Blue left border (border-l-4 border-primary-500)
  - Auditee section: Green left border (border-l-4 border-success-500)
- Add role-based helper text below each section header:
  - Auditor section: "Visible to all, editable by auditors and audit heads (when in draft or rejected status)"
  - Auditee section: "Visible to all, editable by assigned auditees (even after approval, while audit is open)"
- Ensure section styling is consistent with Card component design system
- Manual test: Visual distinction is clear; helper text accurately describes permissions
**Files**: `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtask 8 must complete first

---

### 10. Add Approve/Reject Button Logic with Audit Head Authorization
**Action**: Update approve/reject buttons to enforce Audit Head authorization (not just ADMIN)
**Context**: In RBAC v2, both CFO and AUDIT_HEAD can approve/reject observations. Current implementation only checks for ADMIN.
**Acceptance**:
- Ensure `canApprove` uses `canApproveObservations(role)` helper (covered in Subtask 5)
- Update approve/reject buttons visibility (lines 764-768) based on `canApprove`
- Update `approve()` function (line 196) to work with new `/api/v1/observations/[id]/approve` endpoint
- Add comment field to approval dialog:
  - Before approving/rejecting, show prompt: "Optional comment for this decision:"
  - Pass comment in request body: `{approve: boolean, comment?: string}`
- Update success messages to indicate who approved: "Observation approved by [role]"
- Display approval history in Approvals card (already exists at line 994) with actor role badge
- Disable approve/reject buttons when audit is locked (unless CFO)
- Add tooltip for disabled state: "Audit is locked - cannot approve/reject"
- Manual test: Audit Head and CFO can approve/reject; approval creates audit trail record; locked audits block approval (except CFO)
**Files**: `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtask 5 must complete first

---

### 11. Add Submit Button with Proper Authorization
**Action**: Update Submit for Approval button to work with RBAC v2 roles
**Context**: Submit button allows AUDITOR and AUDIT_HEAD to submit draft observations for approval.
**Acceptance**:
- Ensure `canSubmit` uses `isAuditorOrAuditHead(role)` helper (covered in Subtask 5)
- Submit button (line 763) visible only when `canSubmit && o.approvalStatus === 'DRAFT'`
- Add status-based disabling:
  - Disable if already submitted: `o.approvalStatus === 'SUBMITTED'`
  - Disable if already approved: `o.approvalStatus === 'APPROVED'`
  - Enable if draft or rejected: `o.approvalStatus === 'DRAFT' || o.approvalStatus === 'REJECTED'`
- Add audit lock check: Disable if `o.audit?.isLocked` (unless CFO)
- Update `submitForApproval()` function (line 183) to:
  - Validate required fields before submission
  - Show confirmation: "Submit this observation for approval?"
  - On success: reload and show who submitted (actor info)
- Add status badge next to submit button showing current approval status
- Manual test: Auditors and Audit Heads can submit drafts; cannot submit when locked (except CFO); cannot re-submit already submitted
**Files**: `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtask 5 must complete first

---

### 12. Update Audit Assignment Section for Audit Heads
**Action**: Modify `src/app/(dashboard)/audits/[auditId]/page.tsx` to show audit head assignment separately
**Context**: Audits now have a dedicated `auditHeadId` field. This should be displayed and managed separately from regular auditor assignments.
**Acceptance**:
- Add `auditHeadId?: string | null` and `auditHead?: User | null` to Audit type
- Create new section in Assignments card: "Audit Head" (above auditors list)
- Display current audit head with prominent styling:
  - Larger avatar/badge
  - "Audit Head" role badge
  - Name/email
- For CFO/CXO_TEAM: Add "Change Audit Head" button
  - Opens dropdown to select from AUDIT_HEAD role users
  - PUT request to `/api/v1/audits/${auditId}` with `{auditHeadId}`
  - Shows confirmation: "Assign [name] as Audit Head for this audit?"
- Show "No audit head assigned" warning message when `auditHeadId` is null
- Separator between audit head and auditors list
- Auditors list title updates to "Team Members (Auditors)" for clarity
- Manual test: Can assign/change audit head; audit head displays correctly; only CFO/CXO can modify
**Files**: `src/app/(dashboard)/audits/[auditId]/page.tsx`

**Dependencies**: Subtask 2 must complete first

---

### 13. Add Locked Audit Indicator Throughout UI
**Action**: Display audit lock status across all relevant pages with clear visual indicators
**Context**: When an audit is locked, many operations are restricted. Users need clear visual feedback about lock status.
**Acceptance**:
- **Audits List Page** (`src/app/(dashboard)/audits/page.tsx`):
  - Add `isLocked` to AuditListItem type
  - Display lock icon in status column when `isLocked === true`
  - Add locked badge next to status badge (orange colored)
- **Audit Detail Page** (`src/app/(dashboard)/audits/[auditId]/page.tsx`):
  - Add prominent lock indicator banner at top when audit is locked
  - Banner style: Orange background, lock icon, text "This audit is locked. Most operations are restricted."
  - Show who locked it and when: "Locked by [user] on [date]"
  - Show similar banner for completed audits (green): "This audit is completed on [date]"
- **Observation Detail Page** (`src/app/(dashboard)/observations/[id]/page.tsx`):
  - Add lock status badge next to observation header
  - If parent audit is locked: Show warning banner "Parent audit is locked"
  - Disable save/submit buttons with tooltip explaining lock
  - Gray out locked fields with lock icon indicators
- All lock indicators should clearly state CFO override capability: "CFO can still make changes"
- Manual test: Lock status visible on all pages; indicators update immediately after lock/unlock
**Files**:
- `src/app/(dashboard)/audits/page.tsx`
- `src/app/(dashboard)/audits/[auditId]/page.tsx`
- `src/app/(dashboard)/observations/[id]/page.tsx`

**Dependencies**: Subtasks 2, 3, 5 must complete first

---

## Dependencies

**Sequential Dependencies**:
1. Subtask 1 (NavBar) can be done independently
2. Subtask 2 (Audit List) can be done independently
3. Subtasks 3 & 4 (Audit Detail enhancements) depend on Subtask 2
4. Subtask 12 (Audit Head assignment) depends on Subtask 2
5. Subtask 5 (Observation role checks) is a prerequisite for Subtasks 6, 7, 8, 9, 10, 11
6. Subtask 13 (Lock indicators) depends on Subtasks 2, 3, 5

**Suggested Implementation Order**:
1. Subtask 1 (NavBar) - Independent, quick win
2. Subtask 2 (Audit List) - Foundation for audit pages
3. Subtask 5 (Observation role checks) - Foundation for observation enhancements
4. Subtasks 3, 4, 12 (Audit Detail features) - Can be done in parallel
5. Subtasks 6, 7, 10, 11 (Observation buttons) - Can be done in parallel
6. Subtask 8 (Field access for auditees) - Requires assignments from Subtask 7
7. Subtask 9 (Section headers) - Polish after field logic is complete
8. Subtask 13 (Lock indicators) - Final polish across all pages

---

## Verification Checklist

After completing all subtasks, verify the following:

### Navigation
- [ ] CFO sees: Plants, Audits, Observations, Reports, Users
- [ ] CXO_TEAM sees: Plants, Audits, Observations, Reports, Users
- [ ] AUDIT_HEAD sees: Audits, Observations, Reports
- [ ] AUDITOR sees: Audits, Observations
- [ ] AUDITEE sees: Observations only

### Audits List Page
- [ ] Creation form visible only to CFO/CXO_TEAM
- [ ] Lock status badges display correctly
- [ ] All users see their assigned audits (visibility rules respected)

### Audit Detail Page
- [ ] Lock/Unlock/Complete buttons visible only to CFO/CXO_TEAM
- [ ] Current lock/completion status displays correctly
- [ ] Visibility configuration panel visible only to CFO/CXO_TEAM
- [ ] Visibility settings persist and affect audit listings
- [ ] Audit Head assignment section displays correctly
- [ ] CFO/CXO can change audit head
- [ ] Lock status banner shows at top when audit is locked

### Observation Detail Page
- [ ] Submit button visible to AUDITOR/AUDIT_HEAD (disabled when submitted/approved)
- [ ] Approve/Reject buttons visible to AUDIT_HEAD/CFO
- [ ] Delete button visible to CFO (always) and AUDIT_HEAD (when audit open)
- [ ] Assigned auditees section displays all assignments
- [ ] CFO/CXO/AUDIT_HEAD/AUDITOR can assign/remove auditees
- [ ] Auditee fields disabled for non-assigned users
- [ ] Auditee fields disabled when audit is locked
- [ ] Section headers clearly distinguish auditor vs auditee fields
- [ ] CFO can edit all fields regardless of lock/approval status
- [ ] Audit lock indicator shows when parent audit is locked
- [ ] Approval creates audit trail records

### Role-Specific Testing
- [ ] Login as CFO: Verify full access to all features
- [ ] Login as CXO_TEAM: Verify audit management but no observation authoring
- [ ] Login as AUDIT_HEAD: Verify can approve/reject, cannot manage audits
- [ ] Login as AUDITOR: Verify can create/edit drafts, cannot approve
- [ ] Login as AUDITEE: Verify can only edit assigned observation fields

### Edge Cases
- [ ] Locked audit blocks all modifications except CFO override
- [ ] Completed audit shows completion metadata and restricts edits
- [ ] Approved observation blocks auditor field edits (change request flow)
- [ ] Unassigned auditee sees read-only observation
- [ ] Audit Head can delete observations only when audit is open
- [ ] Visibility rules properly filter audit lists for auditors

---

## Notes for Implementation

**IMPORTANT - Fresh Implementation Approach**:
- This is a breaking change from the old ADMIN/AUDITOR system
- No need to preserve backward compatibility
- Can fully replace old role checks with new RBAC helpers
- Migration shims in rbac.ts (isAdmin, isAdminOrAuditor) should NOT be used in updated UI files
- Use only the new RBAC v2 functions

**Testing Strategy**:
1. Create test users for each role in database (should already exist from seed)
2. Test each UI file with each role systematically
3. Verify API enforcement matches UI restrictions (UI is not the security boundary)
4. Test audit lock/unlock lifecycle thoroughly
5. Test observation approval workflow end-to-end

**UI/UX Best Practices**:
- Use tooltips to explain disabled buttons ("Audit is locked")
- Show clear role-based messaging ("Only CFO/CXO can perform this action")
- Use color coding consistently (blue for auditor, green for auditee, orange for locks)
- Provide confirmation dialogs for destructive actions (delete, lock, complete)
- Show loading states during API operations
- Display success/error toasts with clear messages

**Common Pitfalls to Avoid**:
- Don't check role strings directly - always use RBAC helpers
- Don't forget CFO short-circuit (CFO bypasses all restrictions)
- Don't forget to check audit lock status in addition to role
- Don't forget to refresh data after state changes (lock, approve, assign)
- Don't assume UI restrictions enforce security (API must validate)
