# TASK 6: Download Capabilities

## Analysis

After examining the codebase, I've identified the following key patterns and architecture:

### Existing CSV Export Pattern
The observations page (`/src/app/(dashboard)/observations/page.tsx`) already has a working CSV export feature that:
- Uses the same filter state to build query parameters
- Calls an export API endpoint (`/api/v1/observations/export`)
- Triggers a browser download via `window.location.href`
- Shows a toast notification on export

The export API route (`/src/app/api/v1/observations/export/route.ts`) demonstrates:
- Filter parameter extraction and validation
- RBAC and scope-based access control
- Date range filtering with audit period overlap logic
- CSV generation with proper escaping
- CSV response headers for download

### Reports Page Structure
The reports page (`/src/app/(dashboard)/reports/page.tsx`) has:
- Similar filter controls (plant, audit, date range, risk, process, status, published)
- Filter state management with localStorage persistence
- Two API endpoints: `/api/v1/reports/overview` and `/api/v1/reports/targets`

### Data Model
- **Observation**: Main entity with all observation fields
- **ActionPlan**: Related to observations with `plan`, `owner`, `targetDate`, `status`, and `retest` fields
- **ActionPlanRetest**: Enum with values RETEST_DUE, PASS, FAIL
- Observations have a `currentStatus` field (PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED)

### Requirements
**D1: Period Report** - Export all observations filtered by the current date range and other filters
**D2: Retest Report** - Export action plans with retest status information

## Subtasks

### 1. Create Period Report Export API Route
**Action**: Create `/src/app/api/v1/reports/period/export/route.ts` to export filtered observations
**Context**: This endpoint will mirror the observations export but be specifically for the reports page, allowing users to download a CSV of observations matching their report filters
**Acceptance**:
- API route responds with CSV data containing all observation fields
- Accepts all filter parameters (plantId, auditId, startDate, endDate, risk, process, status, published)
- Implements RBAC and scope-based filtering (same as observations export)
- Returns CSV with proper headers for download (Content-Type and Content-Disposition)
- CSV includes columns: ID, PlantCode, PlantName, AuditId, AuditTitle, AuditStartDate, AuditEndDate, Risk, Process, Status, Approval, Published, TargetDate, Owner, Observation, Risks, AuditeeFeedback, AuditorResponse
**Files**: `/src/app/api/v1/reports/period/export/route.ts` (new)

### 2. Create Retest Report Export API Route
**Action**: Create `/src/app/api/v1/reports/retest/export/route.ts` to export action plans with retest data
**Context**: This endpoint will export action plans that have retest status (RETEST_DUE, PASS, FAIL), providing visibility into testing progress
**Acceptance**:
- API route responds with CSV data containing action plan and observation details
- Accepts all filter parameters (same as period report)
- Implements RBAC and scope-based filtering at observation level
- Filters for action plans with non-null retest field
- Returns CSV with proper headers for download
- CSV includes columns: ObservationID, ObservationTitle, PlantCode, PlantName, AuditTitle, ActionPlan, Owner, TargetDate, RetestStatus, ObservationStatus
- Joins with Observation and Plant tables to get full context
**Files**: `/src/app/api/v1/reports/retest/export/route.ts` (new)

### 3. Add Period Report Download Button to Reports Page
**Action**: Add "Download Period Report" button to the filter controls section in `/src/app/(dashboard)/reports/page.tsx`
**Context**: Users need a UI control to trigger the period report export using their current filter selections
**Acceptance**:
- Button appears in the filter controls section alongside "Save preset", "Load preset", and "Reset" buttons
- Clicking the button constructs query string from current filter state (plantId, auditId, startDate, endDate, risk, process, status, published)
- Triggers download by setting `window.location.href` to `/api/v1/reports/period/export?{queryString}`
- Shows success toast notification when export is triggered
- Button has consistent styling with existing filter control buttons
**Files**: `/src/app/(dashboard)/reports/page.tsx`

### 4. Add Retest Report Download Button to Reports Page
**Action**: Add "Download Retest Report" button to the filter controls section in `/src/app/(dashboard)/reports/page.tsx`
**Context**: Users need a separate UI control to download retest-specific data
**Acceptance**:
- Button appears in the filter controls section next to the Period Report button
- Clicking the button constructs query string from current filter state
- Triggers download by setting `window.location.href` to `/api/v1/reports/retest/export?{queryString}`
- Shows success toast notification when export is triggered
- Button has consistent styling with existing filter control buttons
**Files**: `/src/app/(dashboard)/reports/page.tsx`

### 5. Test Period Report Export with Various Filters
**Action**: Manually test the period report export functionality with different filter combinations
**Context**: Ensure the export works correctly across different scenarios and respects RBAC/scope restrictions
**Acceptance**:
- Export works with no filters applied (downloads all accessible observations)
- Export works with single filters (plantId, auditId, date range, risk, process, status, published)
- Export works with combined filters
- Export respects RBAC (ADMIN/AUDITOR see all, AUDITEE/GUEST see only scoped + published)
- CSV file downloads with correct filename
- CSV data is properly formatted with correct escaping
- All observation fields are present in the output
- Date range filtering works correctly (audit period overlap logic)
**Files**: Manual testing of reports page and API endpoint

### 6. Test Retest Report Export with Various Filters
**Action**: Manually test the retest report export functionality with different filter combinations
**Context**: Ensure the retest export correctly filters action plans and joins with observation data
**Acceptance**:
- Export includes only action plans with retest status (RETEST_DUE, PASS, or FAIL)
- Export works with various filter combinations
- Export respects RBAC at the observation level
- CSV file downloads with correct filename
- CSV shows correct retest status values (RETEST_DUE, PASS, FAIL)
- All required fields are present: ObservationID, ObservationTitle, PlantCode, PlantName, AuditTitle, ActionPlan, Owner, TargetDate, RetestStatus, ObservationStatus
- Proper joining of ActionPlan, Observation, Plant, and Audit tables
**Files**: Manual testing of reports page and API endpoint

## Dependencies

- Subtask 1 must be completed before Subtask 3
- Subtask 2 must be completed before Subtask 4
- Subtasks 1 and 2 can be developed in parallel
- Subtasks 3 and 4 can be developed in parallel (after 1 and 2)
- Subtasks 5 and 6 are testing tasks that must happen after UI buttons are implemented

## Implementation Notes

### CSV Escape Function
Both export routes should use the same CSV escaping logic:
```typescript
function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
```

### RBAC Pattern
Both routes should implement the same RBAC logic used in observations export:
- Admin/Auditor: see all observations (optionally filtered by published flag)
- Auditee/Guest: see only scoped observations OR approved+published observations

### Date Range Filter
Use the same audit period overlap logic from observations export:
- If both startDate and endDate: audit period overlaps with filter range
- If only startDate: audit starts on or after the date
- If only endDate: audit ends on or before the date

### Query Parameter Construction
Reuse the pattern from observations page:
```typescript
function exportPeriodReport() {
  const qs = new URLSearchParams();
  if (plantId) qs.set("plantId", plantId);
  if (auditId) qs.set("auditId", auditId);
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  if (risk) qs.set("risk", risk);
  if (process) qs.set("process", process);
  if (status) qs.set("status", status);
  if (published) qs.set("published", published);
  window.location.href = `/api/v1/reports/period/export?${qs.toString()}`;
  showSuccess("Period report export started! Download will begin shortly.");
}
```

### UI Layout
Add download buttons in the existing filter controls section:
```typescript
<div className="flex gap-2">
  <button className="border px-3 py-1 rounded" onClick={savePreset}>Save preset</button>
  <button className="border px-3 py-1 rounded" onClick={loadPresetManual}>Load preset</button>
  <button className="border px-3 py-1 rounded" onClick={resetFilters}>Reset</button>
  <button className="border px-3 py-1 rounded" onClick={exportPeriodReport}>Download Period Report</button>
  <button className="border px-3 py-1 rounded" onClick={exportRetestReport}>Download Retest Report</button>
</div>
```
