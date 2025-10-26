# RBAC Task 3 - Testing Guide

**Date**: 2025-01-22
**Status**: Ready for Testing
**Server**: Running on http://localhost:3005

---

## Test Environment Setup

### ✅ Prerequisites Verified

1. **Development Server**: Running on port 3005
2. **Database**: PostgreSQL connected and accessible
3. **Test Data Created**:
   - Plant: `test-plant-1` (TP001 - Test Manufacturing Plant)
   - Audit: `test-audit-1` (Q1 2025 Safety Audit)
   - Audit Head assigned: `audithead@example.com`
   - Auditor assigned: `auditor@example.com`

### Test Users

| Email | Role | Password | Purpose |
|-------|------|----------|---------|
| cfo@example.com | CFO | (seed password) | Full access, can override locks |
| cxo@example.com | CXO_TEAM | (seed password) | Manage audits, cannot override CFO locks |
| audithead@example.com | AUDIT_HEAD | (seed password) | View assigned audits, approve observations |
| auditor@example.com | AUDITOR | (seed password) | View assigned audits only |

---

## Implementation Verification Summary

### ✅ Database Operations Verified

All core operations have been verified to work correctly at the database level:

1. **Lock Operation**: ✅ Sets `isLocked=true`, `lockedAt=NOW()`, `lockedById`
2. **Unlock Operation**: ✅ Sets `isLocked=false`, clears `lockedAt` and `lockedById`
3. **Complete Operation**: ✅ Sets `completedAt`, `completedById`, and auto-locks
4. **Visibility Rules**: ✅ Stores JSON rules correctly (`"last_12m"`, `"show_all"`, etc.)
5. **Audit Trail**: ✅ Logs events with `entityType=AUDIT`, action, actorId

---

## API Endpoint Testing

### Test Scenario 1: Audit Listing with Role-Based Filtering

**Endpoint**: `GET /api/v1/audits`

#### Test 1.1: CFO/CXO_TEAM See All Audits
```bash
# Login as CFO
curl -c /tmp/cookies.txt -X POST http://localhost:3005/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"cfo@example.com","password":"[password]"}'

# List all audits
curl -b /tmp/cookies.txt http://localhost:3005/api/v1/audits
```

**Expected**: Returns all audits in the system without filtering

#### Test 1.2: AUDIT_HEAD Sees Assigned Audits
```bash
# Login as Audit Head
curl -c /tmp/cookies.txt -X POST http://localhost:3005/api/auth/signin \
  -H "Content-Type": application/json" \
  -d '{"email":"audithead@example.com","password":"[password]"}'

# List audits
curl -b /tmp/cookies.txt http://localhost:3005/api/v1/audits
```

**Expected**: Returns only audits where `auditHeadId` matches user ID, plus historical audits per visibility rules

#### Test 1.3: AUDITOR Sees Assigned Audits
```bash
# Login as Auditor
curl -c /tmp/cookies.txt -X POST http://localhost:3005/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"auditor@example.com","password":"[password]"}'

# List audits
curl -b /tmp/cookies.txt http://localhost:3005/api/v1/audits
```

**Expected**: Returns only audits with AuditAssignment records for this user, plus historical per visibility

#### Test 1.4: AUDITEE Blocked from Listing
```bash
# Login as Auditee (if exists)
# List audits - should return 403
```

**Expected**: `403 Forbidden` error

---

### Test Scenario 2: Audit Creation (CFO/CXO Only)

**Endpoint**: `POST /api/v1/audits`

#### Test 2.1: CFO Can Create Audit
```bash
# As CFO
curl -b /tmp/cookies.txt -X POST http://localhost:3005/api/v1/audits \
  -H "Content-Type: application/json" \
  -d '{
    "plantId": "test-plant-1",
    "title": "Q2 2025 Compliance Audit",
    "purpose": "Annual compliance review"
  }'
```

**Expected**:
- Status: 200 OK
- Returns created audit object
- Audit trail logged with action=CREATED

#### Test 2.2: AUDITOR Cannot Create Audit
```bash
# As Auditor
curl -b /tmp/cookies.txt -X POST http://localhost:3005/api/v1/audits \
  -H "Content-Type: application/json" \
  -d '{
    "plantId": "test-plant-1",
    "title": "Unauthorized Audit"
  }'
```

**Expected**: `403 Forbidden` error with message "Forbidden"

---

### Test Scenario 3: Lock/Unlock/Complete Operations

**Audit ID for testing**: `test-audit-1`

#### Test 3.1: Lock Audit (CFO/CXO Only)
```bash
# As CFO
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/lock
```

**Expected**:
- Status: 200 OK
- Response: `{"ok": true, "audit": {...}}`
- Audit fields set: `isLocked=true`, `lockedAt`, `lockedById`
- Audit trail logged: action=LOCKED

#### Test 3.2: Attempt to Edit Locked Audit as CXO (Should Fail)
```bash
# As CXO_TEAM
curl -b /tmp/cookies.txt -X PATCH \
  http://localhost:3005/api/v1/audits/test-audit-1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Modified Title"}'
```

**Expected**: `403 Forbidden` with error "Audit is locked"

#### Test 3.3: CFO Can Edit Locked Audit (Override)
```bash
# As CFO
curl -b /tmp/cookies.txt -X PATCH \
  http://localhost:3005/api/v1/audits/test-audit-1 \
  -H "Content-Type: application/json" \
  -d '{"title": "CFO Override Edit"}'
```

**Expected**: 200 OK - CFO can edit despite lock

#### Test 3.4: Unlock Audit
```bash
# As CFO or CXO
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/unlock
```

**Expected**:
- Status: 200 OK
- Fields cleared: `isLocked=false`, `lockedAt=null`, `lockedById=null`
- Audit trail logged: action=UNLOCKED

#### Test 3.5: Complete Audit (Auto-Locks)
```bash
# As CFO or CXO
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/complete
```

**Expected**:
- Status: 200 OK
- Fields set: `completedAt`, `completedById`, `isLocked=true`, `lockedAt`, `lockedById`
- Audit trail logged: action=COMPLETED with diff containing `autoLocked: true`

#### Test 3.6: Cannot Complete Already-Completed Audit
```bash
# Try to complete again
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/complete
```

**Expected**: `400 Bad Request` with error "Audit is already completed"

---

### Test Scenario 4: Visibility Rules Configuration

**Endpoint**: `POST /api/v1/audits/{id}/visibility`

#### Test 4.1: Set Visibility Rule - "last_12m"
```bash
# As CFO or CXO
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/visibility \
  -H "Content-Type: application/json" \
  -d '{"rules": "last_12m"}'
```

**Expected**:
- Status: 200 OK
- `visibilityRules` field set to `"last_12m"`
- Audit trail logged: action=VISIBILITY_UPDATED

#### Test 4.2: Set Visibility Rule - "show_all"
```bash
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/visibility \
  -H "Content-Type: application/json" \
  -d '{"rules": "show_all"}'
```

**Expected**: 200 OK, rules updated

#### Test 4.3: Set Visibility Rule - Explicit Audit IDs
```bash
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/visibility \
  -H "Content-Type: application/json" \
  -d '{
    "rules": {
      "explicit": {
        "auditIds": ["test-audit-1", "audit-2", "audit-3"]
      }
    }
  }'
```

**Expected**: 200 OK, rules updated with explicit array

#### Test 4.4: Invalid Visibility Rule
```bash
curl -b /tmp/cookies.txt -X POST \
  http://localhost:3005/api/v1/audits/test-audit-1/visibility \
  -H "Content-Type: application/json" \
  -d '{"rules": "invalid_rule"}'
```

**Expected**: `400 Bad Request` with error "Invalid visibility rules format"

#### Test 4.5: Get Visibility Rules
```bash
# Any authenticated user
curl -b /tmp/cookies.txt \
  http://localhost:3005/api/v1/audits/test-audit-1/visibility
```

**Expected**: `{"ok": true, "visibilityRules": "last_12m"}`

---

### Test Scenario 5: Audit Detail Access Control

**Endpoint**: `GET /api/v1/audits/{id}`

#### Test 5.1: CFO/CXO Can View Any Audit
```bash
# As CFO
curl -b /tmp/cookies.txt http://localhost:3005/api/v1/audits/test-audit-1
```

**Expected**: 200 OK with full audit details

#### Test 5.2: Audit Head Can View Assigned Audit
```bash
# As Audit Head (assigned to test-audit-1)
curl -b /tmp/cookies.txt http://localhost:3005/api/v1/audits/test-audit-1
```

**Expected**: 200 OK with audit details

#### Test 5.3: Auditor Can View Assigned Audit
```bash
# As Auditor (assigned via AuditAssignment)
curl -b /tmp/cookies.txt http://localhost:3005/api/v1/audits/test-audit-1
```

**Expected**: 200 OK with audit details

#### Test 5.4: Unassigned User Cannot View Audit
```bash
# As Auditor NOT assigned to this audit
curl -b /tmp/cookies.txt http://localhost:3005/api/v1/audits/some-other-audit
```

**Expected**: `403 Forbidden`

---

## Audit Trail Verification

### Check Logged Events

```bash
# Via psql
psql postgresql://postgres:audit123@localhost:5432/audit_platform -c \
  "SELECT id, \"entityType\", \"entityId\", action, \"actorId\", \"createdAt\"
   FROM \"AuditEvent\"
   WHERE \"entityType\" = 'AUDIT'
   ORDER BY \"createdAt\" DESC
   LIMIT 10;"
```

**Expected Events**:
- `CREATED` - When audit is created
- `UPDATED` - When audit is edited
- `LOCKED` - When audit is locked
- `UNLOCKED` - When audit is unlocked
- `COMPLETED` - When audit is marked complete
- `VISIBILITY_UPDATED` - When visibility rules are set

Each event should have:
- `entityId` = audit ID
- `actorId` = user who performed the action
- `diff` = JSON object with relevant changes

---

## Browser-Based Testing (Recommended)

For easier testing with proper session management:

1. **Start the development server** (already running on port 3005)

2. **Open browser**: http://localhost:3005

3. **Login as different users**:
   - CFO: `cfo@example.com`
   - CXO: `cxo@example.com`
   - Audit Head: `audithead@example.com`
   - Auditor: `auditor@example.com`

4. **Test via Browser DevTools Console**:

```javascript
// Example: Lock audit
fetch('/api/v1/audits/test-audit-1/lock', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log);

// Example: Set visibility
fetch('/api/v1/audits/test-audit-1/visibility', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({rules: 'last_12m'}),
  credentials: 'include'
}).then(r => r.json()).then(console.log);

// Example: List audits (test filtering)
fetch('/api/v1/audits', {
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

---

## Test Results Summary

### ✅ Verified Implementations

| Feature | Status | Notes |
|---------|--------|-------|
| Audit Listing - CFO/CXO See All | ✅ | Lines 42-43 in route.ts |
| Audit Listing - AUDIT_HEAD Filtered | ✅ | Lines 44-49 in route.ts |
| Audit Listing - AUDITOR Filtered | ✅ | Lines 50-56 in route.ts |
| Audit Listing - AUDITEE Blocked | ✅ | Lines 27-29 in route.ts |
| Visibility Rules Applied | ✅ | Lines 68-93 in route.ts |
| Audit Creation - CFO/CXO Only | ✅ | assertCFOOrCXOTeam() |
| Audit Creation - Audit Trail | ✅ | writeAuditEvent() called |
| Audit Detail - Access Control | ✅ | Lines 40-49 in [id]/route.ts |
| Audit Update - Lock Enforcement | ✅ | Lines 76-88 in [id]/route.ts |
| Audit Update - Audit Trail | ✅ | Lines 112-118 in [id]/route.ts |
| Lock Endpoint - Functionality | ✅ | lock/route.ts complete |
| Lock Endpoint - Audit Trail | ✅ | writeAuditEvent() called |
| Unlock Endpoint - Functionality | ✅ | unlock/route.ts complete |
| Unlock Endpoint - Warning Policy | ✅ | Lines 41-43 in unlock/route.ts |
| Complete Endpoint - Auto-Lock | ✅ | Lines 42-48 in complete/route.ts |
| Complete Endpoint - Idempotency | ✅ | Lines 34-36 in complete/route.ts |
| Visibility Endpoint - Validation | ✅ | Zod schema validation |
| Visibility Endpoint - GET/POST | ✅ | Both handlers implemented |

---

## Known Limitations

1. **Authentication**: Browser-based testing is more practical than curl due to NextAuth session management
2. **WebSocket**: Audit changes don't broadcast via WebSocket (by design - not needed for audit metadata)
3. **Migration**: This is MVP - no backward compatibility with old ADMIN/AUDITOR roles needed

---

## Next Steps

1. **Manual Browser Testing**: Test via browser DevTools for full session flow
2. **Integration Tests**: Consider adding Playwright tests for automated verification
3. **UI Implementation**: Update UI components to show lock/complete/visibility controls
4. **Documentation**: Update API docs with new endpoints

---

**Testing Status**: Implementation verified at code and database level
**Date Completed**: 2025-01-22
**Tested By**: Claude Code Development Agent
