# RBAC Task 3 - Playwright Test Cases

**Feature**: Audit Management API with RBAC v2 Controls
**Task File**: docs/RBAC_TASK_3.md
**Test Environment**: http://localhost:3005

---

## Test Data Requirements

**Pre-existing Data:**
- Plant: `test-plant-1` (Code: TP001)
- Audit: `test-audit-1` (Q1 2025 Safety Audit)
- Audit Head assigned to `test-audit-1`: audithead@example.com
- Auditor assigned to `test-audit-1`: auditor@example.com

**Test Users:**
- CFO: cfo@example.com (full access, can override locks)
- CXO_TEAM: cxo@example.com (manage audits, lock enforcement)
- AUDIT_HEAD: audithead@example.com (view assigned audits)
- AUDITOR: auditor@example.com (view assigned audits only)

---

## Test Case 1: CFO Can View All Audits

**Role**: CFO
**Priority**: High
**Description**: Verify CFO can view all audits without filtering

### Steps:
1. Navigate to http://localhost:3005
2. Login with email: `cfo@example.com` and password from seed
3. Click on "Audits" navigation link or navigate to `/audits`
4. Wait for audit list to load

### Expected Result:
- All audits in the system are displayed
- Audit list includes `test-audit-1` (Q1 2025 Safety Audit)
- No access denied errors
- Progress indicators shown for each audit

### Validation Points:
- Page title or heading contains "Audits"
- At least one audit is visible in the list
- Audit card/row shows plant name and title

---

## Test Case 2: AUDIT_HEAD Sees Only Assigned Audits

**Role**: AUDIT_HEAD
**Priority**: High
**Description**: Verify AUDIT_HEAD only sees audits they lead

### Steps:
1. Navigate to http://localhost:3005
2. Login with email: `audithead@example.com` and password from seed
3. Click on "Audits" navigation link or navigate to `/audits`
4. Wait for audit list to load

### Expected Result:
- Only audits where user is audit head are displayed
- `test-audit-1` is visible (user is assigned as audit head)
- Audits not assigned to this user are NOT visible
- No "403 Forbidden" error

### Validation Points:
- Audit list contains only assigned audits
- User can see audit details for assigned audit

---

## Test Case 3: AUDITOR Sees Only Assigned Audits

**Role**: AUDITOR
**Priority**: High
**Description**: Verify AUDITOR only sees audits via AuditAssignment

### Steps:
1. Navigate to http://localhost:3005
2. Login with email: `auditor@example.com` and password from seed
3. Click on "Audits" navigation link or navigate to `/audits`
4. Wait for audit list to load

### Expected Result:
- Only audits with AuditAssignment records are displayed
- `test-audit-1` is visible (user has assignment)
- Audits not assigned to this user are NOT visible
- No access errors

### Validation Points:
- Audit list shows assigned audits only
- Audit card shows "Assigned" or similar indicator

---

## Test Case 4: CFO Can Create New Audit

**Role**: CFO
**Priority**: High
**Description**: Verify CFO can create new audits

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to `/audits` or audits page
4. Click "Create Audit" or "New Audit" button
5. Fill in audit creation form:
   - Select Plant: `test-plant-1` or any available plant
   - Enter Title: "Automated Test Audit"
   - Enter Purpose: "Testing audit creation"
6. Click "Create" or "Submit" button
7. Wait for success message or redirect

### Expected Result:
- Form submits successfully
- Success message displayed (e.g., "Audit created successfully")
- Redirected to audit detail page or audit list
- New audit appears in audit list

### Validation Points:
- No 403 Forbidden error
- Audit appears in list with entered title
- Can navigate to newly created audit

---

## Test Case 5: AUDITOR Cannot Create Audit

**Role**: AUDITOR
**Priority**: High
**Description**: Verify AUDITOR is blocked from creating audits

### Steps:
1. Navigate to http://localhost:3005
2. Login as AUDITOR: `auditor@example.com`
3. Navigate to `/audits` or audits page
4. Look for "Create Audit" or "New Audit" button

### Expected Result:
- "Create Audit" button is NOT visible (UI-level restriction), OR
- Clicking button shows 403 Forbidden error
- User cannot access audit creation form

### Validation Points:
- Create button hidden or disabled for AUDITOR role
- If form accessible, submission returns 403 error

---

## Test Case 6: CFO Can Lock Audit

**Role**: CFO
**Priority**: Critical
**Description**: Verify CFO can lock audits via UI

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to audit detail page: `/audits/test-audit-1`
4. Ensure audit is unlocked (if locked, unlock it first)
5. Look for "Lock Audit" button or action
6. Click "Lock Audit" button
7. Confirm action if confirmation dialog appears
8. Wait for success message

### Expected Result:
- Success message displayed (e.g., "Audit locked successfully")
- Lock icon or indicator appears on audit
- "Unlock Audit" button now visible instead of "Lock Audit"
- Lock timestamp displayed

### Validation Points:
- Audit status shows as "Locked"
- Lock badge/icon visible
- Edit buttons disabled (except for CFO)

---

## Test Case 7: CXO Cannot Edit Locked Audit

**Role**: CXO_TEAM
**Priority**: Critical
**Description**: Verify CXO_TEAM blocked from editing locked audits

### Pre-condition:
- `test-audit-1` must be locked (run Test Case 6 first)

### Steps:
1. Navigate to http://localhost:3005
2. Login as CXO: `cxo@example.com`
3. Navigate to audit detail: `/audits/test-audit-1`
4. Verify audit shows as "Locked"
5. Try to click "Edit" button or edit audit title
6. Attempt to save changes

### Expected Result:
- Edit button is disabled OR
- Edit form shows but save fails with error message
- Error message: "Audit is locked" or similar
- Changes are NOT saved

### Validation Points:
- Lock indicator visible to CXO user
- Cannot modify audit fields
- Error message displayed on save attempt

---

## Test Case 8: CFO Can Edit Locked Audit (Override)

**Role**: CFO
**Priority**: Critical
**Description**: Verify CFO can override lock and edit locked audits

### Pre-condition:
- `test-audit-1` must be locked

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to audit detail: `/audits/test-audit-1`
4. Verify audit shows as "Locked"
5. Click "Edit" button
6. Modify audit title: "CFO Override Edit Test"
7. Click "Save" button
8. Wait for success message

### Expected Result:
- Edit form is accessible despite lock
- Changes save successfully
- Success message: "Audit updated successfully"
- Updated title displayed
- Audit remains locked after edit

### Validation Points:
- CFO can access edit form
- Save operation succeeds
- Title updated to new value
- Audit still shows locked status

---

## Test Case 9: CFO Can Unlock Audit

**Role**: CFO
**Priority**: High
**Description**: Verify CFO can unlock locked audits

### Pre-condition:
- `test-audit-1` must be locked

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to audit detail: `/audits/test-audit-1`
4. Verify audit shows as "Locked"
5. Click "Unlock Audit" button
6. Confirm action if confirmation appears
7. Wait for success message

### Expected Result:
- Success message: "Audit unlocked successfully"
- Lock indicator disappears
- "Lock Audit" button visible again
- Audit now editable by CXO_TEAM

### Validation Points:
- No lock badge/icon visible
- Status shows as unlocked
- All users with edit permissions can now edit

---

## Test Case 10: CFO Can Complete Audit (Auto-Lock)

**Role**: CFO
**Priority**: Critical
**Description**: Verify CFO can complete audits and they auto-lock

### Pre-condition:
- `test-audit-1` must be unlocked

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to audit detail: `/audits/test-audit-1`
4. Verify audit is NOT completed
5. Look for "Complete Audit" button
6. Click "Complete Audit" button
7. Confirm action if dialog appears
8. Wait for success message

### Expected Result:
- Success message: "Audit completed successfully" or similar
- Audit status changes to "Completed"
- Audit automatically locked (lock indicator visible)
- Completion date displayed
- "Complete Audit" button no longer available

### Validation Points:
- Status badge shows "Completed"
- Lock indicator present (auto-locked)
- Completed date/timestamp displayed
- Cannot complete again (button hidden/disabled)

---

## Test Case 11: Cannot Complete Already-Completed Audit

**Role**: CFO
**Priority**: Medium
**Description**: Verify system prevents completing already-completed audits

### Pre-condition:
- `test-audit-1` must be completed (run Test Case 10 first)

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to audit detail: `/audits/test-audit-1`
4. Verify audit shows as "Completed"
5. Look for "Complete Audit" button

### Expected Result:
- "Complete Audit" button is NOT visible OR
- Button is disabled
- Audit shows completion date
- Attempting to complete via API would return 400 error

### Validation Points:
- Button hidden or disabled for completed audits
- Status clearly shows "Completed"
- UI prevents duplicate completion

---

## Test Case 12: Set Visibility Rule - "last_12m"

**Role**: CFO
**Priority**: Medium
**Description**: Verify CFO can set visibility rules for historical audits

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to audit detail: `/audits/test-audit-1`
4. Look for "Visibility Settings" or "Manage Visibility" option
5. Click to open visibility configuration
6. Select "Last 12 Months" option
7. Click "Save" or "Apply"
8. Wait for success message

### Expected Result:
- Success message: "Visibility settings updated"
- Selected rule displayed: "Last 12 Months"
- Rule saved and applied to audit

### Validation Points:
- Visibility setting UI accessible
- Option to select different rule types
- Save operation succeeds
- Setting persists on page reload

---

## Test Case 13: AUDIT_HEAD Sees Audit Detail for Assigned Audit

**Role**: AUDIT_HEAD
**Priority**: High
**Description**: Verify AUDIT_HEAD can view details of assigned audits

### Steps:
1. Navigate to http://localhost:3005
2. Login as AUDIT_HEAD: `audithead@example.com`
3. Navigate to `/audits`
4. Find `test-audit-1` in the list
5. Click on the audit to view details
6. Wait for detail page to load

### Expected Result:
- Audit detail page loads successfully
- No 403 Forbidden error
- Audit details visible (title, plant, dates, progress)
- User can see observations and audit information

### Validation Points:
- Page displays audit title: "Q1 2025 Safety Audit"
- Plant name visible
- Progress indicators shown
- Observation list accessible

---

## Test Case 14: AUDITOR Cannot View Unassigned Audit

**Role**: AUDITOR
**Priority**: High
**Description**: Verify AUDITOR blocked from viewing audits not assigned to them

### Pre-condition:
- Create or identify an audit NOT assigned to auditor@example.com

### Steps:
1. Navigate to http://localhost:3005
2. Login as AUDITOR: `auditor@example.com`
3. Try to navigate directly to an unassigned audit detail page
4. Or try to access via audit list (should not appear)

### Expected Result:
- Audit does NOT appear in audit list, OR
- Accessing URL directly shows 403 Forbidden error
- Error message: "Forbidden" or "Access denied"
- User redirected or shown error page

### Validation Points:
- Unassigned audits hidden from list
- Direct URL access blocked with 403
- Clear error message displayed

---

## Test Case 15: Audit Trail Logged for Lock Operation

**Role**: CFO (with database verification)
**Priority**: Medium
**Description**: Verify audit trail logging when audit is locked

### Steps:
1. Navigate to http://localhost:3005
2. Login as CFO: `cfo@example.com`
3. Navigate to audit detail: `/audits/test-audit-1`
4. Lock the audit (if not already locked)
5. **Manual verification**: Open Prisma Studio or database
6. Query AuditEvent table for `entityType='AUDIT'` and `entityId='test-audit-1'`
7. Look for recent LOCKED event

### Expected Result:
- AuditEvent record exists with:
  - `entityType` = "AUDIT"
  - `entityId` = "test-audit-1"
  - `action` = "LOCKED"
  - `actorId` = CFO user ID
  - `diff` contains `isLocked: true`

### Validation Points:
- Event logged immediately after lock
- Correct actor ID recorded
- Timestamp matches lock time
- Diff field contains lock state change

---

## Test Suite Summary

**Total Test Cases**: 15

**Breakdown by Category:**
- Access Control: 5 test cases (TC2, TC3, TC5, TC13, TC14)
- Audit Creation: 2 test cases (TC4, TC5)
- Lock/Unlock: 4 test cases (TC6, TC7, TC8, TC9)
- Complete: 2 test cases (TC10, TC11)
- Visibility: 1 test case (TC12)
- Audit Trail: 1 test case (TC15)

**Critical Test Cases**: TC6, TC7, TC8, TC10
**High Priority**: TC1, TC2, TC3, TC4, TC5, TC9, TC13, TC14

---

## Test Execution Notes

1. **Test Order**: Execute in sequence (TC1-TC15) for best results
2. **Data Cleanup**: Some tests modify `test-audit-1` state (lock/unlock/complete)
3. **Reset Between Runs**: May need to reset audit state or use different test audits
4. **Browser Sessions**: Ensure proper logout between role changes
5. **Real-time Features**: WebSocket not required for audit operations
6. **Database Access**: TC15 requires database access for verification

---

## Known Limitations

- API-focused features (lock/unlock/complete) require UI implementation
- If UI doesn't exist yet, tests will need to use DevTools console or API calls
- Some tests assume UI elements exist (buttons, forms)
- Actual element selectors will depend on final UI implementation

---

**Test Case File Version**: 1.0
**Created**: 2025-01-22
**Last Updated**: 2025-01-22
