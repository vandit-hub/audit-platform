# Test Case Document - TASK5: Filtering & Sorting

**Task:** Add audit filter, audit period filter, sorting functionality to Observations page
**Test Method:** Playwright MCP Browser Automation
**Date Created:** 2025-10-03
**Status:** Ready for Execution

---

## Test Environment Setup

**Prerequisites:**
- Application running at `http://localhost:3000`
- Database seeded with users via `npm run db:seed`
- Valid admin and auditor credentials available

**Test Data Required:**
- **Users (Already Seeded):**
  - Admin User: `admin@example.com` / `admin123`
  - Auditor User: `auditor@example.com` / `auditor123`
  - Auditee User: `auditee@example.com` / `auditee123`

- **Additional Test Data (Create if Missing):**
  - At least 2 plants in the system
  - At least 4 audits with different dates and plants
  - At least 15 observations with varying:
    - Risk categories (A, B, C)
    - Current status (PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED)
    - Processes (O2C, P2P, R2R, INVENTORY)
    - Published status (true/false)
    - Created at different timestamps
  - Audits must have:
    - Different visitStartDate and visitEndDate values
    - Some overlapping date ranges
    - Different plants assigned

**IMPORTANT - Test Data Setup:**
If plants, audits, or observations are not present in the database, create them manually using Playwright MCP from the UI before running the test cases:

1. **Create Plants:** Navigate to Plants page → Create plants with codes and names
2. **Create Audits:** Navigate to Audits page → Select plants → Create audits with specific visit dates
3. **Create Observations:** Navigate to Observations page → Create observations with various properties

Use Playwright MCP to automate this test data creation through the UI workflows, not via direct database manipulation or API calls.

---

## Critical Test Cases

**Before starting:** Ensure test data exists (users are seeded, but create plants/audits/observations via UI using Playwright MCP if missing). If already logged in from the start, log out and then log in again.

---

### TC1: Verify Audit Filter

**Priority:** HIGH
**Objective:** Verify that the Audit filter dropdown correctly filters observations by selected audit

**Precondition:**
- At least 3 different audits exist
- Audit A has 5 observations
- Audit B has 3 observations
- Audit C has 2 observations

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as admin user
3. Navigate to Observations page (`/observations`)
4. Verify the Audit filter dropdown is visible
5. Click the Audit dropdown
6. Verify dropdown shows all audits with format: "PLANTCODE — DATE"
7. Select Audit A
8. Verify only Audit A's observations (5) are displayed in the table
9. Select Audit B
10. Verify only Audit B's observations (3) are displayed
11. Select "All"
12. Verify all observations (10) are displayed

**Expected Results:**
- Audit dropdown displays all audits with plant code and visit start date
- Default option is "All"
- Selecting an audit filters table to show only that audit's observations
- Observation count updates correctly
- No data from other audits is shown when filter is active
- "All" option shows all observations

**Validation Points:**
- Audit dropdown populated from audits list
- auditId parameter sent to API
- Table updates immediately on selection
- No stale data from previous selection

---

### TC2: Verify Audit Period Filter - Start Date Only

**Priority:** HIGH
**Objective:** Verify that the Audit Start Date filter correctly filters observations by audit visit dates

**Precondition:**
- Audit A: visitStartDate = 2025-09-01, visitEndDate = 2025-09-15 (3 observations)
- Audit B: visitStartDate = 2025-10-01, visitEndDate = 2025-10-15 (4 observations)
- Audit C: visitStartDate = 2025-11-01, visitEndDate = 2025-11-15 (2 observations)

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set "Audit Start Date" to 2025-10-01
4. Verify only observations from Audit B and C are shown (6 total)
5. Clear the date field
6. Verify all observations are shown again (9 total)

**Expected Results:**
- Setting start date filters observations whose audit.visitStartDate >= selected date
- Audits A is excluded (starts before 2025-10-01)
- Audits B and C are included (start on or after 2025-10-01)
- Date input has native browser date picker
- Clearing date removes the filter

**Validation Points:**
- startDate parameter sent to API
- Date range overlap logic works correctly
- Only start date logic: audit.visitStartDate >= startDate
- Filter applies immediately on date selection

---

### TC3: Verify Audit Period Filter - End Date Only

**Priority:** HIGH
**Objective:** Verify that the Audit End Date filter correctly filters observations

**Precondition:**
- Same audit data as TC2

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set "Audit End Date" to 2025-10-15
4. Verify only observations from Audit A and B are shown (7 total)
5. Clear the date field
6. Verify all observations are shown (9 total)

**Expected Results:**
- Setting end date filters observations whose audit.visitEndDate <= selected date
- Audit C is excluded (ends after 2025-10-15)
- Audits A and B are included (end on or before 2025-10-15)
- Clearing date removes the filter

**Validation Points:**
- endDate parameter sent to API
- Only end date logic: audit.visitEndDate <= endDate
- Filter applies correctly

---

### TC4: Verify Audit Period Filter - Date Range

**Priority:** HIGH
**Objective:** Verify that start and end date filters work together with overlap logic

**Precondition:**
- Audit A: 2025-09-01 to 2025-09-15
- Audit B: 2025-10-01 to 2025-10-15
- Audit C: 2025-11-01 to 2025-11-15
- Audit D: 2025-09-10 to 2025-10-05 (overlapping A and B)

**Test Data:**
```
Filter: startDate = 2025-09-01, endDate = 2025-09-30
Expected: Should show Audit A and D (audit periods overlap with filter range)

Filter: startDate = 2025-10-01, endDate = 2025-11-30
Expected: Should show Audit B, C, and D

Filter: startDate = 2025-09-15, endDate = 2025-10-05
Expected: Should show Audit A, B, and D (all overlap)
```

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set Start Date = 2025-09-01
4. Set End Date = 2025-09-30
5. Verify observations from Audit A and D appear
6. Change to Start Date = 2025-10-01, End Date = 2025-11-30
7. Verify observations from Audit B, C, and D appear
8. Test overlapping scenario

**Expected Results:**
- Date range uses overlap logic:
  - Audit visitStartDate is within filter range, OR
  - Audit visitEndDate is within filter range, OR
  - Audit period completely encompasses filter range
- All overlapping audits' observations are shown
- Non-overlapping audits are excluded

**Validation Points:**
- Both startDate and endDate sent to API
- Overlap logic implemented correctly on backend
- Edge cases handled (exact date matches)
- Complex overlaps work correctly

---

### TC5: Verify Sorting by Created Date

**Priority:** HIGH
**Objective:** Verify that sorting by Created Date works in both ascending and descending order

**Precondition:**
- At least 5 observations with different creation timestamps
- Observations created over time (not all at once)

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Verify default sort is "Created Date" with "Newest First" (desc)
4. Verify observations are displayed newest first
5. Change "Order" dropdown to "Oldest First" (asc)
6. Verify observations are now displayed oldest first
7. Note the first observation ID in each case

**Expected Results:**
- Default sort: sortBy=createdAt, sortOrder=desc (newest first)
- Newest First: Most recently created observation appears at top
- Oldest First: Oldest observation appears at top
- Table updates immediately on sort change
- Sort order is visually correct

**Validation Points:**
- sortBy and sortOrder parameters sent to API
- API returns data in correct order
- Table reflects sorted data
- Default values work correctly

---

### TC6: Verify Sorting by Risk Category

**Priority:** HIGH
**Objective:** Verify that sorting by Risk Category works correctly

**Precondition:**
- Observations with mix of risk A, B, C, and null/empty

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Select "Sort By" = "Risk Category"
4. Select "Order" = "Newest First" (desc)
5. Verify observations are sorted A → B → C (descending)
6. Change to "Oldest First" (asc)
7. Verify observations are sorted C → B → A (ascending)

**Expected Results:**
- Risk category sorting works alphabetically
- Ascending: A, B, C
- Descending: C, B, A
- Null/empty risk values handled gracefully (appear last or first)

**Validation Points:**
- sortBy=riskCategory sent to API
- Correct alphabetical ordering
- Null values don't cause errors

---

### TC7: Verify Sorting by Current Status

**Priority:** HIGH
**Objective:** Verify that sorting by Current Status works correctly

**Precondition:**
- Observations with different currentStatus values

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Select "Sort By" = "Current Status"
4. Select "Order" = "Newest First"
5. Observe the status ordering in the table
6. Change to "Oldest First"
7. Verify reverse ordering

**Expected Results:**
- Status sorting works alphabetically
- All status enum values sort correctly
- Ascending and descending both work

**Validation Points:**
- sortBy=currentStatus sent to API
- Enum values sort correctly
- No errors with different status values

---

### TC8: Verify Sorting by Approval Status and Updated Date

**Priority:** MEDIUM
**Objective:** Verify that sorting by Approval Status and Updated Date work

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Test "Sort By" = "Approval Status"
4. Verify DRAFT, SUBMITTED, APPROVED, REJECTED sort correctly
5. Test "Sort By" = "Updated Date"
6. Verify recently updated observations appear first (desc) or last (asc)

**Expected Results:**
- Approval Status: Sorts alphabetically (APPROVED, DRAFT, REJECTED, SUBMITTED)
- Updated Date: Sorts by updatedAt timestamp
- Both work in asc and desc order

**Validation Points:**
- sortBy=approvalStatus and sortBy=updatedAt work
- Correct ordering for both fields

---

### TC9: Verify Combined Filters - Audit + Date Range + Sort

**Priority:** HIGH
**Objective:** Verify that multiple filters work together correctly

**Precondition:**
- Multiple audits with observations across different dates

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set filters:
   - Audit: Select "Audit A"
   - Start Date: 2025-09-01
   - End Date: 2025-09-30
   - Risk: "A"
   - Sort By: "Created Date"
   - Order: "Oldest First"
4. Verify only Audit A observations with risk A in Sept 2025 are shown, sorted oldest first
5. Change Audit to "Audit B"
6. Verify data updates to Audit B's matching observations

**Expected Results:**
- All filters apply together (AND logic)
- Audit filter + date range + other filters work in combination
- Sorting applies to filtered results
- Changing any filter updates results immediately
- Filter intersection is correct

**Validation Points:**
- Multiple query parameters sent to API
- Backend applies all filters correctly
- No filter conflicts
- Correct data isolation

---

### TC10: Verify Filter Preset Save with New Filters

**Priority:** HIGH
**Objective:** Verify that filter presets save and load all new filters (audit, dates, sort)

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set filters:
   - Plant: Select a plant
   - Audit: Select an audit
   - Start Date: 2025-09-01
   - End Date: 2025-09-30
   - Risk: "A"
   - Process: "O2C"
   - Status: "PENDING_MR"
   - Published: "Published"
   - Sort By: "Risk Category"
   - Order: "Oldest First"
   - Search: "test"
4. Click "Save preset" button
5. Verify success message
6. Clear all filters manually (Reset button)
7. Click "Load preset" button
8. Verify all 11 filter values are restored correctly

**Expected Results:**
- "Save preset" saves all filter values including new ones:
  - auditId
  - startDate
  - endDate
  - sortBy
  - sortOrder
  - Plus existing: plantId, risk, proc, status, published, q
- localStorage key: "obs.filters"
- "Load preset" restores all values
- Preset persists across browser refresh
- All filters work after loading

**Validation Points:**
- localStorage contains all 11 fields
- JSON structure is valid
- Load restores exact state
- Data fetches with loaded filters

---

### TC11: Verify Filter Preset Reset Clears New Filters

**Priority:** MEDIUM
**Objective:** Verify that Reset button clears all filters including new ones

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set multiple filters including audit, dates, and sorting
4. Click "Reset" button
5. Verify all filters are cleared:
   - Plant: "All"
   - Audit: "All"
   - Start Date: empty
   - End Date: empty
   - Risk: "All"
   - Process: "All"
   - Status: "All"
   - Published: "Any"
   - Sort By: "Created Date"
   - Order: "Newest First"
   - Search: empty

**Expected Results:**
- All filters reset to default values
- New filters (audit, dates, sort) reset to defaults
- localStorage "obs.filters" removed
- Table shows all observations
- No filters active

**Validation Points:**
- State variables reset
- localStorage cleared
- Default values restored
- Data refetches without filters

---

### TC12: Verify CSV Export with New Filters

**Priority:** HIGH
**Objective:** Verify that CSV export includes new filter parameters

**Precondition:**
- At least 10 observations across multiple audits

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set filters:
   - Audit: Select specific audit
   - Start Date: 2025-09-01
   - End Date: 2025-10-31
   - Sort By: "Risk Category"
   - Order: "Oldest First"
4. Note the number of observations shown (e.g., 5)
5. Click "Export CSV" button
6. Verify CSV download starts
7. Open the downloaded CSV file
8. Verify it contains exactly the filtered and sorted observations

**Expected Results:**
- CSV export URL includes:
  - auditId parameter
  - startDate parameter
  - endDate parameter
  - sortBy parameter
  - sortOrder parameter
- CSV contains only filtered observations
- CSV rows are sorted according to sort settings
- CSV row count matches table row count

**Validation Points:**
- Export API receives all filter params
- Export endpoint applies filters correctly
- Export endpoint applies sorting
- CSV data matches visible table data

---

### TC13: Verify Filter UI Layout (3 Rows)

**Priority:** MEDIUM
**Objective:** Verify that filter UI is organized into 3 responsive rows

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Observe the filter layout
4. Verify filters are organized as:
   - Row 1: Plant, Audit, Audit Start Date, Audit End Date (4 columns)
   - Row 2: Risk, Process, Status, Published (4 columns)
   - Row 3: Sort By, Sort Order, Search (3 columns)
5. Resize browser to tablet width (~800px)
6. Verify layout adapts responsively
7. Resize to mobile width (~400px)
8. Verify all filters remain accessible

**Expected Results:**
- Desktop (>1024px): 4 + 4 + 3 grid layout
- Tablet (768-1024px): 2 columns per row
- Mobile (<768px): 1-2 columns per row
- All filters visible and accessible
- Labels are clear and readable
- No overlapping elements
- Buttons (Save/Load/Reset/Export) below filters

**Validation Points:**
- Responsive grid classes work
- No horizontal scrolling
- Professional appearance
- Touch-friendly on mobile

---

### TC14: Verify Status Dropdown Options Updated

**Priority:** MEDIUM
**Objective:** Verify that Status dropdown shows updated observation status values

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Click the "Status" dropdown
4. Verify dropdown options are:
   - All
   - Pending MR
   - MR Under Review
   - Referred Back
   - Observation Finalised
   - Resolved
5. Verify old values (PENDING, IN_PROGRESS) are NOT present

**Expected Results:**
- Status dropdown shows 5 new enum values
- Options match updated ObservationStatus enum
- Labels are user-friendly (not raw enum values)
- All options work when selected

**Validation Points:**
- Enum values match schema
- UI labels are readable
- Filter applies correctly with new values

---

### TC15: Verify Empty Filters Show All Data

**Priority:** MEDIUM
**Objective:** Verify that when no filters are set, all observations are shown

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Verify default state:
   - All dropdowns show "All" or "Any"
   - Date fields are empty
   - Sort is "Created Date" / "Newest First"
   - Search is empty
4. Verify all observations in database are shown in table
5. Set a filter, then clear it
6. Verify all observations appear again

**Expected Results:**
- Default state shows all observations
- No filters applied to API call (minimal query params)
- Full dataset visible
- Table shows all observations sorted by created date desc

**Validation Points:**
- Empty filters behave as "show all"
- No unexpected filtering
- API called with only sortBy/sortOrder defaults

---

### TC16: Verify Audit Dropdown Format

**Priority:** LOW
**Objective:** Verify that audit dropdown shows correct format

**Precondition:**
- Audits with different properties (some with title, some without)

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Click Audit dropdown
4. Verify each option shows: "PLANTCODE — DATE"
5. If audit has title, verify it's not shown in dropdown (only plant code and date)

**Expected Results:**
- Format: `{plant.code} — {startDate}` (e.g., "PA-01 — 10/1/2025")
- Consistent format for all audits
- Date is formatted as locale date string
- Plant code is clearly visible
- "All" option at top

**Validation Points:**
- Dropdown options generated correctly
- Date formatting works
- Plant code from related plant entity
- No null or undefined values

---

### TC17: Verify Date Input Edge Cases

**Priority:** MEDIUM
**Objective:** Verify that date inputs handle edge cases gracefully

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Test edge cases:
   - Set end date before start date
   - Set dates far in the future
   - Set dates in the past
   - Clear one date while other is set
   - Set same date for both start and end
4. Verify application doesn't crash
5. Verify results are logical

**Expected Results:**
- End date before start date: Returns observations matching overlap logic (may be empty)
- Future dates: Works correctly (may return no results)
- Past dates: Works correctly
- Partial date range: Works with single date logic
- Same date: Returns observations with exact match
- No JavaScript errors or crashes

**Validation Points:**
- No validation errors
- API handles all date combinations
- No null/undefined errors
- Graceful handling of edge cases

---

### TC18: Verify API Query Parameters

**Priority:** MEDIUM
**Objective:** Verify that correct API query parameters are sent

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Open browser DevTools Network tab
4. Set filters:
   - Audit: Select an audit
   - Start Date: 2025-09-01
   - End Date: 2025-09-30
   - Sort By: Risk Category
   - Order: asc
5. Observe the API request to `/api/v1/observations`

**Expected Results:**
- Query string includes:
  - `auditId=<audit-id>`
  - `startDate=2025-09-01`
  - `endDate=2025-09-30`
  - `sortBy=riskCategory`
  - `sortOrder=asc`
- Other active filters also included
- Empty filters are omitted
- Query string is properly URL-encoded
- API returns 200 OK

**Validation Points:**
- URLSearchParams built correctly
- All non-empty filters in query
- Empty filters omitted
- Correct parameter names
- API responds successfully

---

### TC19: Verify Sorting Persists After Filter Change

**Priority:** LOW
**Objective:** Verify that sort settings persist when filters change

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Set Sort By = "Risk Category", Order = "Oldest First"
4. Verify observations are sorted by risk ascending
5. Change Plant filter to a specific plant
6. Verify observations still sorted by risk ascending
7. Change other filters
8. Verify sort persists

**Expected Results:**
- Sort settings persist when filters change
- Data remains sorted according to selected criteria
- Sorting is independent of filtering
- Sort state maintained throughout session

**Validation Points:**
- Sort state in React state
- Sort persists across filter changes
- Sort included in all API calls
- Consistent sorting behavior

---

### TC20: Verify Multiple Audit Selections Not Possible

**Priority:** LOW
**Objective:** Verify that only one audit can be selected at a time

**Steps:**
1. Login as admin user
2. Navigate to Observations page
3. Verify Audit dropdown is single-select (not multi-select)
4. Select an audit
5. Verify only that audit is selected
6. Select different audit
7. Verify previous selection is replaced

**Expected Results:**
- Audit dropdown is single-select
- Only one audit can be selected at a time
- Selecting new audit replaces previous
- "All" option clears selection

**Validation Points:**
- HTML select element (not multi-select)
- Single auditId parameter sent to API
- No multiple audit selection possible

---

## Test Execution Summary Template

| Test Case | Status | Notes | Defects |
|-----------|--------|-------|---------|
| TC1: Audit filter | | | |
| TC2: Start date filter | | | |
| TC3: End date filter | | | |
| TC4: Date range with overlap | | | |
| TC5: Sort by created date | | | |
| TC6: Sort by risk category | | | |
| TC7: Sort by current status | | | |
| TC8: Sort by approval status & updated date | | | |
| TC9: Combined filters | | | |
| TC10: Preset save with new filters | | | |
| TC11: Preset reset clears new filters | | | |
| TC12: CSV export with new filters | | | |
| TC13: Filter UI layout (3 rows) | | | |
| TC14: Status dropdown updated | | | |
| TC15: Empty filters show all data | | | |
| TC16: Audit dropdown format | | | |
| TC17: Date input edge cases | | | |
| TC18: API query parameters | | | |
| TC19: Sorting persists after filter change | | | |
| TC20: Single audit selection | | | |

**Status Options:** PASS | FAIL | BLOCKED | SKIP

---

## Known Limitations / Out of Scope

1. **Multi-select Audits:** Only single audit selection supported (not multi-select)
2. **Date Validation:** No client-side validation for end date >= start date
3. **Performance:** Large datasets (>1000 observations) not performance tested
4. **Date Range Display:** No visual indication of selected date range on table
5. **Sort Indicators:** No visual arrows showing current sort direction on table headers
6. **Filter Chips:** No visual chips showing active filters (only dropdown selections visible)
7. **Advanced Date Logic:** Timezone considerations not explicitly handled
8. **Audit Title:** Audit title not shown in dropdown (only plant code and date)

---

## Playwright MCP Execution Notes

**Navigation:**
- Base URL: `http://localhost:3000`
- Login Page: `http://localhost:3000/login`
- Observations Page: `http://localhost:3000/observations`

**Key Selectors:**

**Filter Dropdowns and Inputs (Row 1):**
- Plant filter: First `select` element in filter grid
- Audit filter: Second `select` element with label "Audit"
- Start Date: First `input[type="date"]` with label "Audit Start Date"
- End Date: Second `input[type="date"]` with label "Audit End Date"

**Filter Dropdowns (Row 2):**
- Risk filter: `select` with label "Risk"
- Process filter: `select` with label "Process"
- Status filter: `select` with label "Status"
- Published filter: `select` with label "Published"

**Sort and Search (Row 3):**
- Sort By dropdown: `select` with label "Sort By"
- Order dropdown: `select` with label "Order"
- Search input: `input` with placeholder "Search text…"

**Filter Buttons:**
- Save preset: Button with text "Save preset"
- Load preset: Button with text "Load preset"
- Reset: Button with text "Reset"
- Export CSV: Button with text "Export CSV"

**Table Elements:**
- Observations table: `table` element in results section
- Table headers: `th` elements with text "Plant", "Audit", "Observation", etc.
- Table rows: `tr` elements in `tbody`
- No results message: `td` with text "No observations."

**Authentication:**
- Admin: admin@example.com / admin123 (full access)
- Auditor: auditor@example.com / auditor123 (full access)
- Auditee: auditee@example.com / auditee123 (limited access)

**API Endpoints for Testing:**
- Observations list: `GET /api/v1/observations?auditId=...&startDate=...&endDate=...&sortBy=...&sortOrder=...`
- Observations export: `GET /api/v1/observations/export?auditId=...&startDate=...&sortBy=...`
- Plants list: `GET /api/v1/plants`
- Audits list: `GET /api/v1/audits`

---

## Dependencies

- Observations exist with various audit assignments
- Audits exist with visitStartDate and visitEndDate values
- Plants exist and are assigned to audits
- Observation.currentStatus uses updated enum values (PENDING_MR, MR_UNDER_REVIEW, etc.)
- TypeScript compiles without errors
- React state management works correctly
- localStorage available in browser
- Prisma client regenerated after any schema changes
- User roles seeded in database via `npm run db:seed`

---

## Regression Testing Notes

After running these tests, verify:
- Existing filters (Plant, Risk, Process, Status, Published, Search) still work
- Observation creation flow still works
- Observation detail page still loads
- Reports page filters still work
- Navigation works correctly
- User authentication and RBAC still work
- No console errors on any page
- CSV export from reports page still works
- WebSocket connections still function

---

## Pre-Test Checklist

Before executing tests:
- [ ] Run `npm run db:seed` - seed users
- [ ] Run `npm run typecheck` - should pass with no errors
- [ ] Start dev server: `npm run dev`
- [ ] Start WebSocket server: `npm run ws:dev`
- [ ] Verify login page loads at http://localhost:3000
- [ ] Verify test user credentials work (login as admin)
- [ ] **If missing:** Create test data using Playwright MCP via UI:
  - [ ] Create at least 2 plants
  - [ ] Create at least 4 audits with different visit dates
  - [ ] Create at least 15 observations across different audits
  - [ ] Ensure observations have varying creation timestamps

---

## Test Data Setup Instructions

**PRIMARY METHOD (Recommended):** Use Playwright MCP to create test data through the UI

**Step-by-step UI-based creation:**

1. **Login:** Navigate to `http://localhost:3000` → Login as admin

2. **Create Plants:**
   - Go to Plants page → Create "Plant A" (code: "PA-01")
   - Create "Plant B" (code: "PB-01")

3. **Create Audits:**
   - Go to Audits page → Create Audit 1 for Plant A:
     - visitStartDate: 2025-09-01
     - visitEndDate: 2025-09-15
   - Create Audit 2 for Plant A:
     - visitStartDate: 2025-10-01
     - visitEndDate: 2025-10-15
   - Create Audit 3 for Plant B:
     - visitStartDate: 2025-11-01
     - visitEndDate: 2025-11-15
   - Create Audit 4 for Plant A (overlapping):
     - visitStartDate: 2025-09-10
     - visitEndDate: 2025-10-05

4. **Create Observations:**
   - Go to Observations page
   - Create 5 observations for Audit 1 (vary risk, process, status)
   - Wait 1-2 seconds between creations (for timestamp differences)
   - Create 4 observations for Audit 2
   - Create 3 observations for Audit 3
   - Create 3 observations for Audit 4
   - Ensure variety in:
     - Risk categories (A, B, C)
     - Processes (O2C, P2P, R2R, INVENTORY)
     - Status (PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED)
     - Published status (mix of true/false)

**Note:** Prefer UI-based creation with Playwright MCP as it validates the application's workflows.

---

## Success Criteria

- All HIGH priority test cases (TC1-TC12) must PASS for successful test execution
- At least 85% of all 20 test cases must PASS (minimum 17 PASS)
- No critical defects blocking observations filtering or sorting
- All new filters must work correctly both independently and in combination
- CSV export must respect all filters and sorting
- Preset functionality must save and load all new filter values
