# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Audit Platform** built with Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL, and WebSockets. The application manages internal audits with observations, approvals, checklists, and real-time collaboration features.

## Development Commands

### Default Login Credentials

After running `npm run db:seed`, use these credentials to login:

- **CFO**: cfo@example.com / cfo123
- **CXO Team**: cxo@example.com / cxo123
- **Audit Head**: audithead@example.com / audithead123
- **Auditor**: auditor@example.com / auditor123
- **Auditee**: auditee@example.com / auditee123
- **Guest**: guest@example.com / guest123

### Core Commands
- `npm run dev` - Start development server (Next.js on port 3005)
- `npm run build` - Build for production
- `npm start` - Start production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint

### Database Commands
- `npx prisma migrate dev` - Create and apply migrations (development)
- `npx prisma migrate deploy` - Apply migrations (production)
- `npx prisma db push` - Push schema changes without migrations
- `npx prisma studio` - Open Prisma Studio for database GUI
- `npm run db:seed` - Seed database with initial data

### WebSocket Server
- `npm run ws:dev` - Run WebSocket server in watch mode (port 3001)
- `npm run ws:start` - Run WebSocket server in production

### Production
- `npm run build:prod` - Typecheck and build
- `npm run start:prod` - Start both Next.js app and WebSocket server
- `npm run start:standalone` - Start Next.js standalone server

## Architecture

### Dual-Server Architecture

The application runs **two separate servers**:

1. **Next.js Application (port 3005)** - Main web application with:
   - App Router pages in `src/app/`
   - API routes in `src/app/api/`
   - Server components and actions
   - NextAuth v5 authentication

2. **WebSocket Server (port 3001)** - Standalone Node.js server:
   - Entry point: `ws-server.ts` → `src/websocket/server.ts`
   - Handles real-time updates for observations, presence, and notifications
   - Token-based authentication (JWT)
   - Room-based message routing

**Important**: Both servers must run concurrently for full functionality. Use `npm run start:prod` or PM2 ecosystem config for production.

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, invite)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── audits/
│   │   ├── observations/
│   │   ├── checklists/
│   │   ├── plants/
│   │   ├── reports/
│   │   └── admin/
│   └── api/               # API routes
│       ├── auth/          # NextAuth endpoints
│       ├── health/        # Health check
│       └── v1/            # Versioned API routes
├── components/            # React components
├── contexts/              # React contexts (WebSocket)
├── lib/                   # Core libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── rbac.ts           # Role-based access control
│   ├── scope.ts          # Permission scoping
│   ├── s3.ts             # AWS S3 helpers
│   └── websocket/        # WebSocket client utilities
├── server/                # Server-side utilities
│   ├── db.ts             # Prisma client singleton
│   └── auditTrail.ts     # Audit event logging
├── types/                 # TypeScript type definitions
└── websocket/             # WebSocket server implementation
    ├── server.ts         # Main WS server
    ├── handlers.ts       # Message handlers
    ├── rooms.ts          # Room management
    ├── broadcast.ts      # Broadcasting utilities
    ├── auth.ts           # WS token verification
    └── types.ts          # WS message types
```

### Database Schema (Prisma)

Key entities and relationships:

- **User** - Users with RBAC v2 roles (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
- **Plant** - Facilities being audited
- **Audit** - Audit sessions with assignments and checklists
- **Observation** - Audit findings with approval workflow
- **Checklist** - Audit checklists with items
- **Approval** - Multi-stage approval for observations
- **AuditEvent** - Audit trail for all entity changes
- **GuestInvite** - Token-based guest invitations
- **ObservationChangeRequest** - Change request workflow
- **RunningNote** - Notes on observations
- **ObservationAssignment** - Auditee assignments to observations

Schema location: `prisma/schema.prisma`

### Authentication & Authorization

**NextAuth v5** (auth.js) with:
- Credentials provider (email/password + bcrypt)
- JWT session strategy
- Session timeouts: absolute (24h default) and idle (15min default)
- Configured in `src/lib/auth.ts`

**Role-Based Access Control (RBAC v2)**:
- **CFO** - Organization-level superuser with full access (short-circuits all permission checks)
- **CXO_TEAM** - Manages plants, audits, assigns users, configures visibility
- **AUDIT_HEAD** - Leads audits, approves/rejects observations, can create observations
- **AUDITOR** - Creates and edits draft observations, submits for approval
- **AUDITEE** - Assigned to observations, edits designated fields only
- **GUEST** - Read-only access with scope restrictions (optional)

Permission checks in `src/lib/rbac.ts`
Scope-based restrictions in `src/lib/scope.ts`

**Important RBAC Patterns**:
- Use `assert*` functions in API routes (throw 403 on unauthorized)
- Use `is*` predicates for boolean checks
- CFO bypasses all permission checks (short-circuit pattern)
- Audit heads inherit auditor capabilities

**WebSocket Authentication**:
- JWT tokens generated in API routes
- Verified on WebSocket connection via query parameter
- Separate auth logic in `src/websocket/auth.ts`

### WebSocket System

**Client Connection Flow**:
1. Client requests token from `/api/v1/websocket/token`
2. Connects to `ws://[host]:3001?token=<jwt>`
3. Server verifies token and establishes authenticated connection
4. Client joins rooms for specific entities (e.g., observation ID)

**Message Types**:
- `join_room` / `leave_room` - Room management
- `observation_updated` - Real-time observation changes
- `presence` - User presence in rooms
- `notification` - System notifications

**Broadcasting from API Routes**:
- Use `src/websocket/broadcast.ts` utilities
- Functions: `notifyObservationUpdate`, `notifyFieldLockChange`, `notifyApprovalStatusChange`, `notifyChangeRequestCreated`
- Direct HTTP broadcast endpoint: `/api/v1/websocket/broadcast`

### Path Aliases

TypeScript path mapping (tsconfig.json):
- `@/*` → `./src/*`

Example: `import { prisma } from "@/server/db"`

## Environment Configuration

Required environment variables (see `.env.example`):

**Core**:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application URL (http://localhost:3005 for dev)

**Session**:
- `IDLE_TIMEOUT_MINUTES` - Idle timeout (default: 15)
- `ABSOLUTE_SESSION_HOURS` - Max session duration (default: 24)

**WebSocket**:
- `WEBSOCKET_PORT` - WebSocket server port (default: 3001)
- `NEXT_PUBLIC_WEBSOCKET_URL` - Client-side WebSocket URL

**S3 (optional)**:
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`, `S3_REGION`

**Seeding**:
- Role-specific credentials: `CFO_EMAIL`, `CFO_PASSWORD`, `CFO_NAME`
- Similarly for CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST

## Database Setup

**IMPORTANT**: This project uses PostgreSQL running in a Docker container named `audit-postgres`.

### Starting the Database
```bash
docker start audit-postgres
docker ps | grep audit-postgres  # verify it's running
```

### Connection Details
- **Host**: localhost
- **Port**: 5432
- **Database**: audit_platform
- **User**: postgres
- **Password**: audit123
- **Connection String**: `postgresql://postgres:audit123@localhost:5432/audit_platform`

If Homebrew PostgreSQL is running, stop it to avoid conflicts:
```bash
brew services stop postgresql@14
```

## Deployment

The application uses **PM2** for process management (see `ecosystem.config.js`).

### Quick Deploy:
```bash
npm run build:prod
pm2 start ecosystem.config.js
pm2 save
```

### Deployment Options:
1. **PM2** (recommended) - Manages both Next.js and WebSocket processes
2. **Systemd** - Service files in `deploy/` directory
3. **Docker** - Dockerfile and docker-compose.yml available

Full deployment guide: `DEPLOYMENT.md`

### Production Considerations:
- Next.js standalone output is available but commented out (caused clientReferenceManifest errors)
- Nginx reverse proxy recommended for production (config in DEPLOYMENT.md)
- Firewall must allow ports 3000 (Next.js) and 3001 (WebSocket)
- Set `NODE_ENV=production` for both processes
- Application runs on port 3005 in development, 3000 in production

## Key Implementation Notes

### Real-time Updates
When modifying observations or other entities that need real-time updates:
1. Make database changes via Prisma
2. Broadcast WebSocket message using `src/websocket/broadcast.ts`
3. Clients listening in the room receive instant updates

Example:
```typescript
import { notifyObservationUpdate } from "@/websocket/broadcast";
// After updating observation in database
notifyObservationUpdate(observationId, { field: "value" });
```

### Approval Workflow
Observations go through approval stages (DRAFT → SUBMITTED → APPROVED/REJECTED). Check `approvalStatus` field and ensure RBAC permissions are enforced.

### Audit Trail
All significant actions are logged to `AuditEvent` table via `writeAuditEvent()` from `src/server/auditTrail.ts`. This function never throws errors.

Example:
```typescript
import { writeAuditEvent } from "@/server/auditTrail";
await writeAuditEvent({
  entityType: "OBSERVATION",
  entityId: obs.id,
  action: "UPDATE",
  actorId: session.user.id,
  diff: { changes }
});
```

### File Uploads
S3 helpers are in `src/lib/s3.ts`. Attachments are stored with metadata in `ObservationAttachment` table (kind: ANNEXURE or MGMT_DOC).

### Guest Access
Guests can be invited via `GuestInvite` tokens with optional scope restrictions. Implement scope checks using `src/lib/scope.ts`.

Functions:
- `getUserScope(userId)` - Get user's scope from invite
- `buildScopeWhere(scope)` - Build Prisma where clause for scope
- `isObservationInScope(obs, scope)` - Check if observation is in scope

## Common Patterns

### Database Queries
Always use the shared Prisma client:
```typescript
import { prisma } from "@/server/db";
```

### Protected API Routes
```typescript
import { auth } from "@/lib/auth";
import { assertAuditorOrAuditHead } from "@/lib/rbac";

const session = await auth();
if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

assertAuditorOrAuditHead(session.user.role); // Throws 403 if unauthorized
```

### WebSocket Broadcasting from API Routes
```typescript
import { notifyObservationUpdate } from "@/websocket/broadcast";
await notifyObservationUpdate(observationId, {
  field: "status",
  value: "SUBMITTED"
});
```

### Checking Permissions
```typescript
import { isCFO, canApproveObservations } from "@/lib/rbac";

// Predicate (safe to call anywhere)
if (canApproveObservations(session.user.role)) {
  // Show approve button
}

// Assertion (throws error in API routes)
assertAuditHead(session.user.role);
```

## Testing

The codebase does not currently have automated tests. When adding tests:
- Use standard Next.js testing setup (Jest + React Testing Library)
- Test WebSocket handlers separately from API routes
- Consider integration tests for the dual-server architecture
