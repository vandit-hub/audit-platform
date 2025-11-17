# GUEST Role - Comprehensive Testing Plan

**Document Version:** 1.0
**Date:** 2025-11-17
**Role Under Test:** GUEST (Read-only with scope-based restrictions)

---

## 1. Role Capabilities Summary

### 1.1 Core Role Definition
**GUEST** is a read-only role with scope-based access restrictions defined via `GuestInvite` tokens. It's designed for external stakeholders who need limited visibility into specific observations or audits.

### 1.2 Permission Functions (from `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac.ts`)
- **Predicate:** `isGuest(role)` - Returns true if role is GUEST
- **No assertion functions** - GUEST cannot perform write operations, so no `assert*` functions exist
- **No combination helpers** - GUEST is excluded from all permission combinations

### 1.3 Access Restrictions

#### Read Permissions
GUEST can **READ** the following:
- **Observations:** Only those that are:
  - **Published AND Approved** (global access), OR
  - **Within their scope** (specific observation IDs or audit IDs from `GuestInvite.scope`)
- **Observation Details:** Full details including attachments, approvals, action plans, assignments
  - **Notes:** Only notes with visibility "ALL" (not "INTERNAL")
- **Dashboard Metrics:** Overview statistics based on accessible observations

#### Write Permissions
GUEST **CANNOT**:
- Create, update, or delete any entities
- Submit, approve, or reject observations
- Upload attachments
- Create action plans
- Add notes or change requests
- Lock/unlock audits
- Manage users, plants, or checklists
- Use AI Assistant
- Export data
- Access admin functions

#### Scope-Based Filtering (from `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/scope.ts`)
Three scope functions control GUEST access:
1. `getUserScope(userId)` - Retrieves scope from most recent redeemed `GuestInvite`
2. `buildScopeWhere(scope)` - Builds Prisma where clause with OR logic:
   - `scope.observationIds` - Array of specific observation IDs
   - `scope.auditIds` - Array of audit IDs (grants access to all observations in those audits)
3. `isObservationInScope(obs, scope)` - Validates if a single observation is in scope

**Scope Format:**
```json
{
  "observationIds": ["obs-id-1", "obs-id-2"],
  "auditIds": ["audit-id-1"]
}
```

### 1.4 Special Behaviors
- **CFO Short-Circuit:** Does NOT apply to GUEST (GUEST is not CFO)
- **Published Observations:** Can see all published+approved observations regardless of scope
- **Notes Visibility:** Only sees notes marked as "ALL" visibility (not "INTERNAL")
- **No Navigation to Audits, Plants, or Reports:** Sidebar hides these sections
- **No AI Access:** AI Assistant is hidden from GUEST
- **No Bulk Actions:** Cannot select or perform bulk operations

---

## 2. Accessible Pages

GUEST has access to the following pages:

| Page | URL | Purpose | Restrictions |
|------|-----|---------|--------------|
| **Dashboard** | `/dashboard` | Overview metrics and recent observations | Shows only scoped/published data |
| **Observations List** | `/observations` | Browse observations | Filtered by scope + published/approved |
| **Observation Detail** | `/observations/[id]` | View single observation | Only if in scope or published+approved |

---

## 3. Inaccessible Pages

GUEST **CANNOT** access:

| Page | URL | Reason | Expected Behavior |
|------|-----|--------|-------------------|
| **Plants** | `/plants` | Not in sidebar, requires CFO/CXO_TEAM | Blocked by navigation (sidebar doesn't show link) |
| **Audits** | `/audits` | Excluded via `!isAuditee(role)` check | Blocked by navigation |
| **Checklists** | `/checklists` | No explicit GUEST check in code | May be accessible (needs verification) |
| **Reports** | `/reports` | Requires CFO/CXO_TEAM/AUDIT_HEAD | Blocked by navigation |
| **AI Assistant** | `/ai` | Excluded via `!isGuest(role)` check | Blocked by navigation and API (403) |
| **Admin - Users** | `/admin/users` | Requires CFO/CXO_TEAM | Blocked by navigation and API (403) |
| **Admin - Import** | `/admin/import` | Requires CFO | Blocked by navigation and API (403) |

---

## 4. Operation Matrix

### 4.1 Dashboard (`/dashboard`)

| Action | API Endpoint | Method | Scope Applied | Expected Result |
|--------|--------------|--------|---------------|-----------------|
| View dashboard metrics | `/api/v1/reports/overview` | GET | Yes - scope + published filter | Shows aggregated stats for accessible observations |
| View recent observations | `/api/v1/observations` | GET | Yes - scope + published filter | Shows 5-10 most recent accessible observations |

**Prerequisites:** None (default view)

---

### 4.2 Observations List (`/observations`)

| Action | API Endpoint | Method | Scope Applied | Expected Result |
|--------|--------------|--------|---------------|-----------------|
| **Load observations** | `/api/v1/observations` | GET | Yes | Returns observations matching scope OR published+approved |
| Filter by plant | `/api/v1/observations?plantId=X` | GET | Yes | Filters within accessible observations only |
| Filter by audit | `/api/v1/observations?auditId=X` | GET | Yes | Filters within accessible observations only |
| Filter by risk | `/api/v1/observations?risk=A` | GET | Yes | Filters within accessible observations only |
| Filter by status | `/api/v1/observations?status=RESOLVED` | GET | Yes | Filters within accessible observations only |
| Search observations | `/api/v1/observations?q=search` | GET | Yes | Searches within accessible observations only |
| Sort observations | `/api/v1/observations?sortBy=createdAt&sortOrder=desc` | GET | Yes | Sorts accessible observations |
| Export CSV | `/api/v1/observations/export` | GET | Yes | **BLOCKED** - Returns 403 for GUEST |

**Prerequisites:** None (default view)

**UI Elements Visible:**
- Filter dropdowns (Plant, Audit, Risk, Status, Search)
- Reset Filters button
- Export CSV button (visible but **should fail**)
- Observation table rows
- "Open →" link for each observation

**UI Elements Hidden:**
- "Create Observation" button (only for auditors/audit heads)
- Bulk action checkboxes
- Bulk approve/reject/publish/unpublish buttons

---

### 4.3 Observation Detail (`/observations/[id]`)

| Action | API Endpoint | Method | Scope Applied | Expected Result |
|--------|--------------|--------|---------------|-----------------|
| **View observation** | `/api/v1/observations/[id]` | GET | Yes | Returns observation if in scope or published+approved, else 404 |
| View attachments | Included in GET response | - | Yes | Lists attachments (ANNEXURE, MGMT_DOC) |
| View approvals | Included in GET response | - | Yes | Lists approval history |
| View notes | Included in GET response | - | Visibility="ALL" only | Shows only public notes |
| View action plans | Included in GET response | - | Yes | Lists action plans |
| View assignments | Included in GET response | - | Yes | Lists auditee assignments |
| Download attachment | `/api/v1/observations/[id]/attachments/presign` | POST | Yes | **BLOCKED** - Returns 403 for GUEST |
| Edit observation | `/api/v1/observations/[id]` | PATCH | No | **BLOCKED** - No edit UI for GUEST |
| Submit observation | `/api/v1/observations/[id]/submit` | POST | No | **BLOCKED** - No submit button for GUEST |
| Approve observation | `/api/v1/observations/[id]/approve` | POST | No | **BLOCKED** - No approve button for GUEST |
| Reject observation | `/api/v1/observations/[id]/reject` | POST | No | **BLOCKED** - No reject button for GUEST |
| Publish observation | `/api/v1/observations/[id]/publish` | POST | No | **BLOCKED** - No publish button for GUEST |
| Create action plan | `/api/v1/observations/[id]/actions` | POST | No | **BLOCKED** - No create button for GUEST |
| Add note | `/api/v1/observations/[id]/notes` | POST | No | **BLOCKED** - No note input for GUEST |
| Create change request | `/api/v1/observations/[id]/change-requests` | POST | No | **BLOCKED** - No change request button for GUEST |

**Prerequisites:**
- Observation must exist
- Observation must be in scope OR published+approved

**UI Elements Visible:**
- Observation text and metadata (read-only)
- Risk category badge
- Approval status badge
- Attachments list (view only)
- Approvals timeline (view only)
- Notes (visibility="ALL" only, read-only)
- Action plans (read-only)
- Assignments list (read-only)

**UI Elements Hidden:**
- Edit buttons
- Submit/Approve/Reject buttons
- Publish/Unpublish buttons
- "Add Action Plan" button
- "Add Note" input
- "Request Change" button
- "Upload Attachment" button

---

### 4.4 Other API Routes

| Endpoint | Method | Expected Result |
|----------|--------|-----------------|
| `/api/v1/plants` | GET | **BLOCKED** - Returns 403 for GUEST |
| `/api/v1/audits` | GET | **BLOCKED** - Returns 403 (not CFO/CXO/AUDIT_HEAD/AUDITOR) |
| `/api/v1/users` | GET | **BLOCKED** - Requires CFO/CXO_TEAM |
| `/api/v1/checklists` | GET | Unknown - Needs verification |
| `/api/v1/ai/chat` | POST | **BLOCKED** - Returns 403 for GUEST |
| `/api/v1/reports/overview` | GET | **ALLOWED** - Returns scoped data |
| `/api/v1/reports/targets` | GET | **BLOCKED** - Returns 403 for GUEST |
| `/api/v1/websocket/token` | GET | Unknown - Needs verification |

---

## 5. Test Scenarios

### 5.1 Critical Priority Tests

#### Test 1: Login as GUEST
**Page:** `/login`
**Prerequisites:** GUEST user seeded with credentials
**Steps:**
1. Navigate to `/login`
2. Enter email: `guest@example.com`
3. Enter password: `guest123`
4. Click "Sign In"

**Expected:**
- Successful login
- Redirect to `/dashboard`
- Session created with role="GUEST"
- Sidebar shows only: Dashboard, Observations

**API Call:** `POST /api/auth/callback/credentials`

---

#### Test 2: View Dashboard Metrics (Scoped)
**Page:** `/dashboard`
**Prerequisites:**
- Logged in as GUEST
- GUEST has scope (e.g., `{"auditIds": ["audit-1"]}`)
- Database has observations in audit-1 and other audits

**Steps:**
1. Navigate to `/dashboard`
2. Observe metrics displayed

**Expected:**
- Metrics show only observations from audit-1 (scoped audit)
- Published+approved observations from other audits also shown
- Audit count reflects accessible audits
- No error messages

**API Calls:**
- `GET /api/v1/reports/overview`
- `GET /api/v1/observations?limit=10`

---

#### Test 3: View Observations List (Scoped)
**Page:** `/observations`
**Prerequisites:**
- Logged in as GUEST
- GUEST has scope: `{"observationIds": ["obs-1", "obs-2"], "auditIds": ["audit-1"]}`
- Database has 20+ observations total

**Steps:**
1. Navigate to `/observations`
2. Count visible observations

**Expected:**
- Shows only:
  - obs-1, obs-2 (explicitly scoped)
  - All observations in audit-1 (audit-level scope)
  - All published+approved observations (global visibility)
- Does NOT show:
  - Draft observations outside scope
  - Submitted but not approved observations outside scope
- "Create Observation" button hidden
- No bulk action checkboxes

**API Call:** `GET /api/v1/observations`

---

#### Test 4: View Observation Detail (In Scope)
**Page:** `/observations/[id]`
**Prerequisites:**
- Logged in as GUEST
- Observation ID "obs-1" is in GUEST's scope

**Steps:**
1. Navigate to `/observations/obs-1`
2. Verify all sections load

**Expected:**
- Observation details displayed
- Attachments list shown (read-only)
- Approvals history shown
- Action plans shown
- Notes shown (only visibility="ALL")
- No edit buttons visible
- No "Submit", "Approve", "Reject" buttons
- No "Add Action Plan" button
- No "Add Note" input

**API Call:** `GET /api/v1/observations/obs-1`

---

#### Test 5: View Observation Detail (Out of Scope, Not Published)
**Page:** `/observations/[id]`
**Prerequisites:**
- Logged in as GUEST
- Observation ID "obs-999" is NOT in scope
- obs-999 is DRAFT (not published+approved)

**Steps:**
1. Navigate to `/observations/obs-999`

**Expected:**
- 404 Not Found error
- "Observation not found" or similar message

**API Call:** `GET /api/v1/observations/obs-999` returns 404

---

#### Test 6: View Published+Approved Observation (Out of Scope)
**Page:** `/observations/[id]`
**Prerequisites:**
- Logged in as GUEST
- Observation ID "obs-published" is NOT in scope
- obs-published has approvalStatus="APPROVED" AND isPublished=true

**Steps:**
1. Navigate to `/observations/obs-published`

**Expected:**
- Observation details displayed (GUEST can see all published+approved)
- Full read-only view
- No edit capabilities

**API Call:** `GET /api/v1/observations/obs-published` returns 200

---

#### Test 7: Filter Observations by Plant
**Page:** `/observations`
**Prerequisites:**
- Logged in as GUEST
- GUEST has access to observations from multiple plants

**Steps:**
1. Navigate to `/observations`
2. Select a plant from "Plant" dropdown
3. Observe filtered results

**Expected:**
- Only observations from selected plant shown (within scope)
- Filter applied on top of scope restrictions
- Count updates

**API Call:** `GET /api/v1/observations?plantId=X`

---

#### Test 8: Search Observations
**Page:** `/observations`
**Prerequisites:**
- Logged in as GUEST
- GUEST has scoped access to 10+ observations

**Steps:**
1. Navigate to `/observations`
2. Enter search term in "Search" field (e.g., "risk")
3. Press Enter or wait for auto-search

**Expected:**
- Only scoped observations matching search term shown
- Search applies to: observationText, risksInvolved, auditeeFeedback, auditorResponseToAuditee
- Count updates

**API Call:** `GET /api/v1/observations?q=risk`

---

#### Test 9: Attempt CSV Export (Should Fail)
**Page:** `/observations`
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Navigate to `/observations`
2. Click "Export CSV" button

**Expected:**
- 403 Forbidden error
- Error message: "Forbidden" or similar
- No CSV download initiated

**API Call:** `GET /api/v1/observations/export` returns 403

---

#### Test 10: Attempt to Access Audits Page (Should Fail)
**Page:** `/audits`
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Manually navigate to `/audits` (not in sidebar)
2. Observe result

**Expected:**
- 403 Forbidden error OR blank page
- Sidebar does not show "Audits" link
- If API call made: `GET /api/v1/audits` returns 403

**API Call:** `GET /api/v1/audits` returns 403

---

### 5.2 Important Priority Tests

#### Test 11: View Notes (Visibility Filtering)
**Page:** `/observations/[id]`
**Prerequisites:**
- Logged in as GUEST
- Observation has 3 notes:
  - Note 1: visibility="ALL"
  - Note 2: visibility="INTERNAL"
  - Note 3: visibility="ALL"

**Steps:**
1. Navigate to observation detail page
2. Scroll to notes section

**Expected:**
- Only Note 1 and Note 3 displayed
- Note 2 (INTERNAL) hidden
- No "Add Note" input visible

**API Call:** `GET /api/v1/observations/[id]` includes `notes: { where: { visibility: "ALL" } }`

---

#### Test 12: Attempt to Access Plants Page (Should Fail)
**Page:** `/plants`
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Manually navigate to `/plants`
2. Observe result

**Expected:**
- 403 Forbidden error OR blank page
- Sidebar does not show "Plants" link

**API Call:** `GET /api/v1/plants` returns 403

---

#### Test 13: Attempt to Access Reports Page (Should Fail)
**Page:** `/reports`
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Manually navigate to `/reports`
2. Observe result

**Expected:**
- Sidebar does not show "Reports" link
- If accessed manually, should redirect or show access denied
- Reports require CFO/CXO_TEAM/AUDIT_HEAD

---

#### Test 14: Attempt to Access AI Assistant (Should Fail)
**Page:** `/ai`
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Manually navigate to `/ai`
2. Observe result

**Expected:**
- 403 Forbidden error
- Sidebar does not show "AI Assistant" link

**API Call:** `POST /api/v1/ai/chat` returns 403

---

#### Test 15: Verify Sidebar Navigation
**Page:** Any dashboard page
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Navigate to `/dashboard`
2. Inspect sidebar navigation

**Expected:**
- **Visible sections:**
  - Main: Dashboard, Observations
- **Hidden sections:**
  - Plants (requires CFO/CXO_TEAM)
  - Audits (excludes AUDITEE and implicitly GUEST)
  - Reports (requires CFO/CXO_TEAM/AUDIT_HEAD)
  - Tools: AI Assistant (excludes AUDITEE and GUEST)
  - Administration: Users, Import (requires CFO/CXO_TEAM)

---

#### Test 16: Scope with Multiple Observation IDs
**Page:** `/observations`
**Prerequisites:**
- GUEST scope: `{"observationIds": ["obs-1", "obs-2", "obs-3"]}`
- Database has obs-1, obs-2, obs-3, and 10 other observations

**Steps:**
1. Navigate to `/observations`
2. Count observations

**Expected:**
- Shows obs-1, obs-2, obs-3
- Plus any published+approved observations
- Does NOT show other draft/submitted observations

**API Call:** `GET /api/v1/observations`

---

#### Test 17: Scope with Audit IDs
**Page:** `/observations`
**Prerequisites:**
- GUEST scope: `{"auditIds": ["audit-1", "audit-2"]}`
- audit-1 has 5 observations
- audit-2 has 3 observations
- Database has 10 other audits with observations

**Steps:**
1. Navigate to `/observations`
2. Count observations

**Expected:**
- Shows all 8 observations from audit-1 and audit-2
- Plus any published+approved observations from other audits
- Does NOT show draft observations from other audits

**API Call:** `GET /api/v1/observations`

---

#### Test 18: Scope with Both Observation IDs and Audit IDs
**Page:** `/observations`
**Prerequisites:**
- GUEST scope: `{"observationIds": ["obs-1"], "auditIds": ["audit-2"]}`
- audit-2 has 3 observations (obs-2, obs-3, obs-4)

**Steps:**
1. Navigate to `/observations`
2. Count observations

**Expected:**
- Shows obs-1 (explicit ID)
- Shows obs-2, obs-3, obs-4 (from audit-2)
- Plus published+approved observations
- Total: 4+ observations (depending on published count)

**API Call:** `GET /api/v1/observations`

---

#### Test 19: Empty Scope (Only Published+Approved)
**Page:** `/observations`
**Prerequisites:**
- GUEST scope: `{}` or `null` (no specific restrictions)
- Database has 5 published+approved observations
- Database has 10 draft/submitted observations

**Steps:**
1. Navigate to `/observations`
2. Count observations

**Expected:**
- Shows only 5 published+approved observations
- Does NOT show draft/submitted observations

**API Call:** `GET /api/v1/observations`

---

#### Test 20: Attempt to Edit Observation (Should Fail)
**Page:** `/observations/[id]`
**Prerequisites:**
- Logged in as GUEST
- Observation in scope

**Steps:**
1. Navigate to observation detail page
2. Look for edit buttons or forms

**Expected:**
- No "Edit" button visible
- All fields are read-only text (not input fields)
- No save/update buttons
- If API called manually: `PATCH /api/v1/observations/[id]` returns 403

---

### 5.3 Nice-to-Have Tests

#### Test 21: WebSocket Connection (If Implemented)
**Page:** `/observations/[id]`
**Prerequisites:**
- Logged in as GUEST
- WebSocket enabled

**Steps:**
1. Navigate to observation detail page
2. Check browser DevTools Network tab for WebSocket connection

**Expected:**
- WebSocket connection established (if GUEST is allowed)
- Real-time updates received for scoped observations
- OR: WebSocket denied for GUEST (depends on implementation)

**API Call:** `GET /api/v1/websocket/token` (may return token or 403)

---

#### Test 22: Session Timeout
**Page:** Any
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Login as GUEST
2. Wait for idle timeout (15 minutes default)
3. Attempt to navigate

**Expected:**
- Session expires after idle timeout
- Redirect to `/login`
- Must re-authenticate

---

#### Test 23: Verify Audit Trail (GUEST Actions)
**Page:** Backend verification
**Prerequisites:**
- Logged in as GUEST
- Performed actions (view observations)

**Steps:**
1. Check `AuditEvent` table in database
2. Filter by GUEST user ID

**Expected:**
- LOGIN event recorded
- No CREATE/UPDATE/DELETE events (GUEST is read-only)
- May have READ events if explicitly logged

---

#### Test 24: Attempt to Create Observation (Should Fail)
**Page:** `/observations`
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Navigate to `/observations`
2. Look for "Create Observation" button

**Expected:**
- Button hidden (only visible to auditors/audit heads)
- If API called manually: `POST /api/v1/observations` returns 403

---

#### Test 25: Attempt to Access Admin Pages (Should Fail)
**Page:** `/admin/users`, `/admin/import`
**Prerequisites:** Logged in as GUEST

**Steps:**
1. Manually navigate to `/admin/users`
2. Manually navigate to `/admin/import`

**Expected:**
- Both pages return 403 or redirect
- Sidebar does not show "Administration" section

**API Calls:**
- `GET /api/v1/users` returns 403
- Any admin API returns 403

---

## 6. Execution Plan

### 6.1 Test Credentials
- **Email:** `guest@example.com`
- **Password:** `guest123`
- **Role:** GUEST

**Note:** Guest user is created by seed script. Ensure `npm run db:seed` has been run.

---

### 6.2 Data Dependencies

#### Required Database State
1. **Guest User:** Must exist with role=GUEST, status=ACTIVE
2. **Guest Invite:** At least one redeemed invite for guest user with scope defined
   - Recommended scope: `{"observationIds": ["obs-1", "obs-2"], "auditIds": ["audit-1"]}`
3. **Plants:** At least 2 plants (e.g., "Plant A", "Plant B")
4. **Audits:** At least 2 audits (audit-1, audit-2) in different plants
5. **Observations:**
   - 5+ observations in audit-1 (various statuses)
   - 3+ observations in audit-2 (various statuses)
   - 5+ observations in other audits (some published+approved, some draft)
   - At least 2 observations explicitly scoped (obs-1, obs-2)
6. **Attachments:** Some observations should have attachments
7. **Notes:** Some observations should have notes (mix of visibility="ALL" and "INTERNAL")
8. **Action Plans:** Some observations should have action plans
9. **Assignments:** Some observations should have auditee assignments

#### Creating Guest Scope (Manual Setup)
Since the seed script doesn't create a `GuestInvite` by default, you'll need to:

**Option 1: Via API (as CFO)**
```bash
# Login as CFO first
curl -X POST http://localhost:3005/api/v1/auth/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guest@example.com",
    "role": "GUEST",
    "expiresInDays": 30,
    "scope": {
      "observationIds": ["<obs-id-1>", "<obs-id-2>"],
      "auditIds": ["<audit-id-1>"]
    }
  }'

# Then accept the invite with returned token
curl -X POST http://localhost:3005/api/v1/auth/accept-invite \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<returned-token>",
    "name": "Default Guest",
    "password": "guest123"
  }'
```

**Option 2: Direct Database Insert**
```sql
-- Insert GuestInvite with scope
INSERT INTO "GuestInvite" (id, email, role, token, scope, "expiresAt", "redeemedById", "redeemedAt", "createdAt")
VALUES (
  'invite-1',
  'guest@example.com',
  'GUEST',
  'dummy-token-already-redeemed',
  '{"observationIds": ["<obs-id-1>", "<obs-id-2>"], "auditIds": ["<audit-id-1>"]}',
  NOW() + INTERVAL '30 days',
  '<guest-user-id>',
  NOW(),
  NOW()
);
```

---

### 6.3 Execution Order

Execute tests in the following order to ensure dependencies:

**Phase 1: Authentication & Navigation (Tests 1, 15)**
- Test 1: Login as GUEST
- Test 15: Verify Sidebar Navigation

**Phase 2: Dashboard & Overview (Tests 2)**
- Test 2: View Dashboard Metrics (Scoped)

**Phase 3: Observations List (Tests 3, 7, 8, 16, 17, 18, 19)**
- Test 3: View Observations List (Scoped)
- Test 16: Scope with Multiple Observation IDs
- Test 17: Scope with Audit IDs
- Test 18: Scope with Both Observation IDs and Audit IDs
- Test 19: Empty Scope (Only Published+Approved)
- Test 7: Filter Observations by Plant
- Test 8: Search Observations

**Phase 4: Observation Detail (Tests 4, 5, 6, 11)**
- Test 4: View Observation Detail (In Scope)
- Test 5: View Observation Detail (Out of Scope, Not Published)
- Test 6: View Published+Approved Observation (Out of Scope)
- Test 11: View Notes (Visibility Filtering)

**Phase 5: Access Restrictions (Tests 9, 10, 12, 13, 14, 20, 24, 25)**
- Test 9: Attempt CSV Export (Should Fail)
- Test 10: Attempt to Access Audits Page (Should Fail)
- Test 12: Attempt to Access Plants Page (Should Fail)
- Test 13: Attempt to Access Reports Page (Should Fail)
- Test 14: Attempt to Access AI Assistant (Should Fail)
- Test 20: Attempt to Edit Observation (Should Fail)
- Test 24: Attempt to Create Observation (Should Fail)
- Test 25: Attempt to Access Admin Pages (Should Fail)

**Phase 6: Optional (Tests 21, 22, 23)**
- Test 21: WebSocket Connection
- Test 22: Session Timeout
- Test 23: Verify Audit Trail

---

### 6.4 Success Criteria

**Overall Pass Criteria:**
- All **Critical Priority** tests (1-10) pass: **100% required**
- At least 80% of **Important Priority** tests (11-20) pass
- At least 60% of **Nice-to-Have** tests (21-25) pass

**Individual Test Pass Criteria:**
- Actual behavior matches expected behavior
- No unhandled errors or crashes
- API responses return expected status codes
- UI elements are correctly shown/hidden
- Scope filtering works correctly
- No data leakage (GUEST cannot see out-of-scope data)

**Security Pass Criteria:**
- GUEST cannot perform any write operations
- GUEST cannot access data outside scope
- GUEST cannot bypass scope restrictions via API manipulation
- GUEST cannot access admin/privileged pages
- All 403/404 errors are properly returned for unauthorized access

---

## 7. Known Limitations & Notes

### 7.1 Scope Assignment
- The seed script creates a GUEST user but does NOT create a `GuestInvite` with scope
- Testers must manually create a `GuestInvite` and redeem it (see Section 6.2)
- Without a redeemed invite, GUEST scope will be `null`, showing only published+approved observations

### 7.2 Checklists Page
- The `/checklists` page may be accessible to GUEST (no explicit check found in code)
- This should be verified during testing
- Expected: GUEST should NOT be able to create/edit checklists

### 7.3 WebSocket Access
- WebSocket token endpoint (`/api/v1/websocket/token`) access for GUEST is unclear
- May require additional testing to determine if GUEST can establish WebSocket connections
- If allowed, GUEST should only receive updates for scoped observations

### 7.4 Published Filter in UI
- The observations list UI doesn't expose a "published" filter to GUEST
- GUEST sees mix of scoped + published+approved observations by default
- This is by design (GUEST shouldn't need to filter published vs unpublished)

### 7.5 Attachments Download
- Attachment download via presign endpoint is blocked for GUEST
- GUEST can see attachment metadata (filename, size) but cannot download
- Verify this behavior in test scenario

---

## 8. Testing Tools & Techniques

### 8.1 Browser-Based Testing (Recommended)
Use Playwright for automated browser testing:

```javascript
// Example: Login as GUEST
await page.goto('/login');
await page.fill('input[name="email"]', 'guest@example.com');
await page.fill('input[name="password"]', 'guest123');
await page.click('button[type="submit"]');
await page.waitForURL(/^((?!\/login).)*$/); // Wait for redirect

// Verify sidebar
const sidebarText = await page.locator('aside').textContent();
expect(sidebarText).toContain('Dashboard');
expect(sidebarText).toContain('Observations');
expect(sidebarText).not.toContain('Plants');
expect(sidebarText).not.toContain('Audits');
```

### 8.2 Manual Testing Checklist
For each test scenario:
- [ ] Login as GUEST
- [ ] Navigate to specified page
- [ ] Perform action
- [ ] Verify expected result
- [ ] Check API response in Network tab
- [ ] Check for console errors
- [ ] Verify no data leakage
- [ ] Screenshot results

### 8.3 API Testing
Use curl or Postman to verify API behavior:

```bash
# Example: Get observations as GUEST
curl -X GET http://localhost:3005/api/v1/observations \
  -H "Cookie: next-auth.session-token=<token>" \
  -v
```

---

## 9. Appendix: RBAC Logic for GUEST

### From `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/route.ts` (Lines 138-148)

```typescript
// GUEST: restrict by published+approved, plus any scoped access
else if (isGuest(session.user.role)) {
  const scope = await getUserScope(session.user.id);
  const scopeWhere = buildScopeWhere(scope);
  const allowPublished: Prisma.ObservationWhereInput = {
    AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
  };
  const or: Prisma.ObservationWhereInput[] = [allowPublished];
  if (scopeWhere) or.push(scopeWhere);

  where = { AND: [where, { OR: or }] };
}
```

**Logic Explanation:**
1. Retrieve GUEST's scope from most recent redeemed `GuestInvite`
2. Build scope filter (observation IDs OR audit IDs)
3. Allow access to:
   - Published AND Approved observations (global), OR
   - Observations matching scope (observation IDs or audit IDs)
4. Combine with any other filters (plant, audit, risk, etc.)

### From `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/observations/[id]/route.ts` (Lines 124-131)

```typescript
// GUEST uses scope-based filtering
else if (isGuest(role)) {
  const scope = await getUserScope(session.user.id);
  const allowed = isObservationInScope({ id: o.id, auditId: o.audit.id }, scope) ||
    (o.approvalStatus === "APPROVED" && o.isPublished);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
}
```

**Logic Explanation:**
1. Check if observation is in GUEST's scope (observation ID or audit ID match)
2. OR check if observation is published+approved
3. If neither: return 404 (hide existence from GUEST)

---

## 10. Conclusion

This testing plan provides comprehensive coverage of the GUEST role, including:
- **25 test scenarios** covering authentication, navigation, data access, scope filtering, and security restrictions
- **Detailed API endpoint mapping** for all accessible and restricted operations
- **Clear success criteria** for pass/fail determination
- **Data setup instructions** for creating guest scope
- **Execution order** to ensure dependencies are met

By following this plan, testers can verify that:
1. GUEST can only view data within their scope or published+approved observations
2. GUEST cannot perform any write operations
3. GUEST cannot access privileged pages or features
4. Scope filtering works correctly for observation IDs and audit IDs
5. Notes visibility filtering works correctly
6. All security restrictions are enforced

---

**End of Testing Plan**
