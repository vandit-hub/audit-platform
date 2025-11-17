# AUDITOR Role - Comprehensive Testing Plan

**Generated**: 2025-11-17
**Test Credentials**: auditor@example.com / auditor123
**Role Under Test**: AUDITOR
**Target**: Internal Audit Platform v1.0

---

## 1. Role Capabilities Summary

### 1.1 Core Permissions (from `src/lib/rbac.ts`)

**AUDITOR role capabilities:**
- Create observations for assigned audits
- Edit observations in DRAFT or REJECTED status
- Submit observations for approval (transitions DRAFT/REJECTED → SUBMITTED)
- View observations from audits they're assigned to
- Add notes to observations (INTERNAL or ALL visibility)
- Upload attachments (ANNEXURE or MGMT_DOC types)
- Edit only specific fields (auditor fields)
- Access AI Assistant for queries about audits/observations
- View reports and analytics
- Export observation data

**Key Restrictions:**
- ❌ **CANNOT approve or reject observations** (only AUDIT_HEAD/CFO can)
- ❌ **CANNOT delete observations** (only AUDIT_HEAD/CFO can)
- ❌ **CANNOT create, edit, lock/unlock audits** (only CFO/CXO_TEAM can)
- ❌ **CANNOT manage plants** (only CFO/CXO_TEAM can)
- ❌ **CANNOT edit observations after SUBMITTED status** (must be DRAFT or REJECTED)
- ❌ **CANNOT edit observations in locked audits** (unless CFO)
- ❌ **CANNOT access admin pages** (users, imports)
- ❌ **Scope-based**: Only see audits where they have AuditAssignment
- ❌ **Field restrictions**: Can only edit auditor-designated fields

### 1.2 Field-Level Permissions

**AUDITOR can edit these fields (only when approvalStatus = DRAFT or REJECTED):**
- `observationText` - Main observation description
- `risksInvolved` - Risk description
- `riskCategory` - A, B, or C
- `likelyImpact` - LOCAL or ORG_WIDE
- `concernedProcess` - O2C, P2P, R2R, INVENTORY
- `auditorPerson` - Auditor name/identifier
- `currentStatus` - Observation status (PENDING_MR, MR_UNDER_REVIEW, etc.) - **only in DRAFT/REJECTED**

**AUDITOR CANNOT edit these fields (auditee fields):**
- `auditeePersonTier1`
- `auditeePersonTier2`
- `auditeeFeedback`
- `targetDate`
- `personResponsibleToImplement`

### 1.3 Authentication & Session
- NextAuth v5 with JWT strategy
- Idle timeout: 15 minutes (default)
- Absolute session: 24 hours (default)
- Auto-logout on session expiry

### 1.4 Scope & Visibility
- **Observations**: Only from audits where `AuditAssignment.auditorId = user.id`
- **Audits**: Only audits where they're assigned as auditor
- **Published filter**: Can filter by published/unpublished observations
- **No guest scope restrictions** (not applicable to AUDITOR role)

---

## 2. Accessible Pages

### 2.1 Primary Pages (AUDITOR can access)

| Page Path | Purpose | Key Features |
|-----------|---------|--------------|
| `/dashboard` | Home dashboard | Overview metrics, quick stats |
| `/observations` | Observations list | Filter, search, create, export, view assigned observations |
| `/observations/[id]` | Observation detail | View/edit observation, submit, add notes, upload attachments |
| `/audits` | Audits list | View assigned audits (read-only), cannot create/edit |
| `/audits/[id]` | Audit detail | View audit details, observations, checklists |
| `/reports` | Reports & analytics | View KPIs, export reports, filter data |
| `/ai` | AI Assistant | Ask questions about audits/observations with role-based filtering |
| `/plants` | Plants list | View plants (read-only) |

### 2.2 Inaccessible Pages (AUDITOR cannot access)

| Page Path | Reason | Redirects To |
|-----------|--------|--------------|
| `/admin/users` | CFO/CXO_TEAM only | Will get 403 or redirect |
| `/admin/import` | CFO/CXO_TEAM only | Will get 403 or redirect |
| `/checklists` | Module removed/placeholder | Shows "Not Available" message |

### 2.3 System Pages (Accessible to all roles)

| Page Path | Purpose |
|-----------|---------|
| `/login` | Authentication |
| `/invite` | Accept guest invites (not for AUDITOR) |
| `/api/auth/*` | NextAuth endpoints |

---

## 3. Operation Matrix

### 3.1 Observations Operations

| Operation | Page/Component | User Action | API Endpoint | Prerequisites | Expected Behavior |
|-----------|----------------|-------------|--------------|---------------|-------------------|
| **Create Observation** | `/observations` | Click "Create Observation" button | `POST /api/v1/observations` | Must have AuditAssignment to an audit | Dialog opens, select audit, enter observation text, creates DRAFT observation |
| **List Observations** | `/observations` | Page load / Apply filters | `GET /api/v1/observations?plantId=&auditId=&risk=&status=&q=` | Logged in | Shows only observations from assigned audits |
| **View Observation** | `/observations/[id]` | Click "Open →" link | `GET /api/v1/observations/[id]` | Must be assigned to parent audit | Full observation details displayed |
| **Edit Observation** | `/observations/[id]` | Modify fields in form | `PATCH /api/v1/observations/[id]` | approvalStatus=DRAFT/REJECTED, audit not locked, has assignment | Updates allowed fields only |
| **Submit Observation** | `/observations/[id]` | Click "Submit for Approval" | `POST /api/v1/observations/[id]/submit` | approvalStatus=DRAFT/REJECTED, has assignment | Changes status to SUBMITTED, creates Approval record |
| **Export Observations** | `/observations` | Click "Export CSV" | `GET /api/v1/observations/export?<filters>` | None | Downloads CSV of filtered observations |
| **Filter Observations** | `/observations` | Use filter dropdowns | `GET /api/v1/observations?<params>` | None | Updates table with filtered results |

### 3.2 Attachments Operations

| Operation | Page/Component | User Action | API Endpoint | Prerequisites | Expected Behavior |
|-----------|----------------|-------------|--------------|---------------|-------------------|
| **Upload Attachment** | `/observations/[id]` | Upload file (ANNEXURE/MGMT_DOC) | `POST /api/v1/observations/[id]/attachments/presign` + S3 upload + `POST /api/v1/observations/[id]/attachments` | Has assignment to audit | File uploaded to S3, record created |
| **View Attachments** | `/observations/[id]` | See attachments list | Included in `GET /api/v1/observations/[id]` | Has assignment | Displays list of annexures and mgmt docs |
| **Delete Attachment** | `/observations/[id]` | Delete button (if exists) | `DELETE /api/v1/observations/[id]/attachments/[attachmentId]` | Has assignment, audit not locked | Attachment removed |

### 3.3 Notes Operations

| Operation | Page/Component | User Action | API Endpoint | Prerequisites | Expected Behavior |
|-----------|----------------|-------------|--------------|---------------|-------------------|
| **Add Note** | `/observations/[id]` | Enter text, click "Add Note" | `POST /api/v1/observations/[id]/notes` | Has assignment | Note created with visibility INTERNAL or ALL |
| **View Notes** | `/observations/[id]` | Page load | `GET /api/v1/observations/[id]/notes` | Has assignment | Shows all notes (INTERNAL + ALL for auditor) |

### 3.4 Audits Operations

| Operation | Page/Component | User Action | API Endpoint | Prerequisites | Expected Behavior |
|-----------|----------------|-------------|--------------|---------------|-------------------|
| **List Audits** | `/audits` | Page load | `GET /api/v1/audits` | None | Shows only audits where user has AuditAssignment |
| **View Audit** | `/audits/[id]` | Click "Open" link | `GET /api/v1/audits/[id]` | Has assignment | Displays audit details, observations, checklists |
| **Create Audit** | `/audits` | Click "Create Audit" | ❌ **NOT ACCESSIBLE** | CFO/CXO_TEAM only | Button not visible to AUDITOR |
| **Edit Audit** | `/audits/[id]` | Edit button | ❌ **NOT ACCESSIBLE** | CFO/CXO_TEAM only | Button not visible to AUDITOR |
| **Lock/Unlock Audit** | `/audits/[id]` | Lock/unlock button | ❌ **NOT ACCESSIBLE** | CFO/CXO_TEAM only | Button not visible to AUDITOR |

### 3.5 Reports Operations

| Operation | Page/Component | User Action | API Endpoint | Prerequisites | Expected Behavior |
|-----------|----------------|-------------|--------------|---------------|-------------------|
| **View Overview** | `/reports` | Page load / Apply filters | `GET /api/v1/reports/overview?<filters>` | None | Displays KPIs, status counts, risk breakdown |
| **View Targets** | `/reports` | Page load | `GET /api/v1/reports/targets?days=14&<filters>` | None | Shows overdue and due-soon action plans |
| **Export Period Report** | `/reports` | Click "Download period report" | `GET /api/v1/reports/period/export?<filters>` | None | Downloads Excel report |
| **Export Retest Report** | `/reports` | Click "Download retest report" | `GET /api/v1/reports/retest/export?<filters>` | None | Downloads Excel report |
| **Save Filter Preset** | `/reports` | Click "Save preset" | Local storage only | None | Saves current filters to localStorage |

### 3.6 AI Assistant Operations

| Operation | Page/Component | User Action | API Endpoint | Prerequisites | Expected Behavior |
|-----------|----------------|-------------|--------------|---------------|-------------------|
| **Create Chat Session** | `/ai` | Click "New chat" | `POST /api/v1/ai/sessions` | Not AUDITEE/GUEST role | Creates new chat session |
| **List Sessions** | `/ai` | Page load | `GET /api/v1/ai/sessions` | Not AUDITEE/GUEST role | Shows all user's chat sessions |
| **Send Message** | `/ai` | Type message, press Enter | `POST /api/v1/ai/chat` | Active session | AI responds with role-filtered data |
| **Clear Chat** | `/ai` | Click "Clear chat" | `POST /api/v1/ai/sessions/[sessionId]/clear` | Active session | Clears all messages in session |

---

## 4. Test Scenarios

### Priority: CRITICAL (Must Pass)

#### Test 1: Login and Session Management
**Page**: `/login`
**Prerequisites**: Database seeded with auditor account
**Steps**:
1. Navigate to `/login`
2. Enter email: `auditor@example.com`
3. Enter password: `auditor123`
4. Click "Sign In"
5. Wait for redirect to dashboard
6. Verify session persists on page refresh
7. Wait 15 minutes of inactivity
8. Attempt to access `/observations`

**Expected**:
- Successful login with redirect to `/dashboard`
- Session persists across page refreshes
- After 15min idle, redirected to login page
- Audit event logged for LOGIN action

**API Call**: `POST /api/auth/callback/credentials`

---

#### Test 2: View Only Assigned Audits
**Page**: `/audits`
**Prerequisites**:
- Logged in as auditor
- Seeded database has 3 audits: Audit A (auditor assigned), Audit B (auditor assigned), Audit C (not assigned)

**Steps**:
1. Navigate to `/audits`
2. Wait for audit list to load
3. Count number of audits displayed
4. Verify audit titles/codes

**Expected**:
- Only shows Audit A and Audit B (where auditor has AuditAssignment)
- Audit C is NOT visible
- Each audit shows progress, lock status, audit head

**API Call**: `GET /api/v1/audits`

---

#### Test 3: Create Observation for Assigned Audit
**Page**: `/observations`
**Prerequisites**: Logged in as auditor with assignment to "Plant 1 Audit"
**Steps**:
1. Navigate to `/observations`
2. Click "Create Observation" button
3. Select audit: "Plant 1 Audit"
4. Enter observation text: "Test observation - Safety violation in warehouse"
5. Click "Create Observation"
6. Wait for success message
7. Verify observation appears in table

**Expected**:
- Dialog opens with only assigned audits in dropdown
- Observation created with approvalStatus=DRAFT
- Success toast: "Observation created successfully for Plant 1!"
- New observation appears at top of table (sorted by createdAt desc)
- Audit event logged for CREATE action

**API Call**: `POST /api/v1/observations`

---

#### Test 4: Edit Observation in DRAFT Status
**Page**: `/observations/[id]`
**Prerequisites**: DRAFT observation created by auditor in unlocked audit
**Steps**:
1. Navigate to `/observations/[id]`
2. Edit `observationText` field: "Updated observation text"
3. Set `riskCategory` to "A"
4. Set `concernedProcess` to "O2C"
5. Click "Save"
6. Wait for success message
7. Refresh page and verify changes persisted

**Expected**:
- Fields are editable
- Changes saved successfully
- Success toast appears
- WebSocket broadcast notifies other users
- Audit event logged for UPDATE action

**API Call**: `PATCH /api/v1/observations/[id]`

---

#### Test 5: Submit Observation for Approval
**Page**: `/observations/[id]`
**Prerequisites**: DRAFT observation with observationText filled
**Steps**:
1. Navigate to `/observations/[id]`
2. Click "Submit for Approval" button
3. Wait for confirmation
4. Verify approvalStatus badge changes from DRAFT to SUBMITTED
5. Try to edit `observationText` field

**Expected**:
- approvalStatus changes from DRAFT → SUBMITTED
- Approval record created with status=SUBMITTED
- Success toast appears
- Fields become read-only (cannot edit SUBMITTED observation)
- Audit event logged for SUBMIT action

**API Call**: `POST /api/v1/observations/[id]/submit`

---

#### Test 6: Cannot Edit Observation After Submission
**Page**: `/observations/[id]`
**Prerequisites**: SUBMITTED observation
**Steps**:
1. Navigate to `/observations/[id]`
2. Attempt to edit `observationText` field
3. Attempt to change `riskCategory`
4. Click "Save" if button is visible

**Expected**:
- Fields are disabled/read-only OR
- Save button returns error: "Can only edit auditor fields when observation is DRAFT or REJECTED"
- HTTP 403 Forbidden response
- No changes persisted

**API Call**: `PATCH /api/v1/observations/[id]` (should fail)

---

#### Test 7: Cannot Edit Observation in Locked Audit
**Page**: `/observations/[id]`
**Prerequisites**: DRAFT observation in audit that is locked
**Steps**:
1. Navigate to `/observations/[id]`
2. Attempt to edit any field
3. Click "Save"

**Expected**:
- Save returns error: "Audit is locked. No modifications allowed."
- HTTP 403 Forbidden
- No changes saved
- Lock icon displayed on audit status

**API Call**: `PATCH /api/v1/observations/[id]` (should fail)

---

#### Test 8: Cannot Approve or Reject Observations
**Page**: `/observations/[id]`
**Prerequisites**: SUBMITTED observation
**Steps**:
1. Navigate to `/observations/[id]`
2. Look for "Approve" button
3. Look for "Reject" button
4. Directly call API: `POST /api/v1/observations/[id]/approve`

**Expected**:
- No "Approve" or "Reject" buttons visible in UI
- Direct API call returns 403 Forbidden
- Error message: "Forbidden"

**API Call**: `POST /api/v1/observations/[id]/approve` (should fail with 403)

---

#### Test 9: Cannot Delete Observations
**Page**: `/observations/[id]`
**Prerequisites**: Any observation
**Steps**:
1. Navigate to `/observations/[id]`
2. Look for "Delete" button
3. Directly call API: `DELETE /api/v1/observations/[id]`

**Expected**:
- No "Delete" button visible in UI
- Direct API call returns 403 Forbidden
- Error message: "Only CFO or Audit Head can delete observations"

**API Call**: `DELETE /api/v1/observations/[id]` (should fail with 403)

---

#### Test 10: Cannot Access Unassigned Observations
**Page**: `/observations/[id]`
**Prerequisites**: Observation exists in audit where auditor has NO AuditAssignment
**Steps**:
1. Get ID of observation in unassigned audit
2. Navigate to `/observations/[id]`
3. Observe response

**Expected**:
- Returns 404 Not Found (security through obscurity)
- Error message: "Not found"
- No data displayed

**API Call**: `GET /api/v1/observations/[id]` (should return 404)

---

### Priority: IMPORTANT (Should Pass)

#### Test 11: Upload Attachment to Observation
**Page**: `/observations/[id]`
**Prerequisites**: Observation in assigned audit
**Steps**:
1. Navigate to `/observations/[id]`
2. Click "Upload Attachment" button
3. Select file type: "ANNEXURE"
4. Choose file (e.g., test.pdf)
5. Upload file
6. Wait for success message
7. Verify attachment appears in list

**Expected**:
- File uploaded to S3 successfully
- Attachment record created with kind=ANNEXURE
- Attachment visible in observation detail
- Audit event logged for ATTACHMENT CREATE

**API Call**: `POST /api/v1/observations/[id]/attachments/presign` → S3 upload → `POST /api/v1/observations/[id]/attachments`

---

#### Test 12: Add Note to Observation
**Page**: `/observations/[id]`
**Prerequisites**: Observation in assigned audit
**Steps**:
1. Navigate to `/observations/[id]`
2. Scroll to notes section
3. Enter note text: "Discussed with plant manager on 2025-11-15"
4. Select visibility: "INTERNAL"
5. Click "Add Note"
6. Wait for note to appear

**Expected**:
- Note created with visibility=INTERNAL
- Note appears immediately in list
- Shows author name and timestamp
- Other auditors can see INTERNAL notes
- Auditees cannot see INTERNAL notes

**API Call**: `POST /api/v1/observations/[id]/notes`

---

#### Test 13: Export Observations to CSV
**Page**: `/observations`
**Prerequisites**: Logged in, has assigned observations
**Steps**:
1. Navigate to `/observations`
2. Apply filters: Plant = "Plant 1", Risk = "A"
3. Click "Export CSV"
4. Wait for download
5. Open CSV file
6. Verify data matches filters

**Expected**:
- CSV file downloads
- Contains only observations from assigned audits
- Filtered by Plant 1 and Risk A
- Includes all relevant fields
- Success toast appears

**API Call**: `GET /api/v1/observations/export?plantId=X&risk=A`

---

#### Test 14: Filter Observations by Multiple Criteria
**Page**: `/observations`
**Prerequisites**: Observations with various statuses, risks, plants
**Steps**:
1. Navigate to `/observations`
2. Set Plant filter: "Plant 2"
3. Set Risk filter: "B"
4. Set Status filter: "PENDING_MR"
5. Enter search text: "inventory"
6. Wait for results
7. Verify all results match all filters

**Expected**:
- Only observations matching ALL filters displayed
- Table updates without page refresh
- Result count updates
- Can reset filters with "Reset Filters" button

**API Call**: `GET /api/v1/observations?plantId=X&risk=B&status=PENDING_MR&q=inventory`

---

#### Test 15: View Audit Details
**Page**: `/audits/[id]`
**Prerequisites**: Assigned to "Plant 1 Audit"
**Steps**:
1. Navigate to `/audits`
2. Click "Open" on "Plant 1 Audit"
3. Verify audit details displayed:
   - Title, purpose, dates
   - Plant information
   - Assigned auditors
   - Observations count
   - Checklists (if any)

**Expected**:
- All audit details visible
- Cannot edit any fields
- No "Edit Audit" or "Lock" buttons visible
- Observations table shows observations for this audit only

**API Call**: `GET /api/v1/audits/[id]`

---

#### Test 16: Cannot Create or Edit Audits
**Page**: `/audits`
**Prerequisites**: Logged in as auditor
**Steps**:
1. Navigate to `/audits`
2. Look for "Create Audit" button
3. Navigate to `/audits/[id]`
4. Look for "Edit" button
5. Directly call API: `POST /api/v1/audits`

**Expected**:
- No "Create Audit" button visible
- No "Edit" button on audit detail page
- Direct API call returns 403 Forbidden
- Info message: "Only CFO and CXO team members can create new audits"

**API Call**: `POST /api/v1/audits` (should fail with 403)

---

#### Test 17: View Reports and Analytics
**Page**: `/reports`
**Prerequisites**: Observations exist in assigned audits
**Steps**:
1. Navigate to `/reports`
2. Wait for KPIs to load
3. View overview cards:
   - Total observations
   - Pending MR
   - Overdue actions
   - Due soon
4. Check approval breakdown
5. Check risk category breakdown
6. Verify data reflects only assigned audits

**Expected**:
- All KPIs display correctly
- Data filtered to assigned audits only
- Charts/metrics update based on filters
- Can adjust "Due window" days parameter

**API Call**: `GET /api/v1/reports/overview`, `GET /api/v1/reports/targets`

---

#### Test 18: Export Period Report
**Page**: `/reports`
**Prerequisites**: Logged in with observations
**Steps**:
1. Navigate to `/reports`
2. Set filters: Start Date = "2025-01-01", End Date = "2025-12-31"
3. Click "Download period report"
4. Wait for download
5. Open Excel file
6. Verify data matches date range

**Expected**:
- Excel file downloads
- Contains observations within date range
- Only from assigned audits
- Includes all observation fields
- Success toast appears

**API Call**: `GET /api/v1/reports/period/export?startDate=2025-01-01&endDate=2025-12-31`

---

#### Test 19: AI Assistant - Query Observations
**Page**: `/ai`
**Prerequisites**: Logged in, has observations
**Steps**:
1. Navigate to `/ai`
2. Wait for initial chat session creation
3. Type message: "How many draft observations do I have?"
4. Press Enter
5. Wait for AI response
6. Verify response accuracy

**Expected**:
- Chat session auto-created on first visit
- AI responds with count of DRAFT observations
- Only counts observations from assigned audits
- Tool card shows "Observations Count" with number
- Response respects AUDITOR role permissions

**API Call**: `POST /api/v1/ai/chat` (with tool: observations_count)

---

#### Test 20: AI Assistant - List Assigned Audits
**Page**: `/ai`
**Prerequisites**: Assigned to multiple audits
**Steps**:
1. Navigate to `/ai`
2. Type: "What audits am I assigned to?"
3. Wait for response
4. Verify audit list matches `/audits` page

**Expected**:
- AI lists only audits where user has AuditAssignment
- Shows audit titles, plants, status
- Tool card displays "Audits List"
- Data matches audits visible on `/audits` page

**API Call**: `POST /api/v1/ai/chat` (with tool: audits_list)

---

### Priority: NICE-TO-HAVE (Enhancement Tests)

#### Test 21: Real-time Updates via WebSocket
**Page**: `/observations/[id]`
**Prerequisites**: Two browser sessions, same observation
**Steps**:
1. Open observation in Session A (auditor)
2. Open same observation in Session B (audit head)
3. In Session B, update a field
4. Observe Session A without refreshing

**Expected**:
- Session A receives WebSocket notification
- UI updates automatically to reflect changes
- No manual refresh needed
- Toast notification appears: "Observation updated by [email]"

**API Call**: WebSocket connection to port 3001, receives `observation_updated` message

---

#### Test 22: Search Observations by Text
**Page**: `/observations`
**Prerequisites**: Observations with various text content
**Steps**:
1. Navigate to `/observations`
2. Enter search text: "safety"
3. Wait for results
4. Verify all results contain "safety" in observationText, risksInvolved, feedback, or response

**Expected**:
- Results filtered by text search (case-insensitive)
- Highlights matching terms (if implemented)
- Works with partial matches
- Combines with other filters

**API Call**: `GET /api/v1/observations?q=safety`

---

#### Test 23: Observation Edit After Rejection
**Page**: `/observations/[id]`
**Prerequisites**:
1. Observation was SUBMITTED
2. Audit head REJECTED it (approvalStatus=REJECTED)

**Steps**:
1. Navigate to `/observations/[id]`
2. Verify approvalStatus badge shows "REJECTED"
3. Edit observationText: "Fixed issues mentioned in rejection"
4. Click "Save"
5. Submit again

**Expected**:
- Fields are editable (REJECTED allows editing like DRAFT)
- Changes saved successfully
- Can re-submit for approval
- approvalStatus transitions REJECTED → SUBMITTED

**API Call**: `PATCH /api/v1/observations/[id]`, `POST /api/v1/observations/[id]/submit`

---

#### Test 24: Cannot Edit Auditee Fields
**Page**: `/observations/[id]`
**Prerequisites**: DRAFT observation
**Steps**:
1. Navigate to `/observations/[id]`
2. Attempt to edit `auditeeFeedback`
3. Attempt to edit `targetDate`
4. Attempt to edit `personResponsibleToImplement`
5. Click "Save"

**Expected**:
- Auditee fields are either disabled OR
- Save returns error: "No permitted fields to update"
- Only auditor fields can be edited
- HTTP 400 Bad Request if auditee fields attempted

**API Call**: `PATCH /api/v1/observations/[id]` (with auditee fields - should fail or ignore)

---

#### Test 25: View Audit Checklists
**Page**: `/audits/[id]`
**Prerequisites**: Audit has attached checklist
**Steps**:
1. Navigate to `/audits/[id]`
2. Scroll to checklists section
3. View checklist items
4. Check item statuses (PENDING/DONE)

**Expected**:
- Checklists displayed (if any)
- Can view items and status
- Cannot edit checklist (read-only for auditor)
- Shows progress: X of Y items done

**API Call**: Included in `GET /api/v1/audits/[id]`

---

#### Test 26: Cannot Lock or Unlock Audits
**Page**: `/audits/[id]`
**Prerequisites**: Unlocked audit
**Steps**:
1. Navigate to `/audits/[id]`
2. Look for "Lock" button
3. Directly call API: `POST /api/v1/audits/[id]/lock`

**Expected**:
- No "Lock" or "Unlock" button visible
- Direct API call returns 403 Forbidden
- Only CFO/CXO_TEAM can lock/unlock

**API Call**: `POST /api/v1/audits/[id]/lock` (should fail with 403)

---

#### Test 27: Cannot Access Admin Pages
**Page**: `/admin/users`
**Prerequisites**: Logged in as auditor
**Steps**:
1. Navigate to `/admin/users`
2. Observe response

**Expected**:
- Redirected to `/observations` or `/dashboard` OR
- Shows 403 Forbidden page
- No user management interface visible

**API Call**: Page access blocked at layout/middleware level

---

#### Test 28: Session Idle Timeout
**Page**: Any page
**Prerequisites**: Logged in
**Steps**:
1. Navigate to `/observations`
2. Do not interact for 15 minutes
3. Attempt to click "Create Observation"

**Expected**:
- After 15min idle, session expires
- Redirected to `/login` page
- Token marked as expired
- Must re-authenticate to continue

**API Call**: NextAuth session check fails after idle timeout

---

#### Test 29: Cannot Bulk Approve/Reject
**Page**: `/observations`
**Prerequisites**: Multiple SUBMITTED observations
**Steps**:
1. Navigate to `/observations`
2. Look for bulk action checkboxes
3. If visible, select multiple observations
4. Look for "Approve" or "Reject" buttons

**Expected**:
- Bulk action UI is either:
  - Not visible for AUDITOR, OR
  - Visible but "Approve"/"Reject" buttons disabled/hidden
- Only AUDIT_HEAD and CFO see approve/reject buttons
- AUDITOR sees checkboxes but no approval actions

**API Call**: N/A (UI-level restriction)

---

#### Test 30: View Plants List
**Page**: `/plants`
**Prerequisites**: Plants seeded in database
**Steps**:
1. Navigate to `/plants`
2. View plants table
3. Look for "Create Plant" button
4. Attempt to edit a plant

**Expected**:
- Plants list displayed (read-only)
- No "Create Plant" button visible
- Cannot edit plants
- Can view plant details

**API Call**: `GET /api/v1/plants`

---

## 5. Execution Plan

### 5.1 Test Credentials
```
Email: auditor@example.com
Password: auditor123
Role: AUDITOR
```

### 5.2 Data Dependencies

**Required Database State:**
1. **Audits**: At least 3 audits seeded:
   - Audit A: Auditor is assigned (via AuditAssignment)
   - Audit B: Auditor is assigned
   - Audit C: Auditor is NOT assigned (for negative testing)

2. **Observations**: Various states:
   - 2-3 DRAFT observations (auditor can edit)
   - 2-3 SUBMITTED observations (auditor cannot edit)
   - 1-2 APPROVED observations (auditor cannot edit)
   - 1-2 REJECTED observations (auditor can edit)
   - 1 observation in locked audit (auditor cannot edit)
   - 1 observation in unassigned audit (auditor cannot access)

3. **Plants**: At least 2-3 plants with different codes

4. **Users**:
   - 1 AUDITOR (test user)
   - 1 AUDIT_HEAD (for approval testing in separate session)
   - 1 CFO (for admin comparison)

5. **Attachments**: 1-2 observations with existing attachments

6. **Notes**: 1-2 observations with existing notes (INTERNAL and ALL visibility)

### 5.3 Seeding Command
```bash
npm run db:seed
```
This creates all necessary test data with default credentials.

### 5.4 Execution Order

**Phase 1: Authentication & Access (Tests 1-2)**
- Validate login, session management, role-based visibility

**Phase 2: Core Observation Operations (Tests 3-10)**
- Create, edit, submit observations
- Negative tests: Cannot approve, delete, edit after submission

**Phase 3: Attachments & Notes (Tests 11-12)**
- Upload files, add notes

**Phase 4: Filtering & Export (Tests 13-14)**
- Test search, filters, CSV export

**Phase 5: Audit Operations (Tests 15-16)**
- View audits, verify read-only access

**Phase 6: Reports & Analytics (Tests 17-18)**
- View reports, export period/retest reports

**Phase 7: AI Assistant (Tests 19-20)**
- Query observations, list audits

**Phase 8: Edge Cases & Advanced (Tests 21-30)**
- WebSocket, rejected observation editing, field restrictions, admin access denial

### 5.5 Success Criteria

**Must Pass (100% required):**
- All CRITICAL tests (1-10) must pass
- Login and session management works correctly
- Observation CRUD operations respect approval status
- Cannot approve/reject/delete observations
- Scope-based visibility (only assigned audits)
- Field-level restrictions enforced

**Should Pass (90%+ required):**
- All IMPORTANT tests (11-20) should pass
- Attachments and notes work correctly
- Exports generate correct data
- Reports show accurate metrics
- AI assistant respects role permissions

**Nice to Have (70%+ target):**
- NICE-TO-HAVE tests (21-30) mostly pass
- Real-time updates via WebSocket functional
- Edge cases handled gracefully
- Admin page access properly denied

### 5.6 Testing Tools

**Manual Testing:**
- Chrome/Firefox DevTools (Network tab for API calls)
- Playwright for browser automation (recommended)
- Multiple browser windows for WebSocket testing

**API Testing:**
- Thunder Client (VS Code extension)
- Postman
- curl commands

**Database Inspection:**
- Prisma Studio: `npx prisma studio`
- PostgreSQL client: `psql -U postgres -d audit_platform`

**Example Playwright Login:**
```typescript
await page.goto('http://localhost:3005/login');
await page.fill('input[name="email"]', 'auditor@example.com');
await page.fill('input[name="password"]', 'auditor123');
await page.click('button[type="submit"]');
await page.waitForURL(/^((?!\/login).)*$/); // Wait for redirect
```

### 5.7 Expected Test Duration

- **Full execution**: ~4-6 hours (manual)
- **Automated (Playwright)**: ~30-45 minutes
- **Critical tests only**: ~1-2 hours

---

## 6. Known Limitations & Special Notes

### 6.1 AUDITOR Behavioral Notes

1. **Assignment-Based Access**: Auditors ONLY see data from audits where they have an `AuditAssignment` record linking `auditId` to their `userId`.

2. **Status-Based Editing**: Observations can ONLY be edited when `approvalStatus` is `DRAFT` or `REJECTED`. Once `SUBMITTED` or `APPROVED`, auditors cannot modify.

3. **Field Lock System**: Individual fields can be locked (stored in `lockedFields` JSON). Auditors cannot edit locked fields even in DRAFT status (unless they are CFO).

4. **Audit Lock Cascade**: If an audit is locked (`audit.isLocked = true`), ALL observations in that audit become read-only for auditors.

5. **Scope vs Role**: AUDITOR is a role, not a scope. Guest users have scope-based restrictions. Auditors have assignment-based restrictions.

6. **AI Assistant Access**: Auditors CAN use AI assistant (unlike AUDITEE/GUEST who are blocked). AI tools automatically filter results to assigned audits only.

7. **WebSocket Authentication**: WebSocket connection requires JWT token from `/api/v1/websocket/token`. Token embedded in connection URL as query param.

### 6.2 Testing Gotchas

1. **Browser-Based Auth**: NextAuth v5 requires UI-based login. Cannot use `curl` to authenticate. Must use Playwright or manual browser.

2. **Session Persistence**: Sessions stored in JWT. Check `NEXTAUTH_SECRET` is set in `.env`.

3. **Database Reset**: Between test runs, may need to reset database:
   ```bash
   npx prisma migrate reset
   npm run db:seed
   ```

4. **Port Conflicts**:
   - Next.js: port 3005 (dev) / 3000 (prod)
   - WebSocket: port 3001
   - PostgreSQL: port 5432

5. **Docker Dependency**: PostgreSQL runs in Docker container `audit-postgres`. Must start before testing:
   ```bash
   docker start audit-postgres
   ```

6. **File Upload Testing**: S3 attachments require AWS credentials in `.env`. If missing, use local file simulation or mock S3.

7. **Checklist Module**: Currently disabled/placeholder. Don't test checklist creation/editing.

---

## 7. Test Execution Checklist

- [ ] Database is running (`docker start audit-postgres`)
- [ ] Database is seeded (`npm run db:seed`)
- [ ] Next.js dev server is running (`npm run dev` on port 3005)
- [ ] WebSocket server is running (`npm run ws:dev` on port 3001)
- [ ] Environment variables are set (`.env` file exists)
- [ ] Test credentials verified (can login as auditor@example.com)
- [ ] Browser DevTools open (Network tab)
- [ ] Playwright installed (if using automation)
- [ ] Test data verified in Prisma Studio
- [ ] Session timeout settings noted (15min idle, 24h absolute)

---

## 8. Bug Reporting Template

```markdown
**Test Case**: Test X - [Test Name]
**Priority**: CRITICAL / IMPORTANT / NICE-TO-HAVE
**Status**: FAIL

**Actual Behavior**:
[Describe what actually happened]

**Expected Behavior**:
[From test scenario]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**API Response** (if applicable):
```json
{
  "error": "...",
  "status": 403
}
```

**Screenshots**:
[Attach if UI issue]

**Console Errors**:
[Browser console output]

**Environment**:
- Browser: Chrome 120
- OS: macOS 14.1
- Database: audit_platform (seeded)
- Branch: main
- Commit: [hash]
```

---

## 9. Additional Resources

- **RBAC Documentation**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac.ts`
- **API Routes**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/`
- **Database Schema**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/prisma/schema.prisma`
- **Project Guide**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/CLAUDE.md`
- **Deployment Guide**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/DEPLOYMENT.md`

---

**End of Testing Plan**
