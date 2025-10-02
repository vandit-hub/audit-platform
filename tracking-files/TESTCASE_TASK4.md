# Test Case Document - TASK4: Reports Section Improvements

**Task:** Fix risk count logic, update action plan display, add retest status, and implement filtering on reports page
**Test Method:** Playwright MCP Browser Automation
**Date Created:** 2025-10-02
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

- **Additional Test Data (Create if Missing):**
  - At least 2 plants in the system
  - At least 3 audits with different dates and plants
  - At least 10 observations with varying:
    - Risk categories (A, B, C)
    - Current status (PENDING_MR, MR_UNDER_REVIEW, RESOLVED)
    - Processes (O2C, P2P, R2R, INVENTORY)
    - Published status (true/false)
  - At least 5 action plans with:
    - Different target dates (some overdue, some due soon, some future)
    - Retest status (RETEST_DUE, PASS, FAIL, null)
    - Various owners and statuses

**IMPORTANT - Test Data Setup:**
If plants, audits, observations, or action plans are not present in the database, create them manually using Playwright MCP from the UI before running the test cases:

1. **Create Plants:** Navigate to Plants page → Create plants with codes and names
2. **Create Audits:** Navigate to Audits page → Select plants → Create audits with different dates
3. **Create Observations:** Navigate to Observations page → Create observations with various risk/status/process values
4. **Create Action Plans:** Open observations → Add action plans with target dates and retest status

Use Playwright MCP to automate this test data creation through the UI workflows, not via direct database manipulation or API calls. This ensures the application's creation flows are also validated.

---

## Critical Test Cases

**Before starting:** Ensure test data exists (users are seeded, but create plants/audits/observations/action plans via UI using Playwright MCP if missing).

---

### TC1: Verify Risk Count Excludes RESOLVED Observations

**Priority:** HIGH
**Objective:** Verify that risk category counts (A, B, C) exclude observations with currentStatus = RESOLVED

**Precondition:**
- At least 3 observations with risk category A (2 active, 1 RESOLVED)
- At least 3 observations with risk category B (1 active, 2 RESOLVED)
- At least 2 observations with risk category C (2 active, 0 RESOLVED)

**Test Data:**
```
Risk A: 2 active + 1 RESOLVED = should show count of 2
Risk B: 1 active + 2 RESOLVED = should show count of 1
Risk C: 2 active + 0 RESOLVED = should show count of 2
```

**Steps:**
1. Navigate to `http://localhost:3000`
2. Login as admin user
3. Navigate to Reports page (`/reports`)
4. Observe the "By Risk" KPI card
5. Note down the counts for A, B, and C

**Expected Results:**
- Risk A count = 2 (excludes the 1 RESOLVED observation)
- Risk B count = 1 (excludes the 2 RESOLVED observations)
- Risk C count = 2 (all active, none RESOLVED)
- Total risk count = 5 (not 8)

**Validation Points:**
- RESOLVED observations do not contribute to risk counts
- Only active observations (all statuses except RESOLVED) are counted
- Risk category counts are accurate
- No null or undefined errors

---

### TC2: Verify Action Plan Display Instead of Observation TargetDate

**Priority:** HIGH
**Objective:** Verify that Overdue and Due Soon sections now display ActionPlan entries instead of observations

**Precondition:**
- At least 2 observations with ActionPlan entries that have overdue targetDate
- At least 3 observations with ActionPlan entries that have due soon targetDate
- At least 1 observation with targetDate but NO action plans (should not appear)

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Scroll to "Overdue Action Plans" section
4. Verify the table shows action plan data
5. Scroll to "Action plan due in (next 14 days)" section
6. Verify the table shows action plan data

**Expected Results:**
- Both tables show ActionPlan entries, not Observation entries
- Each row displays:
  - Plant code
  - Plan text (truncated with tooltip)
  - Target Date
  - Owner
  - Retest status badge
- Observations with targetDate but no ActionPlans do NOT appear
- Only action plans from non-RESOLVED observations appear

**Validation Points:**
- Tables query ActionPlan table
- Data structure includes: id, observationId, plan, owner, targetDate, status, retest, plant, observationStatus
- No orphaned or null references
- Correct data binding

---

### TC3: Verify "Action plan due in (next xx days)" Label

**Priority:** HIGH
**Objective:** Verify that the "Due Soon" section heading has been updated to "Action plan due in (next xx days)"

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Set the "Due window (days)" input to 14
4. Locate the section on the right side showing upcoming items
5. Read the section heading

**Expected Results:**
- Heading reads: "Action plan due in (next 14 days)"
- If days changed to 30, heading updates to: "Action plan due in (next 30 days)"
- Heading is NOT "Due Soon (next 14 days)"
- Heading is dynamically updated based on days input

**Validation Points:**
- Label matches requirements exactly
- Dynamic update when days value changes
- Consistent styling with rest of UI
- No hardcoded "Due Soon" text

---

### TC4: Verify Retest Status Badge Display

**Priority:** HIGH
**Objective:** Verify that retest status displays as color-coded badges in both Overdue and Due Soon tables

**Precondition:**
- Action plans exist with all three retest values: RETEST_DUE, PASS, FAIL
- At least one action plan with null/empty retest status

**Test Data:**
```
Action Plan 1: retest = RETEST_DUE (should show yellow "Due" badge)
Action Plan 2: retest = PASS (should show green "Pass" badge)
Action Plan 3: retest = FAIL (should show red "Fail" badge)
Action Plan 4: retest = null (should show "—" or empty)
```

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Locate action plans with different retest statuses in the tables
4. Verify badge colors and text

**Expected Results:**
- **RETEST_DUE:** Yellow badge with text "Due" (`bg-yellow-100 text-yellow-800`)
- **PASS:** Green badge with text "Pass" (`bg-green-100 text-green-800`)
- **FAIL:** Red badge with text "Fail" (`bg-red-100 text-red-800`)
- **null/empty:** Gray dash "—" or empty cell
- All badges have consistent rounded styling and padding

**Validation Points:**
- Correct color mapping for all three status values
- Badges are visually distinct
- Text is clear and readable
- Handles null values gracefully

---

### TC5: Verify Plant Filter

**Priority:** HIGH
**Objective:** Verify that the Plant filter correctly filters both KPI data and action plan tables

**Precondition:**
- At least 2 different plants with observations
- Plant A has 5 observations (3 risk A, 2 risk B)
- Plant B has 3 observations (1 risk A, 2 risk C)

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Select "Plant A" from the Plant filter dropdown
4. Observe KPI cards and tables
5. Note the risk counts
6. Select "Plant B" from the Plant filter dropdown
7. Observe the changes
8. Select "All" to reset

**Expected Results:**
- When Plant A selected:
  - Risk counts show only Plant A's observations
  - Overdue/Due Soon tables show only Plant A's action plans
  - Total observations count matches Plant A data
- When Plant B selected:
  - Data updates to show only Plant B
- When "All" selected:
  - All plants' data is shown

**Validation Points:**
- Filter applies to both KPIs and tables
- Data updates correctly on filter change
- No stale data from previous filter
- API calls include plantId parameter

---

### TC6: Verify Audit Filter

**Priority:** HIGH
**Objective:** Verify that the Audit filter correctly filters data by selected audit

**Precondition:**
- At least 2 audits exist with observations
- Each audit has different observation counts

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Open the "Audit" filter dropdown
4. Verify audit options show: "Untitled — PLANTCODE (DATE)" or similar
5. Select a specific audit
6. Verify KPI cards update
7. Verify action plan tables update
8. Select different audit
9. Verify data changes

**Expected Results:**
- Audit dropdown shows all audits with title, plant code, and date
- Selecting an audit filters all data to that audit only
- KPI counts reflect selected audit's observations
- Action plan tables show only selected audit's plans
- API receives auditId parameter

**Validation Points:**
- Audit dropdown populated correctly
- Filter applies globally
- Data isolation works correctly
- No cross-audit data leakage

---

### TC7: Verify Audit Period Filter (Date Range)

**Priority:** HIGH
**Objective:** Verify that the start/end date filters correctly filter observations by audit visit dates

**Precondition:**
- Audit A: visitStartDate = 2025-09-01, visitEndDate = 2025-09-15
- Audit B: visitStartDate = 2025-10-01, visitEndDate = 2025-10-15
- Audit C: visitStartDate = 2025-11-01, visitEndDate = 2025-11-15

**Test Data:**
```
Filter: startDate = 2025-09-01, endDate = 2025-09-30
Expected: Should show only Audit A's data

Filter: startDate = 2025-10-01, endDate = 2025-11-30
Expected: Should show Audit B and C's data

Filter: startDate = 2025-09-15, endDate = 2025-10-05
Expected: Should show Audit A and B's data (overlapping dates)
```

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Set Start Date = 2025-09-01
4. Set End Date = 2025-09-30
5. Verify only Audit A's observations appear
6. Change dates to test different ranges
7. Verify overlap logic works correctly

**Expected Results:**
- Date range filters by audit.visitStartDate and visitEndDate overlap
- Observations from audits within or overlapping the range are shown
- Observations from audits completely outside the range are excluded
- Empty date fields show all data

**Validation Points:**
- Date range overlap logic is correct
- Handles edge cases (exact date matches)
- Both start and end dates work independently
- Clear all dates returns to unfiltered state

---

### TC8: Verify Risk, Process, Status, and Published Filters

**Priority:** HIGH
**Objective:** Verify that Risk, Process, Status, and Published filters work correctly

**Test Data:**
```
Risk Filter:
- Select "A" → Should show only risk A observations
- Select "B" → Should show only risk B observations

Process Filter:
- Select "O2C" → Should show only O2C observations
- Select "P2P" → Should show only P2P observations

Status Filter:
- Select "PENDING_MR" → Should show only PENDING_MR observations
- Select "RESOLVED" → Should show only RESOLVED observations (risk count = 0)

Published Filter:
- Select "Published" → Should show only published observations
- Select "Unpublished" → Should show only unpublished observations
```

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Test each filter individually:
   - Select Risk "A" → Verify counts update
   - Reset → Select Process "O2C" → Verify counts update
   - Reset → Select Status "RESOLVED" → Verify risk count = 0
   - Reset → Select Published "Published" → Verify published count
4. Test multiple filters combined:
   - Select Risk "A" + Process "O2C" → Verify intersection
   - Select Plant "X" + Status "PENDING_MR" → Verify intersection

**Expected Results:**
- Each filter independently filters data correctly
- Multiple filters work together (AND logic)
- KPI cards and tables both respect filters
- Counts are accurate after filtering

**Validation Points:**
- Single filter accuracy
- Multiple filter combination
- No filter conflicts
- Proper AND logic between filters

---

### TC9: Verify Filter Preset Save/Load/Reset

**Priority:** MEDIUM
**Objective:** Verify that filter presets can be saved, loaded, and reset

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Set multiple filters:
   - Plant: "Test Plant"
   - Risk: "A"
   - Process: "O2C"
   - Status: "PENDING_MR"
   - Days: 30
4. Click "Save preset" button
5. Verify success (check browser localStorage or message)
6. Clear all filters manually
7. Click "Load preset" button
8. Verify all filters are restored
9. Click "Reset" button
10. Verify all filters are cleared

**Expected Results:**
- "Save preset" saves all 9 filter values to localStorage (key: "reports.filters")
- "Load preset" restores all saved filter values
- "Reset" clears all filters and removes from localStorage
- Days value is also saved/loaded
- Preset persists across browser refreshes

**Validation Points:**
- localStorage key is "reports.filters"
- JSON structure includes all filter values
- Load works after page refresh
- Reset completely clears state

---

### TC10: Verify Filters Affect Both KPIs and Tables

**Priority:** HIGH
**Objective:** Verify that filters apply to both KPI cards AND action plan tables simultaneously

**Precondition:**
- Plant A has 10 observations with 5 action plans
- Plant B has 5 observations with 3 action plans

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Note initial KPI values and table row counts
4. Select Plant A filter
5. Verify KPI cards show Plant A data only
6. Verify Overdue/Due Soon tables show Plant A action plans only
7. Select Plant B filter
8. Verify both KPIs and tables update to Plant B data

**Expected Results:**
- When Plant A selected:
  - Total Observations KPI = 10
  - Risk counts reflect Plant A's observations
  - Overdue table shows ≤5 rows (Plant A's plans)
  - Due Soon table shows ≤5 rows (Plant A's plans)
- When Plant B selected:
  - Total Observations KPI = 5
  - Risk counts reflect Plant B's observations
  - Tables show ≤3 rows total (Plant B's plans)

**Validation Points:**
- Single source of truth for filters
- Both API endpoints receive same filter params
- No data inconsistency between KPIs and tables
- Simultaneous update on filter change

---

### TC11: Verify Plan Text Truncation and Tooltip

**Priority:** MEDIUM
**Objective:** Verify that long action plan text is truncated with tooltip

**Precondition:**
- Action plan with long text (>100 characters):
  "This is a very long action plan description that should be truncated in the table but fully visible on hover via the title attribute tooltip functionality"

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Locate an action plan with long text in Overdue or Due Soon table
4. Verify text is truncated (shows ellipsis "...")
5. Hover over the plan text cell
6. Verify tooltip shows full text

**Expected Results:**
- Plan text column has `max-w-xs truncate` class
- Text longer than column width shows ellipsis
- Full text is available in title attribute
- Hovering shows browser's default tooltip with full text

**Validation Points:**
- Truncation works visually
- Title attribute is set correctly
- Tooltip displays on hover
- Readable and user-friendly

---

### TC12: Verify Filter Persistence Across Page Refresh

**Priority:** MEDIUM
**Objective:** Verify that filters saved in preset persist across browser refresh

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Set multiple filters and save preset
4. Note the current KPI values
5. Refresh the browser page (F5 or Ctrl+R)
6. Wait for page to reload
7. Verify filters are restored from preset
8. Verify KPI values match pre-refresh values

**Expected Results:**
- After refresh, loadPreset() is called automatically
- All filter values are restored from localStorage
- Data is re-fetched with saved filters
- KPI cards and tables show same data as before refresh

**Validation Points:**
- useEffect hook calls loadPreset on mount
- localStorage survives page refresh
- Filter state is correctly rehydrated
- Data consistency after refresh

---

### TC13: Verify Responsive Design of Filter UI

**Priority:** LOW
**Objective:** Verify that filter UI is responsive and works on different screen sizes

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Resize browser window to desktop width (>1024px)
4. Verify filter layout (should be 4 columns)
5. Resize to tablet width (768px-1024px)
6. Verify filter layout (should be 2 columns)
7. Resize to mobile width (<768px)
8. Verify filter layout (should be 1-2 columns)

**Expected Results:**
- Desktop: `lg:grid-cols-4` - 4 filters per row
- Tablet: `sm:grid-cols-2` - 2 filters per row
- Mobile: Single column or 2 columns
- All filters remain accessible
- No overlapping or cut-off elements
- Buttons (Save/Load/Reset) remain visible

**Validation Points:**
- Responsive grid classes work correctly
- No horizontal scrolling needed
- Touch-friendly on mobile
- Professional appearance at all sizes

---

### TC14: Verify API Endpoints Receive Filter Parameters

**Priority:** MEDIUM
**Objective:** Verify that both overview and targets API endpoints receive correct filter query parameters

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Open browser DevTools Network tab
4. Set multiple filters:
   - Plant: Select a plant
   - Risk: "A"
   - Status: "PENDING_MR"
5. Observe network requests

**Expected Results:**
- Two API calls are made:
  1. `GET /api/v1/reports/overview?days=14&plantId=xxx&risk=A&status=PENDING_MR`
  2. `GET /api/v1/reports/targets?days=14&plantId=xxx&risk=A&status=PENDING_MR`
- Both endpoints receive identical filter parameters
- Query string is properly URL-encoded
- Both APIs return filtered data

**Validation Points:**
- URLSearchParams built correctly
- All non-empty filters included in query
- Empty filters are omitted
- Both endpoints receive same params

---

### TC15: Verify Empty State When No Data Matches Filters

**Priority:** LOW
**Objective:** Verify graceful handling when filters result in no matching data

**Steps:**
1. Login as admin user
2. Navigate to Reports page
3. Set filters that result in no matches:
   - Plant: "Plant A"
   - Risk: "A"
   - Status: "RESOLVED"
   - (Assuming no Plant A observations are both Risk A AND RESOLVED)
4. Observe UI

**Expected Results:**
- KPI cards show zero counts:
  - Total Observations: 0
  - All status counts: 0
  - All risk counts: 0
  - Published: 0, Unpublished: 0
- Overdue table shows: "None."
- Due Soon table shows: "None."
- No JavaScript errors
- No "undefined" or "null" displayed

**Validation Points:**
- Graceful zero-state handling
- No error messages
- Clear indication of no results
- User understands filters are too restrictive

---

## Test Execution Summary Template

| Test Case | Status | Notes | Defects |
|-----------|--------|-------|---------|
| TC1: Risk count excludes RESOLVED | | | |
| TC2: Action plan display (not observation) | | | |
| TC3: "Action plan due in" label | | | |
| TC4: Retest status badges | | | |
| TC5: Plant filter | | | |
| TC6: Audit filter | | | |
| TC7: Audit period filter (date range) | | | |
| TC8: Risk/Process/Status/Published filters | | | |
| TC9: Filter preset save/load/reset | | | |
| TC10: Filters affect both KPIs and tables | | | |
| TC11: Plan text truncation and tooltip | | | |
| TC12: Filter persistence across refresh | | | |
| TC13: Responsive filter UI | | | |
| TC14: API receives filter parameters | | | |
| TC15: Empty state handling | | | |

**Status Options:** PASS | FAIL | BLOCKED | SKIP

---

## Known Limitations / Out of Scope

1. **Testing (Task 9):** Automated testing explicitly skipped per user request
2. **Audit Period Logic:** Complex overlap logic may have edge cases with null visitStartDate/visitEndDate
3. **Performance:** Large datasets (>1000 observations) not performance tested
4. **WebSocket:** Real-time updates when other users change data not tested
5. **Action Plan Migration:** Old observations using observation.targetDate instead of ActionPlan table not migrated
6. **Filter Validation:** No max length or format validation on date inputs

---

## Playwright MCP Execution Notes

**Navigation:**
- Base URL: `http://localhost:3000`
- Login Page: `http://localhost:3000/login`
- Reports Page: `http://localhost:3000/reports`

**Key Selectors:**

**Filter Dropdowns and Inputs:**
- Plant filter: `select` with label "Plant"
- Audit filter: `select` with label "Audit"
- Start Date: `input[type="date"]` with label "Start Date"
- End Date: `input[type="date"]` with label "End Date"
- Risk filter: `select` with label "Risk"
- Process filter: `select` with label "Process"
- Status filter: `select` with label "Status"
- Published filter: `select` with label "Published"
- Days input: `input[type="number"]` with label "Due window (days)"

**Filter Buttons:**
- Save preset: Button with text "Save preset"
- Load preset: Button with text "Load preset"
- Reset: Button with text "Reset"

**KPI Cards:**
- Total Observations: Look for "Total Observations" heading
- Risk counts: Look for "By Risk" section with "A:", "B:", "C:"
- Published counts: Look for "Published:" and "Unpublished:"

**Tables:**
- Overdue section: Heading "Overdue Action Plans"
- Due Soon section: Heading matching pattern "Action plan due in (next \d+ days)"
- Table headers: "Plant", "Plan", "Target", "Owner", "Retest"
- Retest badges: `span` elements with bg-yellow-100, bg-green-100, or bg-red-100 classes
- Empty state: Table cell with text "None."

**Retest Badge Selectors:**
- RETEST_DUE: `span.bg-yellow-100` containing text "Due"
- PASS: `span.bg-green-100` containing text "Pass"
- FAIL: `span.bg-red-100` containing text "Fail"
- Empty: `span.text-gray-400` containing "—"

**Authentication:**
- Admin: admin@example.com / admin123 (full access to reports)
- Auditor: auditor@example.com / auditor123 (full access to reports)
- Auditee/Guest: Limited access (RBAC restrictions apply)

**API Endpoints for Testing:**
- Overview KPIs: `GET /api/v1/reports/overview?days=14&plantId=...&risk=...&status=...`
- Action Plan Targets: `GET /api/v1/reports/targets?days=14&plantId=...&risk=...&status=...`
- Plants list: `GET /api/v1/plants`
- Audits list: `GET /api/v1/audits`

---

## Dependencies

- Database schema includes ActionPlan table with retest field
- ActionPlan.retest is enum: RETEST_DUE | PASS | FAIL
- Observation.currentStatus includes RESOLVED status
- Plants and Audits exist in database
- Observations exist with various statuses and risk categories
- Action plans exist with targetDate values (some overdue, some due soon)
- Prisma client regenerated after schema changes
- TypeScript compiles without errors
- User roles seeded in database via `npm run db:seed`
- Test data (plants, audits, observations, action plans) created via UI using Playwright MCP if not present

---

## Regression Testing Notes

After running these tests, verify:
- Observations page still works (filters, search, create)
- Observation detail page still works
- Action plan creation/editing still works
- Other reports functionality not affected (if any)
- Navigation works correctly
- User authentication and RBAC still work
- No console errors on any page
- CSV exports still work
- WebSocket connections still function

---

## Pre-Test Checklist

Before executing tests:
- [ ] Run `npm run db:seed` - seed users (admin, auditor, auditee, guest)
- [ ] Run `npm run typecheck` - should pass with no errors
- [ ] Run `npx prisma studio` - verify ActionPlan table has retest field
- [ ] Run `npx prisma studio` - verify Observation.currentStatus includes RESOLVED
- [ ] Start dev server: `npm run dev`
- [ ] Start WebSocket server: `npm run ws:dev`
- [ ] Verify login page loads at http://localhost:3000
- [ ] Verify test user credentials work (login as admin)
- [ ] **If missing:** Create test data using Playwright MCP via UI:
  - [ ] Create at least 2 plants
  - [ ] Create at least 3 audits with different dates
  - [ ] Create at least 10 observations with varying risk/status/process
  - [ ] Create at least 5 action plans with target dates and retest status

---

## Test Data Setup Instructions

**PRIMARY METHOD (Recommended):** Use Playwright MCP to create test data through the UI

**Step-by-step UI-based creation:**

1. **Login:** Navigate to `http://localhost:3000` → Login as admin

2. **Create Plants:**
   - Go to Plants page → Create "Plant A" (code: "PA-01")
   - Create "Plant B" (code: "PB-01")

3. **Create Audits:**
   - Go to Audits page → Create Audit 1 for Plant A (set visitStartDate: 2025-09-01, visitEndDate: 2025-09-15)
   - Create Audit 2 for Plant A (set visitStartDate: 2025-10-01, visitEndDate: 2025-10-15)
   - Create Audit 3 for Plant B (set visitStartDate: 2025-11-01, visitEndDate: 2025-11-15)

4. **Create Observations:**
   - Go to Observations page
   - Create 5 observations for Audit 1:
     - Risk A, Process O2C, Status PENDING_MR, Published true
     - Risk A, Process P2P, Status MR_UNDER_REVIEW, Published false
     - Risk B, Process O2C, Status PENDING_MR, Published true
     - Risk B, Process R2R, Status RESOLVED, Published true (this will NOT count in risk stats)
     - Risk C, Process INVENTORY, Status PENDING_MR, Published true
   - Create 3 observations for Audit 2 (vary risk/status/process)
   - Create 2 observations for Audit 3 (vary risk/status/process)

5. **Create Action Plans:**
   - Open each observation → Add action plans section
   - Create overdue action plans (targetDate in the past):
     - Plan: "Fix inventory discrepancy", Owner: "John Doe", targetDate: 2025-09-15, retest: RETEST_DUE
     - Plan: "Update O2C controls", Owner: "Jane Smith", targetDate: 2025-09-20, retest: PASS
   - Create due soon action plans (targetDate within 14 days):
     - Plan: "Implement P2P workflow", Owner: "Bob Johnson", targetDate: [today + 7 days], retest: FAIL
     - Plan: "Review R2R process", Owner: "Alice Brown", targetDate: [today + 10 days], retest: null
   - Create future action plans (targetDate > 14 days away)

**Note:** Prefer UI-based creation with Playwright MCP as it also validates the application's creation workflows.

---

## Success Criteria

All HIGH priority test cases (TC1-TC10) must PASS for successful test execution.
At least 85% of all 15 test cases must PASS (minimum 13 PASS).
No critical defects blocking reports functionality.
All filters must work correctly both independently and in combination.
