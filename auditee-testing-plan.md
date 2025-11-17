# AUDITEE Role - Comprehensive Testing Plan

## Document Information
- **Role Under Test**: AUDITEE
- **Test Credentials**: auditee@example.com / auditee123
- **Application**: Audit Platform (Next.js 15 + Prisma + PostgreSQL)
- **Testing Date**: Generated on 2025-11-17
- **Document Version**: 1.0

---

## 1. Role Capabilities Summary

### 1.1 Core Permissions (RBAC v2)
Based on analysis of `src/lib/rbac.ts`, the AUDITEE role has the following characteristics:

**Role Definition**:
```typescript
// From prisma/schema.prisma
enum Role {
  AUDITEE // Assigned to observations, edits designated fields only
}
```

**Key Capabilities**:
- ✅ **Assignment-Based Access**: Can ONLY access observations where they have an `ObservationAssignment` record
- ✅ **Limited Field Editing**: Can edit exactly 3 fields in assigned observations:
  - `auditeePersonTier1` - Auditee Person (Tier 1)
  - `auditeePersonTier2` - Auditee Person (Tier 2)
  - `auditeeFeedback` - Auditee Feedback
- ✅ **Read-Only Access**: Can view all other observation fields (read-only)
- ✅ **Action Plans**: Can create action plans for assigned observations
- ✅ **Notes**: Can post notes (visibility: "ALL" only, cannot set "INTERNAL")
- ✅ **Attachments**: Can view attachments on assigned observations

**Key Restrictions**:
- ❌ **Cannot** edit auditor fields (observationText, risksInvolved, riskCategory, etc.)
- ❌ **Cannot** edit observation status (currentStatus)
- ❌ **Cannot** approve/reject/submit observations
- ❌ **Cannot** delete observations
- ❌ **Cannot** create new observations
- ❌ **Cannot** access audits pages
- ❌ **Cannot** access AI assistant
- ❌ **Cannot** access admin pages
- ❌ **Cannot** access plants pages
- ❌ **Cannot** access reports pages
- ❌ **Cannot** lock/unlock fields
- ❌ **Cannot** publish/unpublish observations
- ❌ **Cannot** assign/remove auditees
- ❌ **Cannot** request changes
- ❌ **Cannot** edit when audit is locked

### 1.2 Special Behaviors

**Auto-Transition Logic**:
```typescript
// From src/app/api/v1/observations/[id]/route.ts (line 294-296)
// When auditee provides feedback and status is PENDING_MR,
// status automatically changes to MR_UNDER_REVIEW
if (isAuditee(role) && data.auditeeFeedback && orig.currentStatus === "PENDING_MR") {
  data.currentStatus = "MR_UNDER_REVIEW";
}
```

**Scope-Based Filtering**:
- AUDITEE can access observations ONLY through `ObservationAssignment` table
- No scope-based restrictions (unlike GUEST role)
- Access is purely assignment-driven

**Notes Visibility**:
- Auditees can only see notes with `visibility: "ALL"`
- Cannot see "INTERNAL" notes
- All notes created by auditees are forced to `visibility: "ALL"`

---

## 2. Accessible Pages

Based on analysis of `src/components/v2/AppSidebar.tsx` and dashboard structure:

### 2.1 Main Navigation (Visible to AUDITEE)

| Page | URL | Visible in Sidebar | Access Level |
|------|-----|-------------------|--------------|
| **Dashboard** | `/dashboard` | ✅ Yes | Full Access |
| **Observations** | `/observations` | ✅ Yes | Filtered (assigned only) |
| **Observation Detail** | `/observations/[id]` | N/A | Conditional (if assigned) |

### 2.2 Sidebar Configuration
```typescript
// From src/components/v2/AppSidebar.tsx
const mainItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    visible: true, // VISIBLE TO AUDITEE
  },
  {
    id: "audits",
    label: "Audits",
    href: "/audits",
    icon: ClipboardList,
    visible: !!role && !isAuditee(role), // HIDDEN FROM AUDITEE
  },
  {
    id: "observations",
    label: "Observations",
    href: "/observations",
    icon: Eye,
    visible: true, // VISIBLE TO AUDITEE
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: FileText,
    visible: !!role && (isCFOOrCXOTeam(role) || isAuditHead(role)), // HIDDEN FROM AUDITEE
  },
];

const toolsItems: NavItem[] = [
  {
    id: "ai",
    label: "AI Assistant",
    href: "/ai",
    icon: MessageSquare,
    visible: !!role && !isAuditee(role) && !isGuest(role), // HIDDEN FROM AUDITEE
  },
];
```

---

## 3. Inaccessible Pages

The following pages are NOT accessible to AUDITEE role:

### 3.1 Hidden from Navigation
- ❌ `/plants` - Plants management (CFO/CXO_TEAM only)
- ❌ `/audits` - Audits list and details (all except AUDITEE)
- ❌ `/reports` - Reports dashboard (CFO/CXO_TEAM/AUDIT_HEAD only)
- ❌ `/ai` - **AI Assistant** (redirects to `/observations` - see `src/app/(dashboard)/ai/page.tsx:43-51`)
- ❌ `/admin/users` - User management (CFO/CXO_TEAM only)
- ❌ `/admin/import` - Import functionality (CFO only)

### 3.2 AI Assistant Redirect Logic
```typescript
// From src/app/(dashboard)/ai/page.tsx (line 43-51)
// Block Auditee and Guest roles from accessing AI Assistant
useEffect(() => {
  if (sessionStatus === "authenticated" && session?.user) {
    const role = session.user.role;
    if (role === "AUDITEE" || role === "GUEST") {
      router.push("/observations"); // Redirect to observations page
    }
  }
}, [sessionStatus, session, router]);
```

### 3.3 API Endpoint Access Restrictions

**Observations API** (`/api/v1/observations/[id]`):
- GET: Can access only assigned observations
- PATCH: Can edit only 3 auditee fields
- DELETE: 403 Forbidden

**Other Restricted APIs**:
- `/api/v1/observations/[id]/approve` - 403 Forbidden
- `/api/v1/observations/[id]/reject` - 403 Forbidden
- `/api/v1/observations/[id]/submit` - 403 Forbidden
- `/api/v1/observations/[id]/publish` - 403 Forbidden
- `/api/v1/observations/[id]/locks` - 403 Forbidden
- `/api/v1/observations/[id]/assign-auditee` - 403 Forbidden
- `/api/v1/observations/[id]/change-requests` - 403 Forbidden
- `/api/v1/audits/*` - 403 Forbidden
- `/api/v1/plants/*` - 403 Forbidden
- `/api/v1/reports/*` - 403 Forbidden
- `/api/v1/ai/*` - 403 Forbidden

---

## 4. Operation Matrix

### 4.1 Dashboard Page (`/dashboard`)

| Operation | UI Element | API Endpoint | Prerequisites | AUDITEE Access |
|-----------|-----------|--------------|---------------|----------------|
| View Dashboard | Dashboard page load | N/A | Logged in | ✅ Full Access |
| View Statistics | Dashboard cards/charts | Various GET endpoints | N/A | ✅ Limited data |

### 4.2 Observations List Page (`/observations`)

| Operation | UI Element | API Endpoint | Prerequisites | AUDITEE Access |
|-----------|-----------|--------------|---------------|----------------|
| View Observations List | Table/Grid | `GET /api/v1/observations` | Logged in | ✅ Filtered (assigned only) |
| Filter by Plant | Dropdown | `GET /api/v1/observations?plantId=X` | Observations exist | ✅ Filtered results |
| Filter by Audit | Dropdown | `GET /api/v1/observations?auditId=X` | Observations exist | ✅ Filtered results |
| Filter by Risk | Dropdown | `GET /api/v1/observations?risk=X` | Observations exist | ✅ Filtered results |
| Search Observations | Search input | `GET /api/v1/observations?q=X` | Observations exist | ✅ Filtered results |
| Create Observation | "Create" button | N/A | N/A | ❌ Button hidden |
| Bulk Approve | Checkbox + Button | N/A | N/A | ❌ Hidden |
| Bulk Reject | Checkbox + Button | N/A | N/A | ❌ Hidden |
| Bulk Publish | Checkbox + Button | N/A | N/A | ❌ Hidden |

**API Filtering Logic**:
```typescript
// From src/app/api/v1/observations/route.ts (line 127-136)
// AUDITEE can see only observations they're assigned to via ObservationAssignment
else if (isAuditee(session.user.role)) {
  const auditeeFilter: Prisma.ObservationWhereInput = {
    assignments: {
      some: {
        auditeeId: session.user.id
      }
    }
  };
  where = { AND: [where, auditeeFilter] };
}
```

### 4.3 Observation Detail Page (`/observations/[id]`)

#### 4.3.1 Read Operations

| Operation | UI Element | API Endpoint | Prerequisites | AUDITEE Access |
|-----------|-----------|--------------|---------------|----------------|
| View Observation | Page load | `GET /api/v1/observations/[id]` | Assigned to observation | ✅ Full read access |
| View Attachments | Attachments section | Included in observation | Assigned to observation | ✅ Read-only |
| View Notes (ALL) | Notes section | `GET /api/v1/observations/[id]/notes` | Assigned to observation | ✅ Only "ALL" visibility |
| View Action Plans | Action plans section | `GET /api/v1/observations/[id]/actions` | Assigned to observation | ✅ Read-only |
| View Approvals | Approvals section | Included in observation | Assigned to observation | ✅ Read-only |
| View Assignments | Assignments section | Included in observation | Assigned to observation | ✅ Read-only |

#### 4.3.2 Write Operations (Allowed)

| Operation | UI Element | API Endpoint | Prerequisites | AUDITEE Access | Notes |
|-----------|-----------|--------------|---------------|----------------|-------|
| Edit Auditee Person Tier 1 | Text input | `PATCH /api/v1/observations/[id]` | Assigned + audit not locked | ✅ Yes | Field: `auditeePersonTier1` |
| Edit Auditee Person Tier 2 | Text input | `PATCH /api/v1/observations/[id]` | Assigned + audit not locked | ✅ Yes | Field: `auditeePersonTier2` |
| Edit Auditee Feedback | Textarea | `PATCH /api/v1/observations/[id]` | Assigned + audit not locked | ✅ Yes | Field: `auditeeFeedback` |
| Create Action Plan | "Add Action Plan" button | `POST /api/v1/observations/[id]/actions` | Assigned to observation | ✅ Yes | Cannot set `retest` field |
| Post Note | Note input + Submit | `POST /api/v1/observations/[id]/notes` | Assigned to observation | ✅ Yes | Visibility forced to "ALL" |

**API Field-Level Permissions**:
```typescript
// From src/app/api/v1/observations/[id]/route.ts (line 39-46)
const AUDITEE_FIELDS = new Set([
  "auditeePersonTier1",
  "auditeePersonTier2",
  "auditeeFeedback",
  "targetDate",
  "personResponsibleToImplement"
  // NOTE: currentStatus is NOT editable by auditees - handled separately
]);

// From UI: src/app/(dashboard)/observations/[id]/page.tsx (line 76-80)
const AUDITEE_EDITABLE_FIELDS = new Set([
  "auditeePersonTier1",
  "auditeePersonTier2",
  "auditeeFeedback"
]);
```

**Note**: The API allows 5 fields but UI only exposes 3 for editing. `targetDate` and `personResponsibleToImplement` are not shown as editable in the current UI.

#### 4.3.3 Write Operations (Blocked)

| Operation | UI Element | API Endpoint | AUDITEE Access | Error |
|-----------|-----------|--------------|----------------|-------|
| Edit Observation Text | Textarea (disabled) | N/A | ❌ Field disabled | N/A |
| Edit Risks Involved | Textarea (disabled) | N/A | ❌ Field disabled | N/A |
| Edit Risk Category | Dropdown (disabled) | N/A | ❌ Field disabled | N/A |
| Edit Concerned Process | Dropdown (disabled) | N/A | ❌ Field disabled | N/A |
| Edit Current Status | Dropdown (disabled) | N/A | ❌ Field disabled | N/A |
| Submit for Approval | Button (hidden) | N/A | ❌ Not visible | N/A |
| Approve | Button (hidden) | N/A | ❌ Not visible | N/A |
| Reject | Button (hidden) | N/A | ❌ Not visible | N/A |
| Delete | Button (hidden) | N/A | ❌ Not visible | N/A |
| Publish/Unpublish | Button (hidden) | N/A | ❌ Not visible | N/A |
| Lock/Unlock Fields | Button (hidden) | N/A | ❌ Not visible | N/A |
| Assign Auditee | Button (hidden) | N/A | ❌ Not visible | N/A |
| Remove Auditee | Button (hidden) | N/A | ❌ Not visible | N/A |
| Upload Attachments | File input (hidden) | N/A | ❌ Not visible | N/A |
| Request Change | Button (hidden) | N/A | ❌ Not visible | N/A |

### 4.4 WebSocket Real-Time Updates

| Operation | Trigger | AUDITEE Access |
|-----------|---------|----------------|
| Connect to WebSocket | Page load | ✅ Yes |
| Join observation room | `/observations/[id]` page load | ✅ Yes (if assigned) |
| Receive observation updates | Other users edit observation | ✅ Yes |
| Receive presence updates | Other users join/leave room | ✅ Yes |

---

## 5. Test Scenarios

### Priority Legend
- 🔴 **Critical** - Core functionality, must pass
- 🟡 **Important** - Key features, should pass
- 🟢 **Nice-to-have** - Enhanced UX, can defer

---

### 5.1 Authentication & Access Control

#### Test Case 1.1: Login with AUDITEE Credentials (🔴 Critical)
**Page**: `/login`
**Prerequisites**:
- Database seeded with `npm run db:seed`
- AUDITEE user exists: `auditee@example.com / auditee123`

**Steps**:
1. Navigate to `/login`
2. Enter email: `auditee@example.com`
3. Enter password: `auditee123`
4. Click "Sign In" button
5. Wait for redirect

**Expected**:
- Login succeeds
- Redirects to `/dashboard`
- User sees "AUDITEE" role badge in header
- Email `auditee@example.com` displayed in header

**API Call**: `POST /api/auth/callback/credentials`

---

#### Test Case 1.2: Verify Dashboard Navigation Visibility (🔴 Critical)
**Page**: `/dashboard`
**Prerequisites**: Logged in as AUDITEE

**Steps**:
1. Verify sidebar navigation items
2. Check which menu items are visible
3. Attempt to click on visible items

**Expected**:
- **Visible**: Dashboard, Observations
- **Hidden**: Plants, Audits, Reports, AI Assistant, Admin
- Clicking "Dashboard" navigates to `/dashboard`
- Clicking "Observations" navigates to `/observations`

**API Call**: N/A (UI-only check)

---

#### Test Case 1.3: AI Assistant Redirect Protection (🔴 Critical)
**Page**: `/ai`
**Prerequisites**: Logged in as AUDITEE

**Steps**:
1. Manually navigate to `/ai` (type in address bar or bookmark)
2. Observe redirect behavior

**Expected**:
- Page immediately redirects to `/observations`
- No AI chat interface is shown
- Toast/notification may appear (optional)

**API Call**: N/A (client-side redirect)

---

### 5.2 Observations List Access

#### Test Case 2.1: View Assigned Observations Only (🔴 Critical)
**Page**: `/observations`
**Prerequisites**:
- Logged in as AUDITEE
- AUDITEE has ObservationAssignment records for at least 2 observations
- Database has observations NOT assigned to AUDITEE

**Steps**:
1. Navigate to `/observations`
2. Count the observations displayed in the list
3. Note the observation IDs shown
4. Verify against database using:
   ```sql
   SELECT observationId FROM "ObservationAssignment" WHERE auditeeId = '<auditee-user-id>';
   ```

**Expected**:
- Only observations with ObservationAssignment records for this AUDITEE are shown
- Observations NOT assigned to AUDITEE are NOT visible
- Each row shows plant name, risk category, status, etc.
- No "Create Observation" button visible

**API Call**: `GET /api/v1/observations`

---

#### Test Case 2.2: Filter Observations by Plant (🟡 Important)
**Page**: `/observations`
**Prerequisites**:
- Logged in as AUDITEE
- AUDITEE has observations from multiple plants

**Steps**:
1. Navigate to `/observations`
2. Note the total count of observations
3. Open "Plant" filter dropdown
4. Select a specific plant (e.g., "Plant ABC")
5. Verify filtered results

**Expected**:
- Dropdown shows only plants that have observations assigned to AUDITEE
- Selecting a plant filters the list
- Only observations from the selected plant are shown
- All shown observations must still be assigned to AUDITEE

**API Call**: `GET /api/v1/observations?plantId=<plant-id>`

---

#### Test Case 2.3: Search Observations by Text (🟡 Important)
**Page**: `/observations`
**Prerequisites**:
- Logged in as AUDITEE
- AUDITEE has observations with searchable text

**Steps**:
1. Navigate to `/observations`
2. Enter search term in search box (e.g., "safety")
3. Press Enter or click search button
4. Verify results match search term

**Expected**:
- Search filters observations by:
  - Observation text
  - Risks involved
  - Auditee feedback
  - Auditor response
- Only assigned observations matching search appear
- Search is case-insensitive

**API Call**: `GET /api/v1/observations?q=safety`

---

#### Test Case 2.4: Verify No Bulk Actions Visible (🔴 Critical)
**Page**: `/observations`
**Prerequisites**: Logged in as AUDITEE

**Steps**:
1. Navigate to `/observations`
2. Inspect the page for bulk action buttons
3. Look for checkboxes on observation rows

**Expected**:
- No checkboxes for selecting observations
- No "Bulk Approve" button
- No "Bulk Reject" button
- No "Bulk Publish" button
- No "Select All" checkbox

**API Call**: N/A (UI-only check)

---

### 5.3 Observation Detail - Read Operations

#### Test Case 3.1: Access Assigned Observation (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- AUDITEE has ObservationAssignment for observation ID `obs-123`

**Steps**:
1. Navigate to `/observations/obs-123`
2. Verify page loads successfully
3. Inspect all visible sections

**Expected**:
- Page loads successfully (HTTP 200)
- All observation fields are visible
- Plant name, audit details visible
- Attachments section visible (if any)
- Notes section visible (only "ALL" visibility notes)
- Action plans section visible
- Approvals section visible
- Assignments section visible (shows assigned auditees)

**API Call**: `GET /api/v1/observations/obs-123`

---

#### Test Case 3.2: Blocked Access to Non-Assigned Observation (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Observation ID `obs-456` exists but AUDITEE has NO ObservationAssignment

**Steps**:
1. Manually navigate to `/observations/obs-456` (type in address bar)
2. Observe the response

**Expected**:
- HTTP 404 Not Found response
- Error message: "Not found" or similar
- No observation data displayed
- User remains on error page or redirects

**API Call**: `GET /api/v1/observations/obs-456` (returns 404)

---

#### Test Case 3.3: View Notes with Visibility Filtering (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Observation has notes with both "INTERNAL" and "ALL" visibility

**Steps**:
1. Navigate to assigned observation detail page
2. Scroll to "Notes" section
3. Count the notes displayed
4. Verify against database:
   ```sql
   SELECT * FROM "RunningNote" WHERE observationId = '<obs-id>' AND visibility = 'ALL';
   ```

**Expected**:
- Only notes with `visibility: "ALL"` are shown
- Notes with `visibility: "INTERNAL"` are NOT visible
- Each note shows author name/email and timestamp
- Notes are ordered by creation time (oldest first)

**API Call**: `GET /api/v1/observations/[id]/notes` (filtered by visibility)

---

### 5.4 Observation Detail - Write Operations (Allowed)

#### Test Case 4.1: Edit Auditee Person Tier 1 Field (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Assigned to observation
- Audit is NOT locked

**Steps**:
1. Navigate to assigned observation detail page
2. Locate "Auditee Person (Tier 1)" input field
3. Verify field is NOT disabled
4. Clear existing value (if any)
5. Enter new value: "John Doe - Finance Manager"
6. Click "Save" button
7. Wait for success message

**Expected**:
- Field is editable (not disabled)
- Text can be entered
- "Save" button is enabled
- After save:
  - Success toast: "Observation saved successfully!"
  - Field value updates to "John Doe - Finance Manager"
  - Page refreshes with updated data

**API Call**: `PATCH /api/v1/observations/[id]`
**Request Body**:
```json
{
  "auditeePersonTier1": "John Doe - Finance Manager"
}
```

---

#### Test Case 4.2: Edit Auditee Person Tier 2 Field (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**: Same as Test Case 4.1

**Steps**:
1. Navigate to assigned observation detail page
2. Locate "Auditee Person (Tier 2)" input field
3. Enter new value: "Jane Smith - Assistant Manager"
4. Click "Save" button

**Expected**:
- Field is editable
- Save succeeds
- Success toast appears
- Field value persists after refresh

**API Call**: `PATCH /api/v1/observations/[id]`
**Request Body**:
```json
{
  "auditeePersonTier2": "Jane Smith - Assistant Manager"
}
```

---

#### Test Case 4.3: Edit Auditee Feedback Field (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**: Same as Test Case 4.1

**Steps**:
1. Navigate to assigned observation detail page
2. Locate "Auditee Feedback" textarea
3. Enter multiline feedback:
   ```
   We have reviewed the observation.
   Corrective actions will be implemented by Q1 2025.
   Please see attached action plan.
   ```
4. Click "Save" button
5. Verify save succeeds

**Expected**:
- Textarea is editable
- Can enter multiple lines
- Save succeeds
- Success toast appears
- Feedback persists after refresh
- Multiline formatting preserved

**API Call**: `PATCH /api/v1/observations/[id]`
**Request Body**:
```json
{
  "auditeeFeedback": "We have reviewed the observation.\nCorrective actions will be implemented by Q1 2025.\nPlease see attached action plan."
}
```

---

#### Test Case 4.4: Auto-Transition Status on Feedback Submission (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Assigned to observation
- Observation `currentStatus` is "PENDING_MR"

**Steps**:
1. Navigate to observation with status "PENDING_MR"
2. Note the current status badge shows "Pending MR"
3. Enter auditee feedback in feedback field
4. Click "Save" button
5. Wait for page to refresh
6. Check the "Current Status" field

**Expected**:
- Before save: Status shows "PENDING_MR" / "Pending MR"
- After save: Status auto-transitions to "MR_UNDER_REVIEW" / "MR Under Review"
- This happens automatically when auditee provides feedback
- No manual status change required

**API Call**: `PATCH /api/v1/observations/[id]`
**Server Logic** (from `src/app/api/v1/observations/[id]/route.ts:294-296`):
```typescript
if (isAuditee(role) && data.auditeeFeedback && orig.currentStatus === "PENDING_MR") {
  data.currentStatus = "MR_UNDER_REVIEW";
}
```

---

#### Test Case 4.5: Create Action Plan (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Assigned to observation

**Steps**:
1. Navigate to assigned observation detail page
2. Scroll to "Action Plans" section
3. Click "Add Action Plan" button (if visible)
4. Fill in action plan form:
   - Plan: "Implement new safety protocols"
   - Owner: "Safety Team"
   - Target Date: "2025-03-31"
   - Status: "In Progress"
5. Submit the form
6. Verify action plan appears in list

**Expected**:
- "Add Action Plan" button is visible to AUDITEE
- Form opens in dialog/modal
- All fields can be filled
- "Retest" field is NOT available to AUDITEE (hidden or disabled)
- After submission:
  - Success toast appears
  - New action plan appears in list with entered details
  - Status shows "In Progress"

**API Call**: `POST /api/v1/observations/[id]/actions`
**Request Body**:
```json
{
  "plan": "Implement new safety protocols",
  "owner": "Safety Team",
  "targetDate": "2025-03-31T00:00:00.000Z",
  "status": "In Progress"
}
```

**Note**: AUDITEE cannot set `retest` field (enforced by API at line 100-102)

---

#### Test Case 4.6: Post Note on Observation (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Assigned to observation

**Steps**:
1. Navigate to assigned observation detail page
2. Scroll to "Notes" section
3. Locate note input field
4. Enter note text: "Reviewed the observation. We will provide feedback by EOD."
5. Click "Submit" or "Send" button
6. Verify note appears in list

**Expected**:
- Note input field is visible to AUDITEE
- Can type multiline text
- After submission:
  - Note appears in notes list
  - Note shows AUDITEE's name/email as author
  - Note timestamp is current time
  - Visibility is automatically set to "ALL" (no option to set "INTERNAL")

**API Call**: `POST /api/v1/observations/[id]/notes`
**Request Body**:
```json
{
  "text": "Reviewed the observation. We will provide feedback by EOD.",
  "visibility": "ALL"
}
```

**Server Logic**: Visibility is forced to "ALL" for AUDITEE (line 80-81)

---

### 5.5 Observation Detail - Write Operations (Blocked)

#### Test Case 5.1: Cannot Edit Observation Text (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Assigned to observation

**Steps**:
1. Navigate to assigned observation detail page
2. Locate "Observation Text" field
3. Attempt to click/focus on the field
4. Attempt to type

**Expected**:
- Field is visible but DISABLED (grayed out)
- Cannot focus or edit the field
- Field has disabled styling (lighter background, grayed text)
- No cursor appears when clicking

**API Call**: N/A (UI prevents interaction)
**If attempted via API**: 403 Forbidden

---

#### Test Case 5.2: Cannot Edit Risk Category (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**: Same as Test Case 5.1

**Steps**:
1. Locate "Risk Category" dropdown
2. Attempt to click the dropdown
3. Verify it's disabled

**Expected**:
- Dropdown is disabled
- Cannot open dropdown menu
- Shows current value (A/B/C) but cannot change

**API Call**: N/A (UI prevents interaction)

---

#### Test Case 5.3: Cannot Edit Current Status (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**: Same as Test Case 5.1

**Steps**:
1. Locate "Current Status" dropdown
2. Attempt to change the status
3. Verify it's disabled

**Expected**:
- Status dropdown/field is disabled
- Cannot change status manually
- Status can only change via auto-transition (when providing feedback)

**API Call**: N/A (UI prevents interaction)

---

#### Test Case 5.4: Save Button Disabled When Not Assigned (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Somehow viewing observation detail page (edge case testing)
- AUDITEE is NOT assigned via ObservationAssignment

**Steps**:
1. Navigate to observation (if possible through direct URL)
2. Locate "Save" button
3. Check button state

**Expected**:
- "Save" button is disabled
- Cannot click to save
- May show tooltip: "You are not assigned to this observation"

**UI Logic** (from `src/app/(dashboard)/observations/[id]/page.tsx:786`):
```typescript
disabled={isAuditee(role) ? (!o.assignments?.some(a => a.auditee.id === userId) || o.audit?.isLocked) : isFieldDisabled("observationText")}
```

---

#### Test Case 5.5: Cannot Edit When Audit is Locked (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Assigned to observation
- Audit has `isLocked: true`

**Steps**:
1. Navigate to observation detail page
2. Attempt to edit "Auditee Person Tier 1"
3. Attempt to save

**Expected**:
- All AUDITEE editable fields are disabled
- "Save" button is disabled
- Cannot make any changes
- May show message: "Audit is locked. No modifications allowed."

**API Call**: If attempted, returns 403 Forbidden
**Response**:
```json
{
  "ok": false,
  "error": "Audit is locked. No modifications allowed."
}
```

---

#### Test Case 5.6: Verify No Approval Buttons Visible (🔴 Critical)
**Page**: `/observations/[id]`
**Prerequisites**: Logged in as AUDITEE

**Steps**:
1. Navigate to assigned observation
2. Scan the page for action buttons
3. Check header, footer, and action sections

**Expected**:
- **NO "Submit for Approval" button**
- **NO "Approve" button**
- **NO "Reject" button**
- **NO "Delete" button**
- **NO "Publish/Unpublish" button**
- **NO "Lock/Unlock Fields" button**
- **NO "Assign Auditee" button**
- **NO "Request Change" button**
- Only visible: "Save" button (for auditee fields)

**API Call**: N/A (UI-only check)

---

### 5.6 Edge Cases & Error Handling

#### Test Case 6.1: Attempt to Access Non-Existent Observation (🟡 Important)
**Page**: `/observations/invalid-id-999`
**Prerequisites**: Logged in as AUDITEE

**Steps**:
1. Navigate to `/observations/invalid-id-999`
2. Observe response

**Expected**:
- HTTP 404 Not Found
- Error message displayed
- No observation data shown

**API Call**: `GET /api/v1/observations/invalid-id-999` (returns 404)

---

#### Test Case 6.2: Save Empty Values in Auditee Fields (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Assigned to observation

**Steps**:
1. Clear all 3 auditee fields (Tier1, Tier2, Feedback)
2. Click "Save"
3. Verify behavior

**Expected**:
- Save succeeds (empty values are allowed)
- Fields are saved as empty/null
- No validation errors
- Success toast appears

**API Call**: `PATCH /api/v1/observations/[id]`
**Request Body**:
```json
{
  "auditeePersonTier1": "",
  "auditeePersonTier2": "",
  "auditeeFeedback": ""
}
```

---

#### Test Case 6.3: Session Timeout During Edit (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- Wait for session to timeout (15 min idle by default)

**Steps**:
1. Navigate to observation detail page
2. Wait for idle timeout (15 minutes of inactivity)
3. Attempt to edit a field
4. Attempt to save

**Expected**:
- After timeout, save attempt fails
- HTTP 401 Unauthorized response
- User is redirected to `/login`
- Toast message: "Session expired. Please log in again."

**API Call**: `PATCH /api/v1/observations/[id]` (returns 401)

---

#### Test Case 6.4: Concurrent Edit Conflict (🟢 Nice-to-have)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE (browser A)
- Same observation open as AUDITOR (browser B)

**Steps**:
1. AUDITEE edits "Auditee Feedback" in browser A
2. AUDITOR edits "Observation Text" in browser B
3. AUDITEE clicks "Save" in browser A
4. AUDITOR clicks "Save" in browser B
5. Observe WebSocket updates

**Expected**:
- Both saves succeed (different fields)
- WebSocket real-time update notifies both users
- AUDITEE sees AUDITOR's changes reflected
- AUDITOR sees AUDITEE's changes reflected
- No data loss or conflict errors

**API Calls**:
- `PATCH /api/v1/observations/[id]` (from both browsers)
- WebSocket broadcasts update to all connected clients

---

#### Test Case 6.5: Field Lock Applied by Auditor (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE
- AUDITOR has locked "auditeeFeedback" field

**Steps**:
1. Navigate to observation detail page
2. Locate "Auditee Feedback" field
3. Attempt to edit and save

**Expected**:
- Field shows locked icon/indicator (orange border)
- Field is disabled (cannot edit)
- If somehow attempted via API, returns 403:
  ```json
  {
    "ok": false,
    "error": "Field \"auditeeFeedback\" is locked"
  }
  ```

**API Call**: If attempted, `PATCH /api/v1/observations/[id]` returns 403

---

### 5.7 WebSocket Real-Time Features

#### Test Case 7.1: Receive Real-Time Updates (🟡 Important)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE (browser A)
- Same observation open as AUDITOR (browser B)

**Steps**:
1. AUDITEE opens observation in browser A
2. AUDITOR opens same observation in browser B
3. AUDITOR edits "Risk Category" and saves
4. Observe browser A (AUDITEE)

**Expected**:
- AUDITEE sees real-time update without page refresh
- "Risk Category" field updates to new value
- WebSocket connection status shows "Connected"
- No manual refresh needed

**WebSocket Message**:
```json
{
  "type": "observation_updated",
  "observationId": "obs-123",
  "fields": ["riskCategory"],
  "updatedBy": "auditor@example.com"
}
```

---

#### Test Case 7.2: Presence Detection (🟢 Nice-to-have)
**Page**: `/observations/[id]`
**Prerequisites**:
- Logged in as AUDITEE (browser A)
- AUDITOR joins same observation (browser B)

**Steps**:
1. AUDITEE opens observation
2. AUDITOR opens same observation
3. Check for presence indicators

**Expected**:
- AUDITEE sees "AUDITOR is viewing this observation" indicator
- Presence badge/avatar appears
- When AUDITOR leaves, indicator disappears

**WebSocket Message**:
```json
{
  "type": "presence",
  "observationId": "obs-123",
  "users": [
    {"id": "user-1", "email": "auditee@example.com"},
    {"id": "user-2", "email": "auditor@example.com"}
  ]
}
```

---

## 6. Execution Plan

### 6.1 Test Environment Setup

**Prerequisites**:
```bash
# 1. Start PostgreSQL container
docker start audit-postgres
docker ps | grep audit-postgres

# 2. Run database migrations
cd /Users/vandit/Desktop/Projects/EZAudit/audit-platform
npx prisma migrate deploy

# 3. Seed database with test data
npm run db:seed

# 4. Start application servers
npm run dev  # Next.js on port 3005
npm run ws:dev  # WebSocket on port 3001 (separate terminal)

# 5. Verify servers running
# - Next.js: http://localhost:3005
# - WebSocket: ws://localhost:3001
```

### 6.2 Test Data Requirements

**Required Database State**:

1. **User Accounts** (created by seed):
   - AUDITEE: `auditee@example.com / auditee123`
   - AUDITOR: `auditor@example.com / auditor123`
   - AUDIT_HEAD: `audithead@example.com / audithead123`
   - CFO: `cfo@example.com / cfo123`

2. **ObservationAssignment Records**:
   - At least 3 observations assigned to AUDITEE via `ObservationAssignment`
   - At least 2 observations NOT assigned to AUDITEE (for negative testing)
   - Verify with SQL:
     ```sql
     SELECT o.id, o.observationText, oa.auditeeId
     FROM "Observation" o
     LEFT JOIN "ObservationAssignment" oa ON o.id = oa.observationId
     WHERE oa.auditeeId = (SELECT id FROM "User" WHERE email = 'auditee@example.com');
     ```

3. **Audit States**:
   - At least 1 observation in an unlocked audit (for edit testing)
   - At least 1 observation in a locked audit (for lock testing)

4. **Notes with Mixed Visibility**:
   - Create notes with `visibility: "INTERNAL"` and `visibility: "ALL"`
   - Verify AUDITEE only sees "ALL" notes

5. **Observation Status**:
   - At least 1 observation with `currentStatus: "PENDING_MR"` (for auto-transition testing)

### 6.3 Execution Order

**Phase 1: Authentication & Navigation** (Critical)
1. Test Case 1.1 - Login
2. Test Case 1.2 - Dashboard navigation visibility
3. Test Case 1.3 - AI assistant redirect

**Phase 2: Observations List** (Critical)
4. Test Case 2.1 - View assigned observations only
5. Test Case 2.4 - No bulk actions visible
6. Test Case 2.2 - Filter by plant
7. Test Case 2.3 - Search observations

**Phase 3: Observation Detail - Read** (Critical)
8. Test Case 3.1 - Access assigned observation
9. Test Case 3.2 - Blocked access to non-assigned observation
10. Test Case 3.3 - View notes with visibility filtering

**Phase 4: Observation Detail - Write (Allowed)** (Critical)
11. Test Case 4.1 - Edit Auditee Person Tier 1
12. Test Case 4.2 - Edit Auditee Person Tier 2
13. Test Case 4.3 - Edit Auditee Feedback
14. Test Case 4.4 - Auto-transition status on feedback
15. Test Case 4.5 - Create action plan
16. Test Case 4.6 - Post note

**Phase 5: Observation Detail - Write (Blocked)** (Critical)
17. Test Case 5.1 - Cannot edit observation text
18. Test Case 5.2 - Cannot edit risk category
19. Test Case 5.3 - Cannot edit current status
20. Test Case 5.5 - Cannot edit when audit locked
21. Test Case 5.6 - No approval buttons visible

**Phase 6: Edge Cases** (Important)
22. Test Case 6.1 - Non-existent observation
23. Test Case 6.2 - Save empty values
24. Test Case 6.3 - Session timeout
25. Test Case 6.5 - Field lock applied

**Phase 7: Real-Time Features** (Nice-to-have)
26. Test Case 7.1 - Receive real-time updates
27. Test Case 7.2 - Presence detection

### 6.4 Success Criteria

**Critical Tests** (Must Pass: 100%)
- All 🔴 Critical tests pass (21 tests)
- No security vulnerabilities (AUDITEE cannot access restricted data)
- No unauthorized API access (all 403/404 responses correct)
- All 3 editable fields work correctly
- No editing of restricted fields possible

**Important Tests** (Target: ≥90%)
- 🟡 Important tests pass (7 tests)
- Filtering and search work correctly
- Edge cases handled gracefully

**Nice-to-have Tests** (Target: ≥70%)
- 🟢 Nice-to-have tests pass (2 tests)
- Real-time features operational

**Overall Success**: ≥95% of all tests pass

### 6.5 Testing Tools

**Recommended Approach**: Browser-based UI testing with Playwright

**Playwright Setup**:
```typescript
// tests/auditee/login.spec.ts
import { test, expect } from '@playwright/test';

test('AUDITEE can login', async ({ page }) => {
  await page.goto('http://localhost:3005/login');
  await page.fill('input[name="email"]', 'auditee@example.com');
  await page.fill('input[name="password"]', 'auditee123');
  await page.click('button[type="submit"]');

  // Wait for redirect (avoid /login in URL)
  await page.waitForURL(/^((?!\/login).)*$/);

  // Verify dashboard
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('text=AUDITEE')).toBeVisible();
});
```

**Manual Testing Checklist**:
- Use browser dev tools to inspect disabled fields
- Check Network tab for API calls and responses
- Monitor Console for WebSocket messages
- Use Application tab to verify session cookies

### 6.6 Reporting

**Test Report Format**:
```markdown
# AUDITEE Testing Report - [Date]

## Summary
- Total Tests: 28
- Passed: X
- Failed: Y
- Skipped: Z
- Pass Rate: X%

## Critical Issues
- [List any failed critical tests]

## Test Results by Category
### Authentication & Navigation
- ✅ TC 1.1: Login - PASS
- ✅ TC 1.2: Dashboard visibility - PASS
...

## Failed Test Details
### TC X.Y: [Test Name]
- **Expected**: ...
- **Actual**: ...
- **Screenshot**: [attach]
- **API Response**: [attach]

## Recommendations
- [List any issues or improvements]
```

---

## 7. Key Findings Summary

### 7.1 AUDITEE Capabilities
✅ **Can Do**:
- Login with credentials
- View dashboard
- View assigned observations only
- Edit 3 specific fields: `auditeePersonTier1`, `auditeePersonTier2`, `auditeeFeedback`
- Create action plans (without retest field)
- Post notes (visibility "ALL" only)
- View notes with "ALL" visibility
- View attachments
- Receive WebSocket real-time updates

❌ **Cannot Do**:
- Access AI assistant (redirects to `/observations`)
- Access plants, audits, reports, admin pages
- Create new observations
- Edit auditor fields
- Edit observation status
- Approve/reject/submit observations
- Delete observations
- Publish/unpublish observations
- Lock/unlock fields
- Assign/remove auditees
- Request changes
- Edit when audit is locked
- Set retest field in action plans
- Post internal notes

### 7.2 Critical Security Controls
1. **Assignment-Based Access**: AUDITEE can ONLY access observations with `ObservationAssignment` record
2. **Field-Level Permissions**: API enforces AUDITEE can only edit 3 fields
3. **UI-Level Protections**: Disabled fields, hidden buttons
4. **API-Level Protections**: 403 Forbidden for unauthorized operations
5. **Auto-Redirect**: AI assistant page redirects AUDITEE to `/observations`
6. **Audit Lock Enforcement**: Cannot edit when audit is locked (unless CFO)

### 7.3 Auto-Transition Logic
When AUDITEE submits feedback on an observation with status `PENDING_MR`, the status automatically transitions to `MR_UNDER_REVIEW`. This is handled server-side and requires no manual status change.

---

## Appendix A: API Endpoints Reference

### Accessible to AUDITEE (with Restrictions)

| Endpoint | Method | Access Level | Notes |
|----------|--------|--------------|-------|
| `/api/v1/observations` | GET | Filtered | Only assigned observations |
| `/api/v1/observations/[id]` | GET | Conditional | Only if assigned |
| `/api/v1/observations/[id]` | PATCH | Limited | Only 3 fields |
| `/api/v1/observations/[id]/actions` | GET | Conditional | Only if assigned |
| `/api/v1/observations/[id]/actions` | POST | Limited | Cannot set retest |
| `/api/v1/observations/[id]/notes` | GET | Filtered | Only "ALL" visibility |
| `/api/v1/observations/[id]/notes` | POST | Limited | Visibility forced to "ALL" |
| `/api/v1/websocket/token` | GET | Full | For WebSocket connection |

### Blocked Endpoints (403 Forbidden)

| Endpoint | Method | Error |
|----------|--------|-------|
| `/api/v1/observations` | POST | "Forbidden" |
| `/api/v1/observations/[id]` | DELETE | "Forbidden" |
| `/api/v1/observations/[id]/approve` | POST | "Forbidden" |
| `/api/v1/observations/[id]/reject` | POST | "Forbidden" |
| `/api/v1/observations/[id]/submit` | POST | "Forbidden" |
| `/api/v1/observations/[id]/publish` | POST | "Forbidden" |
| `/api/v1/observations/[id]/locks` | POST | "Forbidden" |
| `/api/v1/observations/[id]/assign-auditee` | POST | "Forbidden" |
| `/api/v1/observations/[id]/change-requests` | * | "Forbidden" |
| `/api/v1/audits/*` | * | "Forbidden" |
| `/api/v1/plants/*` | * | "Forbidden" |
| `/api/v1/reports/*` | * | "Forbidden" |
| `/api/v1/ai/*` | * | "Forbidden" |
| `/api/v1/admin/*` | * | "Forbidden" |

---

## Appendix B: Database Queries for Verification

### Check AUDITEE Assignments
```sql
-- Get all observations assigned to AUDITEE
SELECT
  o.id,
  o.observationText,
  o.approvalStatus,
  o.currentStatus,
  oa.assignedAt,
  oa.assignedById,
  u.email as assigned_by_email
FROM "Observation" o
INNER JOIN "ObservationAssignment" oa ON o.id = oa.observationId
LEFT JOIN "User" u ON oa.assignedById = u.id
WHERE oa.auditeeId = (SELECT id FROM "User" WHERE email = 'auditee@example.com')
ORDER BY oa.assignedAt DESC;
```

### Check Observations NOT Assigned
```sql
-- Get observations NOT assigned to AUDITEE (for negative testing)
SELECT
  o.id,
  o.observationText,
  o.approvalStatus
FROM "Observation" o
WHERE o.id NOT IN (
  SELECT observationId FROM "ObservationAssignment"
  WHERE auditeeId = (SELECT id FROM "User" WHERE email = 'auditee@example.com')
)
LIMIT 10;
```

### Check Audit Lock Status
```sql
-- Find observations in locked vs unlocked audits
SELECT
  o.id,
  o.observationText,
  a.isLocked,
  a.lockedAt,
  a.title as audit_title
FROM "Observation" o
INNER JOIN "Audit" a ON o.auditId = a.id
INNER JOIN "ObservationAssignment" oa ON o.id = oa.observationId
WHERE oa.auditeeId = (SELECT id FROM "User" WHERE email = 'auditee@example.com')
ORDER BY a.isLocked DESC, o.createdAt DESC;
```

### Check Notes Visibility
```sql
-- Get notes with visibility breakdown
SELECT
  rn.id,
  rn.observationId,
  rn.text,
  rn.visibility,
  rn.createdAt,
  u.email as author_email
FROM "RunningNote" rn
INNER JOIN "User" u ON rn.actorId = u.id
WHERE rn.observationId IN (
  SELECT observationId FROM "ObservationAssignment"
  WHERE auditeeId = (SELECT id FROM "User" WHERE email = 'auditee@example.com')
)
ORDER BY rn.observationId, rn.createdAt;
```

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | Claude Code | Initial comprehensive testing plan created |

---

**End of AUDITEE Testing Plan**
