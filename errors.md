# Build Errors - EZAudit Platform

**Last Updated:** September 24, 2025
**Commit:** b7491a8 - feat: Phase 4 - Reporting & Analytics Implementation
**Branch:** main

## Overview
The application has 47+ TypeScript/ESLint errors preventing successful production builds. The development server may run but pages fail to compile when accessed.

## Error Categories

### 1. TypeScript Errors (47 instances)
**Error:** `@typescript-eslint/no-explicit-any` - Unexpected any. Specify a different type.

#### Authentication Pages
- `./src/app/(auth)/accept-invite/page.tsx:29:19`
- `./src/app/(auth)/login/page.tsx:22:17`

#### Dashboard Pages
- `./src/app/(dashboard)/audits/[auditId]/page.tsx:45:58`
- `./src/app/(dashboard)/audits/page.tsx:65:19`
- `./src/app/(dashboard)/observations/[id]/page.tsx:49:38`
- `./src/app/(dashboard)/observations/[id]/page.tsx:92:35`
- `./src/app/(dashboard)/observations/[id]/page.tsx:92:55`
- `./src/app/(dashboard)/observations/[id]/page.tsx:369:120`
- `./src/app/(dashboard)/observations/page.tsx:83:38`
- `./src/app/(dashboard)/observations/page.tsx:126:19`
- `./src/app/(dashboard)/plants/page.tsx:37:19`

#### API Routes
- `./src/app/api/v1/audits/route.ts:25:35`
- `./src/app/api/v1/auth/invite/route.ts:34:29`
- `./src/app/api/v1/auth/invite/route.ts:43:27`
- `./src/app/api/v1/checklists/[id]/items/route.ts:41:43`
- `./src/app/api/v1/checklists/[id]/items/route.ts:42:33`
- `./src/app/api/v1/observations/[id]/approve/route.ts:24:39`
- `./src/app/api/v1/observations/[id]/approve/route.ts:28:52`
- `./src/app/api/v1/observations/[id]/attachments/route.ts:47:27`
- `./src/app/api/v1/observations/[id]/locks/route.ts:22:49`
- `./src/app/api/v1/observations/[id]/locks/route.ts:22:83`
- `./src/app/api/v1/observations/[id]/locks/route.ts:32:35`
- `./src/app/api/v1/observations/[id]/notes/route.ts:18:16`
- `./src/app/api/v1/observations/[id]/retest/route.ts:20:15`
- `./src/app/api/v1/observations/[id]/retest/route.ts:21:35`
- `./src/app/api/v1/observations/[id]/route.ts:68:29`
- `./src/app/api/v1/observations/[id]/route.ts:110:15`
- `./src/app/api/v1/observations/export/route.ts:8:23`
- `./src/app/api/v1/observations/export/route.ts:29:50`
- `./src/app/api/v1/observations/export/route.ts:30:60`
- `./src/app/api/v1/observations/export/route.ts:31:55`
- `./src/app/api/v1/observations/route.ts:37:50`
- `./src/app/api/v1/observations/route.ts:38:60`
- `./src/app/api/v1/observations/route.ts:39:55`
- `./src/app/api/v1/observations/route.ts:115:43`
- `./src/app/api/v1/observations/route.ts:116:43`
- `./src/app/api/v1/observations/route.ts:117:51`
- `./src/app/api/v1/users/route.ts:14:36`

#### Core Libraries
- `./src/lib/auth.ts:66:33`
- `./src/lib/auth.ts:67:31`
- `./src/lib/auth.ts:68:33`
- `./src/lib/auth.ts:89:26`
- `./src/lib/auth.ts:90:26`
- `./src/lib/auth.ts:91:21`
- `./src/lib/rbac.ts:25:14`
- `./src/lib/rbac.ts:33:14`
- `./src/lib/scope.ts:10:28`
- `./src/lib/scope.ts:15:10`
- `./src/lib/scope.ts:30:10`

#### Server Components
- `./src/server/auditTrail.ts:16:41`
- `./src/server/auditTrail.ts:19:29`

### 2. React/JSX Errors (1 instance)
**Error:** `react/no-unescaped-entities` - Apostrophe can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`

- `./src/app/(auth)/login/page.tsx:72:14`

### 3. React Hooks Warnings (5 instances)
**Error:** `react-hooks/exhaustive-deps` - Missing dependencies in useEffect

- `./src/app/(dashboard)/observations/[id]/page.tsx:90:91` - Missing dependency: 'load'
- `./src/app/(dashboard)/observations/page.tsx:108:32` - Missing dependency: 'load'
- `./src/app/(dashboard)/observations/page.tsx:109:95` - Missing dependency: 'loadRows'
- `./src/app/(dashboard)/reports/page.tsx:42:91` - Missing dependency: 'load'

**Unused eslint-disable:**
- `./src/app/(dashboard)/observations/[id]/page.tsx:90:29` - Unused eslint-disable directive
- `./src/app/(dashboard)/observations/page.tsx:109:33` - Unused eslint-disable directive
- `./src/server/db.ts:4:3` - Unused eslint-disable directive

### 4. Unused Variables/Imports (8 instances)
**Error:** `@typescript-eslint/no-unused-vars`

- `./src/app/api/v1/audits/[id]/route.ts:5:32` - 'assertAdmin' defined but never used
- `./src/app/api/v1/checklists/route.ts:12:27` - 'req' defined but never used
- `./src/app/api/v1/observations/[id]/actions/[actionId]/route.ts:62:11` - 'id' assigned but never used
- `./src/app/api/v1/observations/[id]/actions/route.ts:5:10` - 'isAdminOrAuditor' defined but never used
- `./src/app/api/v1/observations/[id]/attachments/presign/route.ts:5:10` - 'assertAdminOrAuditor' defined but never used
- `./src/app/api/v1/observations/route.ts:5:50` - 'isAuditee' defined but never used
- `./src/app/api/v1/observations/route.ts:5:61` - 'isGuest' defined but never used
- `./src/app/api/v1/reports/overview/route.ts:4:28` - 'isAuditee' defined but never used
- `./src/app/api/v1/reports/overview/route.ts:4:39` - 'isGuest' defined but never used
- `./src/types/next-auth.d.ts:1:8` - 'NextAuth' defined but never used

## Feedback Section

### 1. Missing New Observation Creation
New observation creation should be added on the observation page. Currently cannot see option to add a new one.

### 2. Admin Status Change Rights
Once an observation is created and saved and even approved or rejected, whatever, admin should have the rights to change from approved to rejected to published as many times as required by the admin.

### 3. Field Edit Permissions
An admin can change any field values at any time but the auditor can only change the values before the observation is accepted. Once the observation is accepted, whatever values are there should not be able to change. There should be a button for requesting the change which admin can either approve or deny. But auditor should not be able to change after it's accepted.

### 4. Remove Checklist Functionality
Can remove the functionality of checklist.

