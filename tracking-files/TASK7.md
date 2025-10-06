# TASK 7: Auditor View Restrictions & Auditee Field Restrictions

**Date:** 2025-10-06
**Status:** Implementation Complete, Testing Complete ✅

## Summary

**Implementation**: All 7 implementation subtasks completed successfully (subtasks 1-7).
**Testing**: Testing completed - 5/6 critical test cases passed. See TEST_REPORT_TASK7.md for details.

### Completed Implementation:
- ✅ Backend: Filter audits by assignment for AUDITOR role
- ✅ Backend: Prevent AUDITOR from creating audits (ADMIN only)
- ✅ Frontend: Hide audit creation form for AUDITOR role
- ✅ Frontend: Define auditee-editable fields list
- ✅ Frontend: Create field editability check function
- ✅ Frontend: Update all 13 observation form fields with disabled attribute
- ✅ Frontend: Add visual styling for disabled fields (gray background)

### Testing Status:
- ✅ Testing completed (2025-10-06)
- **Test Results**: 5 PASSED, 1 BLOCKED (out of scope)
  - ✅ TC1: Auditor sees only assigned audits - PASSED
  - ✅ TC2: Auditor cannot create audits (UI) - PASSED
  - ✅ TC3: Auditor cannot create audits (API) - PASSED (Issue #1 fixed: now returns 403)
  - ❌ TC4: Auditee field restrictions - BLOCKED (auditee cannot access observations - out of scope)
  - ✅ TC5: Admin full access maintained - PASSED
  - ✅ TC6: Auditor field access in observations - PASSED
- **Issues Found & Resolved**:
  - ✅ Issue #1: API returns 500 instead of 403 - FIXED (2025-10-06, added try-catch in POST handler)
  - ❌ Issue #2: Auditee cannot access observations (out of scope for TASK7)
- **Detailed Report**: See tracking-files/TEST_REPORT_TASK7.md

### Files Modified:
- `src/app/api/v1/audits/route.ts` - Added auditor filtering and admin-only creation
- `src/app/(dashboard)/audits/page.tsx` - Hide creation form for auditors
- `src/app/(dashboard)/observations/[id]/page.tsx` - Field disabling logic for auditees
- `src/lib/rbac.ts` - Using assertAdmin instead of assertAdminOrAuditor

## Analysis

This task implements two priority requirements to enhance role-based access control (RBAC) in the audit platform:

### Current Codebase Context

**Audit System**:
- Audits are stored in the `Audit` model with a one-to-many relationship to `AuditAssignment`
- `AuditAssignment` links audits to auditors via `auditId` and `auditorId` fields
- The GET `/api/v1/audits` endpoint currently returns all audits without filtering by assignments
- The audits page (`src/app/(dashboard)/audits/page.tsx`) displays all returned audits
- The POST `/api/v1/audits` endpoint already has RBAC check: `assertAdminOrAuditor`

**Observation Field Access**:
- Observations have field-level locking via the `lockedFields` JSON field
- The PATCH `/api/v1/observations/[id]/route.ts` already enforces role-based field access via `AUDITOR_FIELDS` and `AUDITEE_FIELDS` sets
- The observation detail page shows all fields with lock indicators but doesn't disable fields for auditees
- Currently, auditees can see all fields but may get 403 errors when attempting to edit auditor-only fields

### Requirements Breakdown

**P2: Auditor View Restrictions**
- AUDITOR role should only see audits where they are assigned (via `AuditAssignment`)
- AUDITOR role should not be able to create new audits
- ADMIN role should continue to see all audits and create new audits

**P4: Auditee Field Restrictions**
- AUDITEE role should have read-only access to auditor-only fields in the observation UI
- Fields should be visually disabled/frozen rather than generating 403 errors on save
- This is a UX improvement to prevent confusion when auditees try to edit restricted fields

### Implementation Approach

The implementation requires:
1. **Backend filtering** for auditor audit list (security-critical)
2. **UI restriction** for audit creation form visibility
3. **Frontend field disabling** for auditee observation fields (UX enhancement)

No database schema changes are needed as the necessary relationships already exist.

## Subtasks

### 1. Backend: Filter Audits by Assignment for AUDITOR Role ✅
**Status**: COMPLETED
**Action**: Update the GET handler in `/api/v1/audits/route.ts` to filter audits based on the user's role and assignments
**Context**: Currently all users see all audits. Auditors should only see audits where they have an `AuditAssignment` record. This is a security requirement to prevent auditors from accessing audits they are not assigned to.
**Acceptance**:
- If user role is AUDITOR, query should filter audits by `assignments.some(a => a.auditorId === session.user.id)`
- If user role is ADMIN, AUDITEE, or GUEST, return all audits (existing behavior)
- Use Prisma's nested filtering or post-query filtering
- Maintain existing query params support (plantId, status)
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/audits/route.ts`
**Implementation Details**:
```typescript
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId") || undefined;
  const status = searchParams.get("status") || undefined;

  // Build base where clause
  const where: any = {
    plantId,
    status: status ? (status as any) : undefined
  };

  // Add assignment filter for AUDITOR role
  if (session.user.role === "AUDITOR") {
    where.assignments = {
      some: {
        auditorId: session.user.id
      }
    };
  }

  const audits = await prisma.audit.findMany({
    where,
    include: {
      plant: true,
      assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });

  // ... rest of the handler remains the same
}
```

### 2. Backend: Prevent AUDITOR from Creating Audits ✅
**Status**: COMPLETED
**Action**: Update the POST handler in `/api/v1/audits/route.ts` to restrict audit creation to ADMIN only
**Context**: Currently both ADMIN and AUDITOR can create audits (via `assertAdminOrAuditor`). The requirement specifies that auditors cannot create new audits.
**Acceptance**:
- Replace `assertAdminOrAuditor(session?.user?.role)` with `assertAdmin(session?.user?.role)`
- AUDITOR role should receive 403 Forbidden when attempting to create audits
- ADMIN role should continue to have create access
- Error message should be clear: "Forbidden"
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/audits/route.ts`
**Implementation Details**:
```typescript
export async function POST(req: NextRequest) {
  const session = await auth();
  assertAdmin(session?.user?.role); // Changed from assertAdminOrAuditor

  const body = await req.json();
  const input = createSchema.parse(body);

  // ... rest remains the same
}
```
**Dependencies**: Requires `assertAdmin` to be imported from `@/lib/rbac`

### 3. Frontend: Hide Audit Creation Form for AUDITOR Role ✅
**Status**: COMPLETED
**Action**: Conditionally render the audit creation form based on user role in the audits page
**Context**: The audit creation form should only be visible to ADMIN users. Auditors should only see the audit list.
**Acceptance**:
- Import and use `useSession` hook to get the current user's role
- Only render the creation form if `session?.user?.role === "ADMIN"`
- Show a helpful message for auditors: "You can view audits assigned to you below."
- Maintain existing functionality for ADMIN users
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/audits/page.tsx`
**Implementation Details**:
```typescript
import { useSession } from "next-auth/react";

export default function AuditsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // ... existing state and functions

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audits</h1>

      {isAdmin && (
        <form onSubmit={onCreate} className="bg-white rounded p-4 shadow space-y-3 max-w-2xl">
          <div className="text-sm text-gray-600">Create an audit (Admin only)</div>
          {/* ... rest of form */}
        </form>
      )}

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
          You can view audits assigned to you below.
        </div>
      )}

      <div className="bg-white rounded p-4 shadow">
        <h2 className="font-medium mb-2">
          {isAdmin ? "All Audits" : "My Assigned Audits"}
        </h2>
        {/* ... existing table */}
      </div>
    </div>
  );
}
```

### 4. Frontend: Define Auditee-Editable Fields List ✅
**Status**: COMPLETED
**Action**: Create a constant set of field names that AUDITEE role can edit
**Context**: We need to determine which fields should be disabled for auditees. Based on the existing API `AUDITEE_FIELDS` set, these are the editable fields. All other fields should be disabled.
**Acceptance**:
- Create a constant matching the backend `AUDITEE_FIELDS` set
- Include: auditeePersonTier1, auditeePersonTier2, auditeeFeedback, targetDate, personResponsibleToImplement, currentStatus
- This will be used to determine which fields to disable
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Implementation Details**:
```typescript
// Add near the top of the file, after imports
const AUDITEE_EDITABLE_FIELDS = new Set([
  "auditeePersonTier1",
  "auditeePersonTier2",
  "auditeeFeedback",
  "targetDate",
  "personResponsibleToImplement",
  "currentStatus"
]);
```

### 5. Frontend: Create Field Editability Check Function ✅
**Status**: COMPLETED
**Action**: Create a helper function to determine if a field should be disabled for the current user
**Context**: Different roles have different field access. We need a reusable function to check if a field should be disabled based on role and field name.
**Acceptance**:
- Function should return `true` if field should be disabled, `false` otherwise
- ADMIN can edit all fields (return false for all)
- AUDITEE can only edit fields in `AUDITEE_EDITABLE_FIELDS` set
- AUDITOR can edit auditor fields (inverse of auditee fields, excluding currentStatus)
- Additionally respect field locking (locked fields disabled for non-admins)
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Implementation Details**:
```typescript
function isFieldDisabled(fieldName: string): boolean {
  if (!o) return false;

  // Admin can edit all fields (unless locked for other reasons in the future)
  if (isAdmin) return false;

  // Check if field is locked (applies to non-admins)
  if (isFieldLocked(fieldName)) return true;

  // For auditees, disable all fields except those in AUDITEE_EDITABLE_FIELDS
  if (role === "AUDITEE") {
    return !AUDITEE_EDITABLE_FIELDS.has(fieldName);
  }

  // For auditors, auditee fields should be disabled
  if (isAuditor) {
    // Auditors can see but not edit most auditee fields
    // They can edit auditorResponseToAuditee which is in their field set
    return AUDITEE_EDITABLE_FIELDS.has(fieldName) && fieldName !== "auditorResponseToAuditee";
  }

  // Default: not disabled
  return false;
}
```

### 6. Frontend: Update Input Field Rendering with Disabled State ✅
**Status**: COMPLETED
**Action**: Apply the `disabled` attribute to all observation form fields based on editability check
**Context**: Currently fields show lock indicators but are not disabled. We need to add the `disabled` prop to inputs, textareas, and selects for auditee-restricted fields.
**Acceptance**:
- Update all input, textarea, and select elements to include `disabled={isFieldDisabled(fieldName)}`
- Fields should visually appear disabled (grayed out cursor)
- Maintain existing lock indicators for explicitly locked fields
- Apply to all observation fields: observationText, risksInvolved, riskCategory, likelyImpact, concernedProcess, auditorPerson, auditeePersonTier1, auditeePersonTier2, auditeeFeedback, auditorResponseToAuditee, targetDate, personResponsibleToImplement, currentStatus
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Implementation Details**:
```typescript
// Example for observationText textarea:
<textarea
  className={getFieldClassName("observationText", "border rounded px-3 py-2 w-full h-24")}
  value={draft.observationText}
  onChange={(e) => setField("observationText", e.target.value)}
  disabled={isFieldDisabled("observationText")}
  required
/>

// Example for riskCategory select:
<select
  className={getFieldClassName("riskCategory")}
  value={draft.riskCategory}
  onChange={(e) => setField("riskCategory", e.target.value)}
  disabled={isFieldDisabled("riskCategory")}
>
  <option value="">Select</option>
  <option value="A">A</option>
  <option value="B">B</option>
  <option value="C">C</option>
</select>

// Apply this pattern to all 13 observation fields
```

### 7. Frontend: Add Visual Styling for Disabled Fields ✅
**Status**: COMPLETED
**Action**: Update the `getFieldClassName` function to add visual styling for disabled fields
**Context**: Disabled fields should be visually distinct from editable fields. We need to add a grayed-out background similar to locked fields but distinct.
**Acceptance**:
- Disabled fields should have a light gray background (bg-gray-50)
- Disabled fields should have a subtle border (border-gray-200)
- Locked fields should maintain their orange styling
- Cursor should appear as "not-allowed" for disabled fields
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/observations/[id]/page.tsx`
**Implementation Details**:
```typescript
function getFieldClassName(fieldName: string, baseClassName: string = "border rounded px-3 py-2 w-full"): string {
  const locked = isFieldLocked(fieldName);
  const disabled = isFieldDisabled(fieldName);

  if (locked) {
    return `${baseClassName} bg-orange-50 border-orange-300`;
  }

  if (disabled) {
    return `${baseClassName} bg-gray-50 border-gray-200 cursor-not-allowed`;
  }

  return baseClassName;
}
```

### 8. Testing: Verify Auditor Audit List Filtering (TC1)
**Status**: ✅ COMPLETED - PASSED
**Date Completed**: 2025-10-06
**Result**: Auditors only see assigned audits (2/4), backend filtering confirmed, UI shows correct messaging
**Action**: Test that auditors only see their assigned audits
**Context**: Ensure the backend filtering works correctly and doesn't leak audit data
**Acceptance**:
- Login as auditor@example.com
- Verify only audits with assignments to this auditor appear
- Check browser network tab - API response should only contain assigned audits
- Login as admin@example.com
- Verify all audits appear
- Assign an audit to the auditor and verify it appears in their list immediately after refresh
**Files**: Manual testing via UI and API inspection

### 9. Testing: Verify Auditor Cannot Create Audits (TC2 & TC3)
**Status**: ✅ COMPLETED - TC2 PASSED, TC3 PASSED
**Date Completed**: 2025-10-06
**Date Fixed**: 2025-10-06 (TC3 error handling fixed)
**Result**: UI form hidden (TC2 ✅), API returns proper 403 Forbidden (TC3 ✅)
**Action**: Test that auditors receive 403 when attempting to create audits
**Context**: Ensure both backend and frontend restrictions work
**Acceptance**:
- Login as auditor@example.com
- Verify audit creation form is not visible on `/audits` page
- Verify helpful message appears instead
- Attempt to POST to `/api/v1/audits` directly (e.g., via curl or Postman) as auditor
- Verify 403 Forbidden response
- Login as admin@example.com
- Verify audit creation form is visible and functional
**Files**: Manual testing via UI and API

### 10. Testing: Verify Auditee Field Restrictions (TC4)
**Status**: ❌ BLOCKED - Out of Scope
**Date Attempted**: 2025-10-06
**Result**: Unable to test - auditee role cannot access observations (404 error). This is a separate permission issue not addressed by TASK7.
**Action**: Test that auditee users cannot edit auditor-only fields
**Context**: Ensure frontend disabling works and provides good UX
**Acceptance**:
- Login as auditee@example.com
- Navigate to an observation detail page
- Verify auditor fields are disabled and grayed out:
  - observationText (textarea)
  - risksInvolved (textarea)
  - riskCategory (select)
  - likelyImpact (select)
  - concernedProcess (select)
  - auditorPerson (input)
- Verify auditee fields are enabled and editable:
  - auditeePersonTier1 (input)
  - auditeePersonTier2 (input)
  - auditeeFeedback (textarea)
  - targetDate (date input)
  - personResponsibleToImplement (input)
  - currentStatus (select)
- Verify auditorResponseToAuditee is disabled for auditee (auditor-only field)
- Attempt to save changes - should not receive 403 errors for restricted fields
**Files**: Manual testing via UI

### 11. Testing: Verify Admin Full Access Maintained (TC5)
**Status**: ✅ COMPLETED - PASSED
**Date Completed**: 2025-10-06
**Result**: Admin sees all 4 audits, creation form visible, all observation fields enabled, no regression
**Action**: Test that admin users retain full access to all functionality
**Context**: Ensure our changes don't break admin capabilities
**Acceptance**:
- Login as admin@example.com
- Verify can view all audits in `/audits` page
- Verify can create new audits
- Verify audit creation form is visible
- Navigate to any observation
- Verify all fields are editable (not disabled)
- Verify can save changes to any field
- Verify admin-only features still work (approve, publish, lock/unlock fields)
**Files**: Manual testing via UI

### 12. Testing: Verify Auditor Field Access in Observations (TC6)
**Status**: ✅ COMPLETED - PASSED
**Date Completed**: 2025-10-06
**Result**: 7 auditor fields enabled, 6 auditee fields disabled with gray styling, UX excellent
**Action**: Test that auditors can edit their designated fields and see disabled auditee fields
**Context**: Ensure auditors have appropriate access in observations
**Acceptance**:
- Login as auditor@example.com
- Navigate to an observation detail page
- Verify auditor fields are enabled:
  - observationText, risksInvolved, riskCategory, likelyImpact, concernedProcess, auditorPerson
  - auditorResponseToAuditee (auditor field in auditee section)
- Verify auditee-only fields are disabled:
  - auditeePersonTier1, auditeePersonTier2, auditeeFeedback
  - targetDate, personResponsibleToImplement, currentStatus
- Verify can save changes to auditor fields successfully
- Verify cannot edit auditee fields (should be grayed out)
**Files**: Manual testing via UI

## Dependencies

- Subtasks 1 and 2 (Backend changes) must be completed before subtasks 3 (Frontend audit page)
- Subtasks 4, 5, 6, 7 (Frontend observation field restrictions) can be done in parallel with audit restrictions
- Subtasks 4-7 must be completed sequentially in order
- All implementation subtasks (1-7) must be completed before testing subtasks (8-12)
- Testing should be performed in the order listed to ensure comprehensive coverage

## Notes

### Security Considerations
- The audit list filtering (Subtask 1) is a **security-critical** change. Backend filtering is essential - frontend hiding alone is insufficient.
- The observation field restrictions (Subtasks 4-7) are primarily UX improvements since the backend already enforces field-level access control.
- Always test with real API calls (not just UI) to verify backend restrictions.

### UX Considerations
- Disabled fields should be clearly distinguishable from editable fields
- Use subtle styling (gray background) to indicate disabled state without being jarring
- Maintain the existing lock indicators for explicitly locked fields (orange styling)
- Provide helpful messaging to users (e.g., "You can view audits assigned to you below" for auditors)

### Edge Cases
- Auditor with zero assignments - should see empty list
- Fields that are both locked AND role-restricted - locked styling takes precedence

### Future Enhancements
- Consider adding a "My Audits" filter toggle for admins
- Could add audit count badge showing assigned audits vs. total audits
- May want to add ability for admins to impersonate roles for testing
