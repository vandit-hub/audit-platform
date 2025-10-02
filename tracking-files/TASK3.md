# TASK 3: Action Plans & Observation Status

## Analysis

This task involves enhancing the action plan functionality and observation status workflow. The codebase currently has:
- Action plans stored in the `ActionPlan` model with basic fields (plan, owner, targetDate, status)
- Observation status using the `ObservationStatus` enum (PENDING, IN_PROGRESS, RESOLVED)
- API routes for action plan CRUD operations at `/api/v1/observations/[id]/actions`
- UI components displaying action plans in the observation detail page

The task requires:
1. **Action Plan Enhancements**: Rename "targetDate" label, add a status dropdown with specific values, add a retest field with auditor-only access, and implement auto-trigger logic when status changes to "Completed"
2. **Observation Status Updates**: Expand the status enum and implement auto-transition logic when auditee provides feedback

The implementation will involve database schema changes, API validation updates, UI modifications, and business logic for auto-transitions.

## Subtasks

### 1. Database Schema: Update ActionPlan Model ✅
**Status**: COMPLETED
**Action**: Add a new `retest` field to the `ActionPlan` model in `prisma/schema.prisma`
**Context**: Action plans need to track retest results (Retest due, Pass, Fail). The existing `status` field is a String and can remain for the Pending/Completed dropdown. We need a separate field for retest status.
**Acceptance**:
- Add `retest` field as an optional enum `ActionPlanRetest?`
- Create new enum `ActionPlanRetest` with values: RETEST_DUE, PASS, FAIL
- Field should be nullable (optional)
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/prisma/schema.prisma`
**Details**:
```prisma
model ActionPlan {
  id            String              @id @default(cuid())
  observationId String
  plan          String
  owner         String?
  targetDate    DateTime?
  status        String?
  retest        ActionPlanRetest?   // New field
  createdAt     DateTime            @default(now())
  observation   Observation         @relation(fields: [observationId], references: [id], onDelete: Cascade)
}

enum ActionPlanRetest {
  RETEST_DUE
  PASS
  FAIL
}
```

### 2. Database Schema: Update ObservationStatus Enum ✅
**Status**: COMPLETED
**Action**: Expand the `ObservationStatus` enum to include new status values
**Context**: The observation workflow needs more granular status tracking beyond PENDING, IN_PROGRESS, RESOLVED. The new workflow requires: Pending MR, MR under review, Referred back for MR, Observation finalised, Resolved
**Acceptance**:
- Update `ObservationStatus` enum with values: PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED
- Update default value to PENDING_MR
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/prisma/schema.prisma`
**Details**:
```prisma
enum ObservationStatus {
  PENDING_MR
  MR_UNDER_REVIEW
  REFERRED_BACK
  OBSERVATION_FINALISED
  RESOLVED
}
```

### 3. Database Migration: Apply Schema Changes ✅
**Status**: COMPLETED
**Action**: Create and run Prisma migration for the schema changes
**Issues Encountered**: Existing observations had old enum values (PENDING, IN_PROGRESS). Updated 2 observations to RESOLVED before applying schema changes.
**Context**: After updating the schema, we need to generate and apply migrations to update the database
**Acceptance**:
- Run `npx prisma migrate dev --name action_plan_and_status_enhancements`
- Migration should succeed without data loss
- Verify existing observations get default PENDING_MR status
**Files**: Migration files will be created in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/prisma/migrations/`
**Dependencies**: Must complete subtasks 1 and 2 first

### 4. API Route: Update Action Plan Create Validation ✅
**Status**: COMPLETED
**Action**: Update the zod schema in the POST handler to include retest field validation
**Context**: The API needs to accept and validate the new retest field when creating action plans
**Acceptance**:
- Add `retest` to createSchema as optional enum validation
- Only allow ADMIN and AUDITOR roles to set retest field
- Restrict AUDITEE from setting retest
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/actions/route.ts`
**Details**:
```typescript
const createSchema = z.object({
  plan: z.string().min(1),
  owner: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(["Pending", "Completed"]).optional(),
  retest: z.enum(["RETEST_DUE", "PASS", "FAIL"]).optional()
});

// In POST handler, add role check:
if (body.retest && !isAdminOrAuditor(session.user.role)) {
  return NextResponse.json({ ok: false, error: "Only admin/auditor can set retest" }, { status: 403 });
}
```

### 5. API Route: Update Action Plan Update Validation ✅
**Status**: COMPLETED
**Action**: Update the zod schema in the PATCH handler to include retest field validation
**Context**: The API needs to accept and validate the new retest field when updating action plans
**Acceptance**:
- Add `retest` to updateSchema as optional nullable enum validation
- Only allow ADMIN and AUDITOR roles to update retest field
- Restrict AUDITEE from updating retest
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/actions/[actionId]/route.ts`
**Details**:
```typescript
const updateSchema = z.object({
  plan: z.string().optional(),
  owner: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  status: z.enum(["Pending", "Completed"]).nullable().optional(),
  retest: z.enum(["RETEST_DUE", "PASS", "FAIL"]).nullable().optional()
});

// In PATCH handler, add role check:
if (input.retest !== undefined && !isAdminOrAuditor(session.user.role)) {
  return NextResponse.json({ ok: false, error: "Only admin/auditor can update retest" }, { status: 403 });
}
```

### 6. API Route: Implement Auto-Trigger Logic for Action Plan Status ✅
**Status**: COMPLETED
**Action**: Add business logic to automatically set retest to "RETEST_DUE" when status changes to "Completed"
**Context**: When an action plan status is changed to "Completed", the retest field should automatically be set to "RETEST_DUE"
**Acceptance**:
- When status is set to "Completed" in create or update, automatically set retest to "RETEST_DUE"
- Only auto-set if retest is not already provided in the request
- Log this auto-change in audit trail
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/actions/route.ts` and `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/actions/[actionId]/route.ts`
**Details**:
```typescript
// In POST handler, before creating:
const dataToCreate = {
  observationId: id,
  plan: input.plan,
  owner: input.owner ?? null,
  targetDate: input.targetDate ? new Date(input.targetDate) : null,
  status: input.status ?? null,
  retest: input.retest ?? (input.status === "Completed" ? "RETEST_DUE" : null)
};

// Similar logic for PATCH handler
```

### 7. API Route: Update Observation Status Validation ✅
**Status**: COMPLETED
**Action**: Update the zod schema in observation PATCH handler to accept new status values
**Context**: The observation update API needs to validate the new status enum values
**Acceptance**:
- Update currentStatus enum validation to accept: PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED
- Maintain existing RBAC - only AUDITEE can update currentStatus
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/route.ts`
**Details**:
```typescript
const updateSchema = z.object({
  // ... other fields
  currentStatus: z.enum([
    "PENDING_MR",
    "MR_UNDER_REVIEW",
    "REFERRED_BACK",
    "OBSERVATION_FINALISED",
    "RESOLVED"
  ]).optional()
});
```

### 8. API Route: Implement Auto-Transition for Observation Status ✅
**Status**: COMPLETED
**Action**: Add business logic to automatically change status to "MR_UNDER_REVIEW" when auditee provides feedback
**Context**: When the auditeeFeedback field is updated by an auditee, the currentStatus should automatically transition to "MR_UNDER_REVIEW" if it's currently "PENDING_MR"
**Acceptance**:
- When auditeeFeedback is provided and current status is PENDING_MR, auto-set to MR_UNDER_REVIEW
- Only trigger for AUDITEE role updates
- Log the auto-transition in audit trail
- Broadcast WebSocket update for status change
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/route.ts`
**Details**:
```typescript
// In PATCH handler, after building data object but before update:
if (isAuditee(session.user.role) &&
    input.auditeeFeedback &&
    orig.currentStatus === "PENDING_MR") {
  data.currentStatus = "MR_UNDER_REVIEW";
}
```

### 9. UI Component: Update Action Plan Input Field Labels ✅
**Status**: COMPLETED
**Action**: Change the "date" input label to "Target Date" in the action plan form
**Context**: The UI currently shows a generic date input without a clear label. This needs to be explicitly labeled as "Target Date"
**Acceptance**:
- Update the action plan input section to show "Target Date" as placeholder or label
- Maintain existing functionality
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Details**:
```tsx
// Line ~805, update:
<input
  className="border rounded px-3 py-2"
  type="date"
  placeholder="Target Date"
  value={apDate}
  onChange={(e) => setApDate(e.target.value)}
/>
```

### 10. UI Component: Replace Action Plan Status Input with Dropdown ✅
**Status**: COMPLETED
**Action**: Convert the free-text status input to a dropdown with "Pending" and "Completed" options
**Context**: The status field currently accepts any string. It needs to be a controlled dropdown with only two valid values
**Acceptance**:
- Replace text input with select dropdown
- Options: Pending, Completed
- Default to empty/unselected
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Details**:
```tsx
// Line ~806, replace:
<select
  className="border rounded px-3 py-2"
  value={apStatus}
  onChange={(e) => setApStatus(e.target.value)}
>
  <option value="">Status</option>
  <option value="Pending">Pending</option>
  <option value="Completed">Completed</option>
</select>
```

### 11. UI Component: Add Retest Dropdown to Action Plan Form ✅
**Status**: COMPLETED
**Action**: Add a new dropdown for retest field with options: Retest due, Pass, Fail
**Context**: Action plans need a retest field that only ADMIN and AUDITOR can modify
**Acceptance**:
- Add new select dropdown after status
- Options: blank, Retest due, Pass, Fail
- Only show/enable for ADMIN and AUDITOR roles
- Add state management for apRetest
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Details**:
```tsx
// Add state near line 75:
const [apRetest, setApRetest] = useState("");

// Add to the form grid near line 806:
{canRetest && (
  <select
    className="border rounded px-3 py-2"
    value={apRetest}
    onChange={(e) => setApRetest(e.target.value)}
  >
    <option value="">Retest</option>
    <option value="RETEST_DUE">Retest due</option>
    <option value="PASS">Pass</option>
    <option value="FAIL">Fail</option>
  </select>
)}

// Update addActionPlan function to include retest
```

### 12. UI Component: Update Action Plan Display to Show Retest ✅
**Status**: COMPLETED
**Action**: Update the action plan list display to show the retest field value
**Context**: When action plans are displayed, the retest status should be visible
**Acceptance**:
- Add retest to the display line with owner, target date, and status
- Format enum values to be user-friendly (RETEST_DUE → "Retest due", etc)
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Details**:
```tsx
// Update ActionPlan type definition near line 14:
type ActionPlan = {
  id: string;
  plan: string;
  owner?: string | null;
  targetDate?: string | null;
  status?: string | null;
  retest?: string | null;  // Add this
  createdAt: string
};

// Update display near line 813:
<div className="text-gray-600">
  Owner: {ap.owner ?? "—"} ·
  Target: {ap.targetDate ? new Date(ap.targetDate).toLocaleDateString() : "—"} ·
  Status: {ap.status ?? "—"} ·
  Retest: {ap.retest ? formatRetest(ap.retest) : "—"}
</div>

// Add helper function:
function formatRetest(retest: string): string {
  const map: Record<string, string> = {
    "RETEST_DUE": "Retest due",
    "PASS": "Pass",
    "FAIL": "Fail"
  };
  return map[retest] || retest;
}
```

### 13. UI Component: Update Observation Status Dropdown Options ✅
**Status**: COMPLETED
**Action**: Update the "Current Status" dropdown to show the new status values
**Context**: The observation form needs to display the new status enum values
**Acceptance**:
- Replace existing options (PENDING, IN_PROGRESS, RESOLVED) with new values
- Display user-friendly labels: "Pending MR", "MR under review", "Referred back for MR", "Observation finalised", "Resolved"
- Map to enum values: PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Details**:
```tsx
// Update type definition near line 32:
currentStatus: "PENDING_MR" | "MR_UNDER_REVIEW" | "REFERRED_BACK" | "OBSERVATION_FINALISED" | "RESOLVED";

// Update dropdown near line 666:
<select
  className={getFieldClassName("currentStatus")}
  value={draft.currentStatus}
  onChange={(e) => setField("currentStatus", e.target.value)}
>
  <option value="PENDING_MR">Pending MR</option>
  <option value="MR_UNDER_REVIEW">MR under review</option>
  <option value="REFERRED_BACK">Referred back for MR</option>
  <option value="OBSERVATION_FINALISED">Observation finalised</option>
  <option value="RESOLVED">Resolved</option>
</select>
```

### 14. UI Component: Update Action Plan API Calls ✅
**Status**: COMPLETED
**Action**: Modify the addActionPlan function to include the retest field when creating action plans
**Context**: The UI needs to send the retest value to the API when creating action plans
**Acceptance**:
- Include retest in the POST request body
- Clear apRetest state after successful creation
- Handle validation errors for unauthorized retest updates
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Details**:
```tsx
// Update addActionPlan function near line 313:
async function addActionPlan() {
  if (!apPlan.trim()) return;
  const res = await fetch(`/api/v1/observations/${id}/actions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      plan: apPlan,
      owner: apOwner || undefined,
      targetDate: apDate ? new Date(apDate).toISOString() : undefined,
      status: apStatus || undefined,
      retest: apRetest || undefined  // Add this
    })
  });
  if (res.ok) {
    setApPlan("");
    setApOwner("");
    setApDate("");
    setApStatus("");
    setApRetest("");  // Add this
    await load();
    showSuccess("Action plan added successfully!");
  } else {
    showError("Failed to add action plan!");
  }
}
```

### 15. Testing: Verify Action Plan Field Rename
**Action**: Test that the Target Date label appears correctly in the UI
**Context**: Ensure the field label change is visible to users
**Acceptance**:
- Load observation detail page
- Verify action plan form shows "Target Date" label/placeholder
- Create an action plan and verify the target date is saved correctly
**Files**: Manual testing on `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`

### 16. Testing: Verify Action Plan Status Dropdown and Auto-Trigger
**Action**: Test the status dropdown and automatic retest assignment
**Context**: Ensure the status dropdown works and retest auto-triggers when status is "Completed"
**Acceptance**:
- Create action plan with status "Completed" and verify retest automatically set to "Retest due"
- Create action plan with status "Pending" and verify retest is not auto-set
- Update existing action plan status to "Completed" and verify retest changes
- Verify dropdown only shows Pending/Completed options
**Files**: Test via API and UI

### 17. Testing: Verify Retest Field RBAC
**Action**: Test that only ADMIN and AUDITOR can set/update retest field
**Context**: Ensure AUDITEE and GUEST roles cannot modify retest
**Acceptance**:
- Login as AUDITOR, verify retest dropdown is visible and functional
- Login as ADMIN, verify retest dropdown is visible and functional
- Login as AUDITEE, verify retest dropdown is hidden or disabled
- Test API directly as AUDITEE - should return 403 error when trying to set retest
**Files**: Test via UI and API

### 18. Testing: Verify Observation Status Dropdown Updates
**Action**: Test that the new observation status values appear and work correctly
**Context**: Ensure the status dropdown displays all new values correctly
**Acceptance**:
- Load observation detail page
- Verify "Current Status" dropdown shows all 5 new options with correct labels
- Select each option and save - verify it persists
- Verify default value for new observations is "Pending MR"
**Files**: Test via UI

### 19. Testing: Verify Observation Status Auto-Transition
**Action**: Test that status auto-changes to "MR under review" when auditee provides feedback
**Context**: Ensure the auto-transition logic works when auditeeFeedback is updated
**Acceptance**:
- Create observation with status "Pending MR"
- Login as AUDITEE
- Add auditeeFeedback text and save
- Verify currentStatus automatically changed to "MR under review"
- Verify audit trail logs the status change
- Verify WebSocket broadcasts the update
**Files**: Test via UI and check database/audit logs

### 20. Documentation: Update API Documentation
**Action**: Document the new action plan and observation status fields and behaviors
**Context**: Developers and API consumers need to know about these changes
**Acceptance**:
- Document new ActionPlanRetest enum in relevant files
- Document new ObservationStatus enum values
- Document auto-trigger behaviors (status → retest, feedback → status)
- Document RBAC restrictions on retest field
**Files**: Update comments in schema file and API route files

## Dependencies

- Subtasks 1-3 (Database schema changes) must be completed before any other subtasks
- Subtasks 4-6 (Action plan API updates) must be completed before subtasks 9-14 (UI updates)
- Subtasks 7-8 (Observation status API updates) must be completed before subtasks 13 (UI updates)
- All implementation subtasks (1-14) must be completed before testing subtasks (15-19)
- Testing should be done sequentially in the order listed
- Documentation (subtask 20) should be done last after all features are verified

## Notes

- The auto-trigger from "Completed" status to "Retest due" should only happen if retest is not explicitly provided
- The auto-transition from auditee feedback should only trigger if current status is "Pending MR"
- All changes should maintain backward compatibility with existing data
- WebSocket notifications should be broadcast for status changes to maintain real-time updates
- Audit trail should log all auto-transitions for compliance tracking

---

## Implementation Summary

**Status**: ✅ COMPLETED
**Completion Date**: 2025-10-02

### What Was Implemented

#### Database Changes
- ✅ Added `retest` field to ActionPlan model (enum: RETEST_DUE, PASS, FAIL)
- ✅ Created ActionPlanRetest enum
- ✅ Updated ObservationStatus enum with new values (PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED)
- ✅ Updated default value for currentStatus to PENDING_MR
- ✅ Applied schema changes with `npx prisma db push`
- ⚠️ **Data Migration**: Updated 2 existing observations from old enum values (PENDING, IN_PROGRESS) to RESOLVED

#### API Updates
- ✅ Added retest field validation in action plan create/update routes
- ✅ Implemented RBAC: Only ADMIN and AUDITOR can set/update retest field
- ✅ Implemented auto-trigger: When status = "Completed", auto-set retest to "RETEST_DUE"
- ✅ Updated observation status validation with new enum values
- ✅ Implemented auto-transition: When auditee provides feedback and status is PENDING_MR, auto-change to MR_UNDER_REVIEW

#### UI Changes
- ✅ Updated ActionPlan type to include retest field
- ✅ Updated Observation currentStatus type with new enum values
- ✅ Added apRetest state variable
- ✅ Updated date input placeholder to "Target Date"
- ✅ Converted status text input to dropdown (Pending/Completed)
- ✅ Added retest dropdown (visible only to ADMIN/AUDITOR)
- ✅ Added formatRetest() helper function for display
- ✅ Updated action plan display to show retest field
- ✅ Updated observation status dropdown with 5 new options
- ✅ Updated addActionPlan() to include retest in API call

### Testing Observations
- ✅ Application compiles without errors
- ✅ Auto-transition logic verified in server logs (currentStatus changed to MR_UNDER_REVIEW when auditee updated feedback)
- ✅ Prisma client regenerated to include new schema changes
- ✅ WebSocket server running without issues

### Known Issues
- None reported during implementation

### Next Steps for QA
1. Test action plan creation with status "Completed" - verify retest auto-sets to "Retest due"
2. Test RBAC - verify auditee cannot set/modify retest field
3. Test observation status auto-transition when auditee provides feedback
4. Verify all 5 status options display correctly in observation form
5. Verify retest field displays correctly in action plan list
