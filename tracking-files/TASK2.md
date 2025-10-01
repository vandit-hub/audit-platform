# TASK 2: Observation Fields & Layout

## Analysis

After analyzing the codebase, the observation form and data flow is structured as follows:

**Current Architecture:**
- Main observation detail page: `src/app/(dashboard)/observations/[id]/page.tsx`
- API endpoint for PATCH updates: `src/app/api/v1/observations/[id]/route.ts`
- Field locking API: `src/app/api/v1/observations/[id]/locks/route.ts`
- Database schema: `prisma/schema.prisma` (Observation model)
- Export functionality: `src/app/api/v1/observations/export/route.ts`
- Reports: `src/app/api/v1/reports/targets/route.ts`

**Current Field Organization:**
- Auditor fields: observationText, risksInvolved, riskCategory, likelyImpact, concernedProcess, auditorPerson
- Auditee fields: auditeePersonTier1, auditeePersonTier2, auditeeFeedback, hodActionPlan, targetDate, personResponsibleToImplement, currentStatus
- All fields currently displayed in a single 2-column grid without section grouping
- Lock functionality exists for individual fields (lines 680-724 in page.tsx)
- HOD Action Plan field exists separately from the ActionPlan model/section

**Approach:**
The task requires UI reorganization, field additions/removals, and database schema changes. We'll need to:
1. Add a new field to the database schema
2. Update the UI to reorganize sections
3. Remove deprecated fields and functionality
4. Update API routes to handle the new field structure
5. Update export/report functionality

## Subtasks

### 1. Add "Auditor Response to Auditee Remarks" Field to Database Schema
**Action**: Create a database migration to add `auditorResponseToAuditee` field to the Observation model
**Context**: This field needs to be added to capture auditor's response to auditee remarks, logically grouped with auditee-related fields
**Acceptance**:
- Field `auditorResponseToAuditee` added as optional String to Observation model
- Migration created and applied successfully
**Files**:
- `prisma/schema.prisma` (line 161-197, Observation model)
**Implementation**:
- Add field after `auditeeFeedback` field
- Type: `String?` (nullable text field)
- Run `npx prisma migrate dev --name add_auditor_response_to_auditee`

### 2. Remove HOD Action Plan Field from Database Schema
**Action**: Create a database migration to remove the `hodActionPlan` field from the Observation model
**Context**: This field is redundant with the ActionPlan model/section which provides more structured action plan management
**Acceptance**:
- Field `hodActionPlan` removed from Observation model
- Migration applied successfully
**Files**:
- `prisma/schema.prisma` (line 177)
**Implementation**:
- Remove `hodActionPlan String?` from schema
- Run `npx prisma migrate dev --name remove_hod_action_plan`

### 3. Update API Route Schema for Observation Updates
**Action**: Update the Zod validation schema and field sets in the observation PATCH endpoint
**Context**: Need to add the new field to validation and remove the deprecated field, plus update AUDITEE_FIELDS set
**Acceptance**:
- `auditorResponseToAuditee` added to updateSchema with proper validation
- `hodActionPlan` removed from updateSchema
- AUDITEE_FIELDS or AUDITOR_FIELDS updated appropriately
- Field permissions properly configured
**Files**:
- `src/app/api/v1/observations/[id]/route.ts` (lines 10-46)
**Implementation**:
- Add `auditorResponseToAuditee: z.string().nullable().optional()` to updateSchema
- Remove `hodActionPlan` from schema
- Add `auditorResponseToAuditee` to AUDITOR_FIELDS set (auditor-editable field)

### 4. Update Observation Creation Schema
**Action**: Update the creation schema if auditee person fields should be movable during creation
**Context**: Ensure consistency between create and update operations
**Acceptance**:
- Creation schema handles new field structure appropriately
- Remove hodActionPlan if present in creation
**Files**:
- `src/app/api/v1/observations/route.ts` (lines 10-20)
**Implementation**:
- Verify and update createSchema if needed
- Remove hodActionPlan references if present

### 5. Reorganize Observation Form UI into Sections
**Action**: Restructure the form in the detail page to organize fields into logical sections
**Context**: Current form has all fields in a flat 2-column grid. Need to create distinct sections for better UX
**Acceptance**:
- Form divided into clear sections: "Observation Details", "Auditee Section", "Implementation Details"
- Auditee Person fields (Tier 1 & 2) moved to Auditee Section
- New "Auditor Response to Auditee Remarks" field added in Auditee Section
- HOD Action Plan field removed from form
- Each section visually distinct (using headings, borders, or spacing)
**Files**:
- `src/app/(dashboard)/observations/[id]/page.tsx` (lines 422-653)
**Proposed Structure**:
```
Section 1: Observation Details
  - Observation Text, Risks Involved, Risk Category, Likely Impact, Concerned Process, Auditor Person

Section 2: Auditee Section
  - Auditee Person (Tier 1), Auditee Person (Tier 2), Auditee Feedback, Auditor Response to Auditee Remarks

Section 3: Implementation Details
  - Target Date, Person Responsible, Current Status
```

### 6. Update Draft State Management
**Action**: Update the local draft state initialization and field setters to include new field and remove old field
**Context**: The component maintains local draft state that needs to sync with the new schema
**Acceptance**:
- Draft state includes `auditorResponseToAuditee`
- Draft state does not include `hodActionPlan`
- Initial load properly populates the new field
**Files**:
- `src/app/(dashboard)/observations/[id]/page.tsx` (lines 65, 87-101)
**Implementation**:
- Add `auditorResponseToAuditee: j.observation.auditorResponseToAuditee ?? ""` in load function
- Remove `hodActionPlan` from draft initialization

### 7. Update TypeScript Types in Detail Page
**Action**: Update the Observation type definition to reflect schema changes
**Context**: TypeScript type safety needs to match the new database schema
**Acceptance**:
- Type includes `auditorResponseToAuditee?: string | null`
- Type does not include `hodActionPlan`
**Files**:
- `src/app/(dashboard)/observations/[id]/page.tsx` (lines 15-41)

### 8. Update Field Labels Helper Function
**Action**: Update getFieldLabel function to include new field and remove old field
**Context**: This function provides human-readable labels for fields in lock UI and other places
**Acceptance**:
- Label added for `auditorResponseToAuditee`
- Label removed for `hodActionPlan`
**Files**:
- `src/app/(dashboard)/observations/[id]/page.tsx` (lines 281-298)

### 9. Remove Lock Sample Fields and Lock Text Field Buttons
**Action**: Remove the two lock utility buttons from the admin section
**Context**: These are pre-configured lock shortcuts that are no longer needed
**Acceptance**:
- "Lock Sample Fields" button removed
- "Lock Text Field" button removed
- Individual field unlock functionality (the "x" buttons) remains intact
- "Unlock All" button remains intact
**Files**:
- `src/app/(dashboard)/observations/[id]/page.tsx` (lines 714-723)

### 10. Add Observation Creation Timestamp Display
**Action**: Display the observation's createdAt timestamp in the UI header area
**Context**: Users need to see when an observation was originally created
**Acceptance**:
- Creation timestamp displayed near the observation header
- Formatted in user-friendly format (e.g., "Created: Jan 15, 2025 at 3:45 PM")
- Positioned logically (e.g., below or next to the observation title)
**Files**:
- `src/app/(dashboard)/observations/[id]/page.tsx` (around lines 405-419)
**Implementation**:
- Use `o.createdAt` which is already loaded from the API
- Format using `new Date(o.createdAt).toLocaleString()` or similar
- Add near the title/header section

### 11. Add Close/Back Option for Observation Tab
**Action**: Enhance the existing back button or add a close button functionality
**Context**: Current back button exists (line 407) but may need enhancement for better UX
**Acceptance**:
- Back button remains functional
- Consider adding keyboard shortcut (ESC key) for closing
- Optionally add a close "X" button in the header
- Ensure proper navigation back to observations list
**Files**:
- `src/app/(dashboard)/observations/[id]/page.tsx` (line 407)
**Implementation**:
- Current implementation uses `router.back()` which is adequate
- Optional: Add useEffect with keyboard listener for ESC key
- Optional: Add styled close button in header with same `router.back()` functionality

### 12. Update CSV Export Functionality
**Action**: Update the export route to include new field and remove old field from CSV output
**Context**: The export generates CSV with observation data
**Acceptance**:
- CSV includes `auditorResponseToAuditee` column
- CSV does not include `hodActionPlan` column
- Header row updated accordingly
**Files**:
- `src/app/api/v1/observations/export/route.ts` (lines 65-86)

### 13. Update Reports API if Applicable
**Action**: Review and update reports that reference hodActionPlan
**Context**: The targets report references hodActionPlan which needs to be updated
**Acceptance**:
- Reports no longer reference hodActionPlan
- Reports use ActionPlan model data instead if needed
**Files**:
- `src/app/api/v1/reports/targets/route.ts` (lines 59-75)
**Implementation**:
- Replace hodActionPlan reference with ActionPlan query if needed
- Update response mapping

### 14. Update Observation Search Functionality
**Action**: Update search queries to replace hodActionPlan with new field
**Context**: The observation list search includes hodActionPlan in OR clause
**Acceptance**:
- Search includes `auditorResponseToAuditee` field
- Search does not include `hodActionPlan` field
**Files**:
- `src/app/api/v1/observations/route.ts` (lines 40-48)
- `src/app/api/v1/observations/export/route.ts` (lines 32-40)

### 15. Test Database Migrations
**Action**: Run migrations in development environment and verify functionality
**Context**: Ensure migrations work correctly
**Acceptance**:
- Migrations run without errors
- New field is queryable
- Old field is removed cleanly
**Implementation**:
- Run `npx prisma migrate dev`
- Run `npx prisma studio` to verify schema changes
- Test creating and updating observations with new structure

### 16. Update WebSocket Field Lock Broadcast
**Action**: Ensure WebSocket lock notifications handle the new field correctly
**Context**: Field locking uses WebSocket to notify other users
**Acceptance**:
- Locking `auditorResponseToAuditee` broadcasts correctly
- No references to `hodActionPlan` in lock functionality
**Files**:
- `src/app/api/v1/observations/[id]/locks/route.ts` (verify, likely no changes needed)

## Dependencies

**Must Complete First:**
1. Subtasks 1 & 2 (database migrations) must be completed before any other tasks
2. Subtask 15 (test migrations) should be done after 1 & 2

**Sequential Groups:**
- Group A (Database): 1 → 2 → 15
- Group B (API Layer): 3 → 4 (depends on Group A completion)
- Group C (UI Layer): 5 → 6 → 7 → 8 → 9 → 10 → 11 (depends on Group A & B)
- Group D (Export/Reports): 12 → 13 → 14 (depends on Group A)
- Group E (Testing): 16 (depends on all above)

**Recommended Order:**
1. Complete database changes and test (1, 2, 15)
2. Update API layer (3, 4)
3. Update UI (5, 6, 7, 8, 9, 10, 11)
4. Update export and reports (12, 13, 14)
5. Final testing (16)

## Notes

- **Field Permissions**: The new `auditorResponseToAuditee` field is in AUDITOR_FIELDS (editable by auditors/admins) since it represents the auditor's response.
- **Lock Functionality**: Individual field locking is preserved; only the convenience buttons are removed.
- **WebSocket**: The existing WebSocket infrastructure should handle the changes automatically since it broadcasts field-level updates generically.
