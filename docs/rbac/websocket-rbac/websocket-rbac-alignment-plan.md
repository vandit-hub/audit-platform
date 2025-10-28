# WebSocket RBAC v2 Alignment Plan

## Executive Summary

### Problem Statement
The WebSocket authentication system in `src/websocket/auth.ts` is **critically out of sync** with the RBAC v2 architecture implemented in `src/lib/rbac.ts`. The `canAccessObservation()` function contains outdated logic that:
- References a non-existent `ADMIN` role
- Does not recognize `CFO`, `CXO_TEAM`, or properly handle `AUDIT_HEAD`
- Incorrectly validates `AUDITOR`, `AUDITEE`, and `GUEST` access

### Impact
**Critical:** The following roles **cannot access observation rooms** via WebSocket:
- **CFO** - Denied access to all observations (should have full access)
- **CXO_TEAM** - Denied access to all observations (should see all)
- **AUDIT_HEAD** - Incomplete access (missing auditHeadId check)
- **AUDITEE** - Can only see published observations (should see assigned observations)
- **GUEST** - Cannot access scoped observations (only published ones)

**Consequence:** Real-time features (live updates, presence, field locking) are broken for most users.

### Recommended Solution
**Leverage existing `src/lib/rbac-queries.ts`** which already implements the correct RBAC logic used by API routes. This creates a single source of truth and eliminates code duplication.

---

## Current State Analysis

### 1. RBAC v2 Architecture (`src/lib/rbac.ts`)

#### Role Definitions
| Role | Description | Key Capabilities |
|------|-------------|------------------|
| **CFO** | Organization superuser | Full access to ALL operations (short-circuits all checks) |
| **CXO_TEAM** | Plant/audit managers | Manages plants, audits, assignments; sees all observations |
| **AUDIT_HEAD** | Audit leaders | Leads audits, approves/rejects observations, inherits auditor capabilities |
| **AUDITOR** | Audit performers | Creates/edits draft observations, submits for approval |
| **AUDITEE** | Observation assignees | Edits designated fields only (even when approved if audit unlocked) |
| **GUEST** | External viewers | Read-only access with optional scope restrictions |

#### Critical Patterns

**1. CFO Short-Circuit Pattern**
```typescript
function assertAuditorOrAuditHead(role: string) {
  if (isCFO(role)) return; // CFO short-circuit - checked FIRST
  if (role !== "AUDITOR" && role !== "AUDIT_HEAD") {
    throw new Error("Forbidden: Requires AUDITOR or AUDIT_HEAD role");
  }
}
```
- CFO is always checked **first** in every assertion function
- Returns immediately if CFO, bypassing all other checks
- Implements superuser pattern without special-case logic everywhere

**2. AUDIT_HEAD Inheritance**
```typescript
function isAuditorOrAuditHead(role: string): boolean {
  return role === "AUDITOR" || role === "AUDIT_HEAD";
}
```
- AUDIT_HEAD can perform all AUDITOR operations
- Plus additional capabilities: approve, reject, delete observations
- Dual access path: either as audit head OR via audit assignment

**3. CXO_TEAM All-Access**
- Can view ALL observations and audits (like CFO)
- Cannot author or approve observations
- Focus: organizational structure management

#### Available Functions
**Predicates (boolean checks):**
- `isCFO(role)`, `isCXOTeam(role)`, `isAuditHead(role)`, `isAuditor(role)`, `isAuditee(role)`, `isGuest(role)`
- `isAuditorOrAuditHead(role)`, `isCFOOrCXOTeam(role)`

**Assertions (throw 403 on fail):**
- `assertCFO(role)`, `assertCFOOrCXOTeam(role)`, `assertAuditHead(role)`
- `assertAuditorOrAuditHead(role)`, `assertCFOOrCXOOrAuditHead(role)`, `assertAnyAuditor(role)`

**Capability Checks:**
- `canManageAudits(role)`, `canAuthorObservations(role)`, `canApproveObservations(role)`

### 2. Scope System (`src/lib/scope.ts`)

#### Purpose
Provides fine-grained access control for **GUEST** role beyond published+approved observations.

#### Scope Structure
```typescript
interface Scope {
  observationIds?: string[];  // Specific observation IDs
  auditIds?: string[];        // All observations in these audits
}
```

#### Functions
1. **`getUserScope(userId: string): Promise<Scope>`**
   - Fetches most recently redeemed GuestInvite's scope
   - Returns empty scope if no invite or no scope defined

2. **`buildScopeWhere(scope: Scope): Prisma.ObservationWhereInput`**
   - Builds Prisma OR clause for filtering
   - Used in list queries to pre-filter observations

3. **`isObservationInScope(obs: {id: string, auditId: string}, scope: Scope): boolean`**
   - Boolean check for single observation
   - Used in detail views and WebSocket auth

#### Usage Pattern
```typescript
// GUEST access logic (from API routes)
if (isGuest(role)) {
  const scope = await getUserScope(session.user.id);
  const inScope = isObservationInScope({ id: obs.id, auditId: obs.auditId }, scope);
  const isPublishedApproved = obs.approvalStatus === "APPROVED" && obs.isPublished;

  if (!inScope && !isPublishedApproved) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
```

### 3. Database Schema (Relevant Tables)

#### GuestInvite
```prisma
model GuestInvite {
  id           String    @id @default(cuid())
  email        String
  role         Role      @default(GUEST)
  token        String    @unique
  scope        Json?     // { observationIds?: string[], auditIds?: string[] }
  expiresAt    DateTime
  invitedById  String?
  redeemedById String?
  redeemedAt   DateTime?
  createdAt    DateTime  @default(now())
}
```

#### ObservationAssignment
```prisma
model ObservationAssignment {
  id            String      @id @default(cuid())
  observationId String
  auditeeId     String      // AUDITEE user assigned to observation
  assignedAt    DateTime    @default(now())
  assignedById  String?

  observation Observation @relation(fields: [observationId], references: [id])
  auditee     User        @relation(fields: [auditeeId], references: [id])

  @@unique([observationId, auditeeId])
  @@index([auditeeId])
}
```

#### AuditAssignment
```prisma
model AuditAssignment {
  id        String   @id @default(cuid())
  auditId   String
  auditorId String   // AUDITOR or AUDIT_HEAD assigned to audit

  audit   Audit @relation(fields: [auditId], references: [id])
  auditor User  @relation(fields: [auditorId], references: [id])

  @@unique([auditId, auditorId])
  @@index([auditorId])
}
```

### 4. API Route Authorization Pattern

**Reference:** `/src/app/api/v1/observations/[id]/route.ts` (GET handler)

```typescript
// CFO and CXO_TEAM: Full access
if (isCFO(role) || isCXOTeam(role)) {
  // Allow access to any observation
}

// AUDIT_HEAD: Dual access path
else if (isAuditHead(role)) {
  const isAuditHeadForThisAudit = observation.audit.auditHeadId === session.user.id;

  if (!isAuditHeadForThisAudit) {
    // Check if has AuditAssignment
    const hasAssignment = await prisma.auditAssignment.findFirst({
      where: {
        auditId: observation.auditId,
        auditorId: session.user.id
      }
    });

    if (!hasAssignment) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }
}

// AUDITOR: Check AuditAssignment
else if (isAuditor(role)) {
  const assignment = await prisma.auditAssignment.findFirst({
    where: {
      auditId: observation.auditId,
      auditorId: session.user.id
    }
  });

  if (!assignment) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}

// AUDITEE: Check ObservationAssignment
else if (isAuditee(role)) {
  const assignment = observation.assignments.find(
    a => a.auditeeId === session.user.id
  );

  if (!assignment) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}

// GUEST: Scope-based + published+approved
else if (isGuest(role)) {
  const scope = await getUserScope(session.user.id);
  const inScope = isObservationInScope(
    { id: observation.id, auditId: observation.audit.id },
    scope
  );
  const isPublishedApproved =
    observation.approvalStatus === "APPROVED" && observation.isPublished;

  if (!inScope && !isPublishedApproved) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}

else {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
```

### 5. Centralized RBAC Queries (`src/lib/rbac-queries.ts`)

This file provides reusable RBAC query logic for Agent integration and could be leveraged for WebSocket.

#### Key Function: `canAccessObservation()`
```typescript
export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  // Implementation matches API route logic exactly
  // Returns boolean instead of throwing errors
}
```

#### Benefits
- Single source of truth for RBAC observation access
- Already tested and aligned with API routes
- Used by Agent system successfully
- Reduces code duplication

### 6. Current WebSocket Auth (`src/websocket/auth.ts`)

#### Existing Implementation
```typescript
export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  try {
    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: {
        audit: {
          include: {
            assignments: true  // AuditAssignment[]
          }
        }
      }
    });

    if (!observation) {
      return false;
    }

    // OLD LOGIC - INCORRECT
    if (role === 'ADMIN') {
      return true;
    }

    if (role === 'AUDITOR') {
      const isAssigned = observation.audit.assignments.some(
        a => a.auditorId === userId
      );
      return isAssigned || observation.createdById === userId;
    }

    if (role === 'AUDITEE' || role === 'GUEST') {
      return observation.isPublished;
    }

    return false;
  } catch (error) {
    console.error('Error checking observation access:', error);
    return false;
  }
}
```

#### Issues Identified
1. **'ADMIN' role doesn't exist** in RBAC v2
2. **CFO not recognized** - will be denied (CRITICAL)
3. **CXO_TEAM not recognized** - will be denied (CRITICAL)
4. **AUDIT_HEAD not recognized** - treated as unknown role, denied (CRITICAL)
5. **AUDITOR logic incomplete** - uses `createdById` instead of proper assignment check
6. **AUDITEE logic wrong** - only checks `isPublished`, doesn't check ObservationAssignment table
7. **GUEST logic incomplete** - missing scope support

---

## Gap Analysis

### Detailed Comparison Table

| Role | API Route Logic | WebSocket Logic | Status | Severity |
|------|----------------|-----------------|--------|----------|
| **CFO** | Always allowed (short-circuit) | Not recognized → denied | ❌ BROKEN | 🔴 CRITICAL |
| **CXO_TEAM** | See all observations | Not recognized → denied | ❌ BROKEN | 🔴 CRITICAL |
| **AUDIT_HEAD** | Check `audit.auditHeadId === userId` OR `AuditAssignment` exists | Not recognized → denied | ❌ BROKEN | 🔴 CRITICAL |
| **AUDITOR** | Check `AuditAssignment` table | Checks `audit.assignments` array OR `createdById` | ⚠️ INCOMPLETE | 🟡 MODERATE |
| **AUDITEE** | Check `ObservationAssignment` table | Only checks `isPublished` | ❌ BROKEN | 🔴 CRITICAL |
| **GUEST** | Scope check + published+approved | Only checks `isPublished` | ❌ BROKEN | 🟠 MAJOR |
| **ADMIN (legacy)** | Doesn't exist | Hardcoded `return true` | ❌ INCORRECT | 🟡 MODERATE |

### Impact Assessment

#### CFO Impact (CRITICAL)
- **Expected:** CFO can join any observation room for monitoring
- **Actual:** CFO receives "Access denied to this observation" error
- **Business Impact:** Organization superuser cannot use real-time features

#### CXO_TEAM Impact (CRITICAL)
- **Expected:** CXO_TEAM can monitor all observations for oversight
- **Actual:** Completely blocked from WebSocket features
- **Business Impact:** Cannot track audit progress in real-time

#### AUDIT_HEAD Impact (CRITICAL)
- **Expected:** Access audits where they are the head OR assigned
- **Actual:** Denied access even to audits they lead
- **Business Impact:** Audit leaders cannot collaborate in real-time

#### AUDITEE Impact (CRITICAL)
- **Expected:** Access observations they are assigned to
- **Actual:** Can only access published observations (ignores assignments)
- **Business Impact:** Cannot receive real-time updates on their assigned observations

#### GUEST Impact (MAJOR)
- **Expected:** Access scoped observations + published/approved ones
- **Actual:** Only published observations (scope ignored)
- **Business Impact:** Guests with special access grants cannot use those grants in real-time

#### AUDITOR Impact (MODERATE)
- **Expected:** Access via AuditAssignment table
- **Actual:** Uses `audit.assignments` array (same data) BUT also allows by `createdById` (incorrect)
- **Business Impact:** Mostly works but may allow unintended access

---

## Implementation Strategy

### Recommended Approach: Leverage `rbac-queries.ts`

**Strategy:** Import and use the existing `canAccessObservation()` function from `src/lib/rbac-queries.ts` instead of rewriting logic.

#### Advantages
1. **Single Source of Truth** - RBAC logic centralized in one place
2. **Automatic Sync** - WebSocket stays aligned with API routes automatically
3. **Already Tested** - Function is used by Agent system and API routes
4. **Less Code** - Reduces duplication and maintenance burden
5. **Future-Proof** - Changes to RBAC logic only need to be made once

#### Implementation
```typescript
// src/websocket/auth.ts
import { canAccessObservation as rbacCanAccessObservation } from '@/lib/rbac-queries';

/**
 * Check if user can access an observation via WebSocket.
 * Delegates to centralized RBAC logic in rbac-queries.ts.
 *
 * @param userId - User ID
 * @param role - User role from RBAC v2
 * @param observationId - Observation ID to check access for
 * @returns true if user can access, false otherwise
 */
export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  return rbacCanAccessObservation(userId, role, observationId);
}
```

### Alternative Approach: Rewrite in `auth.ts`

**Strategy:** Reimplement the logic directly in WebSocket auth file.

#### Advantages
1. **Self-Contained** - WebSocket auth has no external dependencies
2. **Explicit** - All logic visible in one file

#### Disadvantages
1. **Code Duplication** - Same logic exists in 3 places (API routes, rbac-queries, WebSocket)
2. **Maintenance Burden** - Must update 3 places when RBAC changes
3. **Risk of Drift** - WebSocket auth can become out of sync again

#### Implementation (if chosen)
```typescript
// src/websocket/auth.ts
import { prisma } from '@/server/db';
import {
  isCFO,
  isCXOTeam,
  isAuditHead,
  isAuditor,
  isAuditee,
  isGuest
} from '@/lib/rbac';
import { getUserScope, isObservationInScope } from '@/lib/scope';

export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  try {
    // CFO short-circuit - MUST be first
    if (isCFO(role)) {
      return true;
    }

    // Load observation with necessary relations
    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: {
        audit: {
          select: {
            id: true,
            auditHeadId: true,
            isLocked: true
          }
        },
        assignments: {  // ObservationAssignment
          select: {
            auditeeId: true
          }
        }
      }
    });

    if (!observation) {
      return false;
    }

    // CXO_TEAM sees all observations
    if (isCXOTeam(role)) {
      return true;
    }

    // AUDIT_HEAD: Check if audit head OR has assignment
    if (isAuditHead(role)) {
      // Path 1: User is the audit head for this audit
      const isAuditHeadForThisAudit = observation.audit.auditHeadId === userId;

      if (isAuditHeadForThisAudit) {
        return true;
      }

      // Path 2: User has an AuditAssignment for this audit
      const hasAssignment = await prisma.auditAssignment.findFirst({
        where: {
          auditId: observation.audit.id,
          auditorId: userId
        }
      });

      return !!hasAssignment;
    }

    // AUDITOR: Check AuditAssignment
    if (isAuditor(role)) {
      const assignment = await prisma.auditAssignment.findFirst({
        where: {
          auditId: observation.audit.id,
          auditorId: userId
        }
      });

      return !!assignment;
    }

    // AUDITEE: Check ObservationAssignment
    if (isAuditee(role)) {
      const assignment = observation.assignments.find(
        a => a.auditeeId === userId
      );

      return !!assignment;
    }

    // GUEST: Scope + published+approved
    if (isGuest(role)) {
      const scope = await getUserScope(userId);

      // Check if observation is in scope
      const inScope = isObservationInScope(
        {
          id: observation.id,
          auditId: observation.audit.id
        },
        scope
      );

      // Check if published and approved
      const isPublishedApproved =
        observation.approvalStatus === 'APPROVED' &&
        observation.isPublished;

      return inScope || isPublishedApproved;
    }

    // Unknown role - deny
    return false;

  } catch (error) {
    console.error('Error checking observation access:', error);
    return false;
  }
}
```

### Recommendation
**Use the Primary Approach** (leverage `rbac-queries.ts`) for all the advantages listed above.

---

## Detailed Implementation Steps

### Phase 1: Update WebSocket Auth

#### Step 1.1: Modify `src/websocket/auth.ts`

**Changes Required:**
1. Add import for `canAccessObservation` from `@/lib/rbac-queries`
2. Replace the entire `canAccessObservation` function
3. Add JSDoc comments explaining the delegation
4. Remove old observation loading logic (handled in rbac-queries now)

**Before:**
```typescript
export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  try {
    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: {
        audit: {
          include: {
            assignments: true
          }
        }
      }
    });

    if (!observation) {
      return false;
    }

    if (role === 'ADMIN') {
      return true;
    }

    if (role === 'AUDITOR') {
      const isAssigned = observation.audit.assignments.some(
        a => a.auditorId === userId
      );
      return isAssigned || observation.createdById === userId;
    }

    if (role === 'AUDITEE' || role === 'GUEST') {
      return observation.isPublished;
    }

    return false;
  } catch (error) {
    console.error('Error checking observation access:', error);
    return false;
  }
}
```

**After:**
```typescript
import { canAccessObservation as rbacCanAccessObservation } from '@/lib/rbac-queries';

/**
 * Check if user can access an observation via WebSocket.
 *
 * This function delegates to the centralized RBAC logic in rbac-queries.ts
 * to ensure WebSocket authorization stays in sync with API route authorization.
 *
 * Authorization rules:
 * - CFO: Full access to all observations (short-circuit)
 * - CXO_TEAM: Full access to all observations
 * - AUDIT_HEAD: Access if (audit.auditHeadId === userId) OR has AuditAssignment
 * - AUDITOR: Access if has AuditAssignment for the audit
 * - AUDITEE: Access if has ObservationAssignment for the observation
 * - GUEST: Access if observation is in scope OR (published AND approved)
 *
 * @param userId - User ID requesting access
 * @param role - User role from RBAC v2 (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
 * @param observationId - Observation ID to check access for
 * @returns Promise<boolean> - true if user can access, false otherwise
 */
export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  try {
    return await rbacCanAccessObservation(userId, role, observationId);
  } catch (error) {
    console.error('Error checking observation access:', error);
    return false;
  }
}
```

#### Step 1.2: Verify Import Statements

Ensure `src/websocket/auth.ts` has all necessary imports:
```typescript
import jwt from 'jsonwebtoken';
import { prisma } from '@/server/db';
import { canAccessObservation as rbacCanAccessObservation } from '@/lib/rbac-queries';

// Note: prisma import still needed for verifyWebSocketToken function
```

#### Step 1.3: Confirm No Breaking Changes

**Functions to Keep:**
- `verifyWebSocketToken()` - Token verification logic unchanged
- `JWTPayload` interface - Type definition unchanged

**Functions to Update:**
- `canAccessObservation()` - Delegate to rbac-queries

### Phase 2: Testing Strategy

#### Test Setup
1. Start both Next.js server and WebSocket server
2. Login with each role type
3. Create/access observations with various states
4. Monitor browser console for WebSocket errors
5. Verify room join success in WebSocket server logs

#### Test Cases

**Test Case 1: CFO Access**
```
Role: CFO
Observation: Any observation (draft, submitted, approved)
Expected: Successfully joins room
Verification: No console errors, presence updates received
```

**Test Case 2: CXO_TEAM Access**
```
Role: CXO_TEAM
Observation: Any observation
Expected: Successfully joins room
Verification: Can monitor all observations in real-time
```

**Test Case 3: AUDIT_HEAD as Head**
```
Role: AUDIT_HEAD
Observation: In audit where audit.auditHeadId = user.id
Expected: Successfully joins room
Verification: Audit head can access their audit's observations
```

**Test Case 4: AUDIT_HEAD via Assignment**
```
Role: AUDIT_HEAD
Observation: In audit where user has AuditAssignment (but not audit head)
Expected: Successfully joins room
Verification: AUDIT_HEAD can access via assignment path
```

**Test Case 5: AUDIT_HEAD Denied**
```
Role: AUDIT_HEAD
Observation: Not audit head AND no AuditAssignment
Expected: "Access denied" error
Verification: Cannot access unrelated audits
```

**Test Case 6: AUDITOR Access**
```
Role: AUDITOR
Observation: In audit where user has AuditAssignment
Expected: Successfully joins room
Verification: Assigned auditors can access observations
```

**Test Case 7: AUDITOR Denied**
```
Role: AUDITOR
Observation: No AuditAssignment for the audit
Expected: "Access denied" error
Verification: Cannot access unassigned audits
```

**Test Case 8: AUDITEE Access**
```
Role: AUDITEE
Observation: User has ObservationAssignment
Expected: Successfully joins room
Verification: Assigned auditees receive real-time updates
```

**Test Case 9: AUDITEE Denied**
```
Role: AUDITEE
Observation: No ObservationAssignment (even if published)
Expected: "Access denied" error
Verification: Cannot access non-assigned observations
```

**Test Case 10: GUEST Scoped Access**
```
Role: GUEST
Observation: In scope (via observationIds or auditIds)
Status: Any status (doesn't need to be published)
Expected: Successfully joins room
Verification: Scope grants work via WebSocket
```

**Test Case 11: GUEST Published Access**
```
Role: GUEST
Observation: Published + Approved (not in scope)
Expected: Successfully joins room
Verification: Guests can access published observations
```

**Test Case 12: GUEST Denied**
```
Role: GUEST
Observation: Not in scope, not published+approved
Expected: "Access denied" error
Verification: Cannot access restricted observations
```

#### Testing Checklist
- [ ] All 12 test cases pass
- [ ] No "Access denied" errors for valid access
- [ ] Presence updates work for all roles
- [ ] Real-time observation updates received
- [ ] WebSocket server logs show successful room joins
- [ ] No console errors in browser

### Phase 3: Documentation Updates

#### Update `CLAUDE.md`
Add section documenting WebSocket RBAC alignment:

```markdown
### WebSocket Authentication & Authorization

WebSocket authentication uses the same RBAC v2 logic as API routes through `src/lib/rbac-queries.ts`.

**Access Control:**
- Uses `canAccessObservation()` from rbac-queries.ts
- Single source of truth for observation access checks
- Automatically stays in sync with API route authorization

**Authorization Flow:**
1. Client fetches JWT token from `/api/v1/websocket/token`
2. Client connects with token: `ws://[host]:3001?token=<jwt>`
3. Server verifies token in `verifyWebSocketToken()`
4. On room join, server checks access via `canAccessObservation()`
5. Access granted/denied based on RBAC v2 rules

**Role-Specific Access:**
- CFO: All observations (short-circuit)
- CXO_TEAM: All observations
- AUDIT_HEAD: Observations where (audit head OR has AuditAssignment)
- AUDITOR: Observations where has AuditAssignment
- AUDITEE: Observations where has ObservationAssignment
- GUEST: Observations in scope OR (published + approved)
```

#### Update Inline Comments
Add comments in `src/websocket/handlers.ts` where `canAccessObservation` is called:

```typescript
// Check RBAC v2 permissions (delegates to rbac-queries.ts)
const hasAccess = await canAccessObservation(ws.userId, ws.userRole, observationId);
```

---

## Files to Modify

### Primary File
1. **`/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/websocket/auth.ts`**
   - Import `canAccessObservation` from `@/lib/rbac-queries`
   - Replace existing `canAccessObservation` function
   - Add JSDoc documentation
   - Keep `verifyWebSocketToken` unchanged

### Documentation Files
2. **`/Users/vandit/Desktop/Projects/EZAudit/audit-platform/CLAUDE.md`**
   - Add WebSocket RBAC section
   - Document authorization flow
   - Explain role-specific access rules

### Reference Files (No Changes Needed)
3. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac.ts` - RBAC predicates
4. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts` - Centralized queries
5. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/scope.ts` - Guest scope logic
6. `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/websocket/handlers.ts` - Uses auth.ts functions

---

## Code Changes Summary

### Complete Diff for `src/websocket/auth.ts`

```diff
 import jwt from 'jsonwebtoken';
 import { prisma } from '@/server/db';
+import { canAccessObservation as rbacCanAccessObservation } from '@/lib/rbac-queries';

 export interface JWTPayload {
   userId: string;
@@ ... (verifyWebSocketToken function unchanged)

+/**
+ * Check if user can access an observation via WebSocket.
+ *
+ * This function delegates to the centralized RBAC logic in rbac-queries.ts
+ * to ensure WebSocket authorization stays in sync with API route authorization.
+ *
+ * Authorization rules:
+ * - CFO: Full access to all observations (short-circuit)
+ * - CXO_TEAM: Full access to all observations
+ * - AUDIT_HEAD: Access if (audit.auditHeadId === userId) OR has AuditAssignment
+ * - AUDITOR: Access if has AuditAssignment for the audit
+ * - AUDITEE: Access if has ObservationAssignment for the observation
+ * - GUEST: Access if observation is in scope OR (published AND approved)
+ *
+ * @param userId - User ID requesting access
+ * @param role - User role from RBAC v2 (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
+ * @param observationId - Observation ID to check access for
+ * @returns Promise<boolean> - true if user can access, false otherwise
+ */
 export async function canAccessObservation(
   userId: string,
   role: string,
   observationId: string
 ): Promise<boolean> {
   try {
-    const observation = await prisma.observation.findUnique({
-      where: { id: observationId },
-      include: {
-        audit: {
-          include: {
-            assignments: true
-          }
-        }
-      }
-    });
-
-    if (!observation) {
-      return false;
-    }
-
-    if (role === 'ADMIN') {
-      return true;
-    }
-
-    if (role === 'AUDITOR') {
-      const isAssigned = observation.audit.assignments.some(
-        a => a.auditorId === userId
-      );
-      return isAssigned || observation.createdById === userId;
-    }
-
-    if (role === 'AUDITEE' || role === 'GUEST') {
-      return observation.isPublished;
-    }
-
-    return false;
+    return await rbacCanAccessObservation(userId, role, observationId);
   } catch (error) {
     console.error('Error checking observation access:', error);
     return false;
   }
 }
```

---

## Future Considerations

### 1. Keeping WebSocket Auth in Sync

**Current Solution:**
- WebSocket delegates to `rbac-queries.ts`
- Single source of truth for RBAC logic
- Changes in one place affect all consumers

**Future RBAC Changes:**
When RBAC logic changes (new roles, new access patterns), update only:
1. `src/lib/rbac.ts` - Add new predicates/assertions
2. `src/lib/rbac-queries.ts` - Update query logic
3. API routes - Use updated functions

WebSocket automatically inherits changes through delegation.

### 2. Audit Access Control

Currently only observation access is controlled. Future work may include:
- `canAccessAudit()` for audit-level rooms
- `canAccessPlant()` for plant-level rooms
- `canAccessChecklist()` for checklist rooms

**Implementation Pattern:**
```typescript
// In websocket/auth.ts
export async function canAccessAudit(
  userId: string,
  role: string,
  auditId: string
): Promise<boolean> {
  try {
    return await rbacCanAccessAudit(userId, role, auditId);
  } catch (error) {
    console.error('Error checking audit access:', error);
    return false;
  }
}
```

### 3. Performance Optimization

**Current Approach:**
- Checks access on every room join
- Queries database for assignments and scopes

**Future Optimization:**
- Cache user assignments in WebSocket connection metadata
- Refresh cache on assignment changes
- Reduce database queries for repeated access checks

**Implementation Idea:**
```typescript
interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  userRole: string;
  userEmail: string;

  // Cached permissions
  auditAssignments?: string[];      // Cached audit IDs
  observationAssignments?: string[]; // Cached observation IDs
  guestScope?: Scope;                // Cached scope
  lastPermissionRefresh?: number;    // Timestamp
}
```

### 4. Centralized Authorization Pattern

**Principle:** All authorization logic should flow through RBAC modules, never duplicated.

**Pattern to Follow:**
```
┌─────────────────┐
│   API Routes    │───┐
└─────────────────┘   │
                      │    ┌──────────────────┐
┌─────────────────┐   ├───▶│ rbac-queries.ts  │
│ WebSocket Auth  │───┘    │ (RBAC v2 logic)  │◀─┐
└─────────────────┘        └──────────────────┘  │
                                                  │
┌─────────────────┐        ┌──────────────────┐  │
│  Agent System   │───────▶│    rbac.ts       │──┘
└─────────────────┘        │  (Predicates &   │
                           │   Assertions)    │
                           └──────────────────┘
```

**Benefits:**
- Single source of truth
- Consistency across all access points
- Easier to test and maintain
- Reduces security vulnerabilities from logic drift

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review this plan with team
- [ ] Backup `src/websocket/auth.ts` (git commit before changes)
- [ ] Ensure development environment is running
- [ ] Clear any active WebSocket connections

### Implementation
- [ ] Update `src/websocket/auth.ts` with new implementation
- [ ] Add JSDoc comments as specified
- [ ] Verify imports are correct
- [ ] Check for TypeScript compilation errors

### Testing
- [ ] Run all 12 test cases listed in Phase 2
- [ ] Test with each role type (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
- [ ] Verify no console errors
- [ ] Check WebSocket server logs for successful room joins
- [ ] Test edge cases (expired tokens, deleted users, etc.)

### Documentation
- [ ] Update `CLAUDE.md` with WebSocket RBAC section
- [ ] Add inline comments in handlers.ts
- [ ] Document any issues or edge cases discovered

### Completion
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Git commit with descriptive message
- [ ] Mark this plan as completed

---

## Conclusion

This plan provides a comprehensive approach to aligning WebSocket authentication with RBAC v2. The recommended strategy leverages existing, tested code in `rbac-queries.ts` to create a single source of truth for authorization logic, ensuring consistency across API routes, WebSocket connections, and the Agent system.

**Key Benefits:**
- Fixes critical access issues for CFO, CXO_TEAM, AUDIT_HEAD, AUDITEE, and GUEST
- Eliminates code duplication
- Ensures future RBAC changes automatically propagate to WebSocket
- Minimal code changes required
- Reduces maintenance burden

**Expected Outcome:**
All roles will be able to access observation rooms according to RBAC v2 rules, enabling full real-time collaboration features across the application.
