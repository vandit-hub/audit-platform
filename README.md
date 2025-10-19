# Audit Platform

A comprehensive internal audit management system built with Next.js 15, featuring real-time collaboration, multi-stage approvals, and role-based access control.

## Features

- 🔐 **Role-Based Access Control** - ADMIN, AUDITOR, AUDITEE, and GUEST roles with granular permissions
- 📋 **Audit Management** - Create and manage audits with checklists and observations
- ✅ **Approval Workflow** - Multi-stage approval process for observations
- 🔄 **Real-time Updates** - WebSocket-based live updates for collaborative editing
- 📊 **Reporting** - Generate and export audit reports
- 🏭 **Plant Management** - Organize audits by facility/plant
- 👥 **Guest Access** - Invite external users with scoped permissions
- 📝 **Audit Trail** - Complete audit log of all system changes
- 📎 **File Attachments** - S3-based document storage
- 🔔 **Notifications** - Real-time system notifications

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth v5 (Auth.js)
- **Real-time**: WebSocket server (standalone)
- **Storage**: AWS S3 (optional)
- **Process Management**: PM2

## Prerequisites

- Node.js 20.9 or higher
- PostgreSQL 14+
- npm
- AWS S3 bucket (optional, for file attachments)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd audit-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Application URL (http://localhost:3000 for dev)
   - `WEBSOCKET_PORT` - WebSocket server port (default: 3001)
   - `NEXT_PUBLIC_WEBSOCKET_URL` - WebSocket URL for client (ws://localhost:3001 for dev)

   See `.env.example` for all available options.

4. **Set up the database**
   ```bash
   # Run migrations
   npx prisma migrate dev

   # Seed initial data
   npm run db:seed
   ```

## Default Credentials

After seeding, use these credentials to login:

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Admin    | admin@example.com      | admin123   |
| Auditor  | auditor@example.com    | auditor123 |
| Auditee  | auditee@example.com    | auditee123 |
| Guest    | guest@example.com      | guest123   |

**Note**: The seed script creates users based on environment variables. Make sure all the required variables are set in your `.env` file:
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- `AUDITOR_EMAIL`, `AUDITOR_PASSWORD`, `AUDITOR_NAME`
- `AUDITEE_EMAIL`, `AUDITEE_PASSWORD`, `AUDITEE_NAME`
- `GUEST_EMAIL`, `GUEST_PASSWORD`, `GUEST_NAME`

These are already configured in `.env.example` with the credentials shown above.

## Development

The application requires **two servers** running concurrently:

### Option 1: Run both servers separately

```bash
# Terminal 1 - Next.js app (port 3000)
npm run dev

# Terminal 2 - WebSocket server (port 3001)
npm run ws:dev
```

### Option 2: Use PM2 in development

```bash
pm2 start ecosystem.config.js
pm2 logs
```

Access the application at http://localhost:3000

## Project Structure

```
audit-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── contexts/              # React contexts (WebSocket)
│   ├── lib/                   # Core libraries
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── rbac.ts           # Role-based access control
│   │   └── websocket/        # WebSocket client utilities
│   ├── server/               # Server-side utilities
│   │   ├── db.ts            # Prisma client
│   │   └── auditTrail.ts    # Audit logging
│   ├── types/                # TypeScript types
│   └── websocket/            # WebSocket server
│       ├── server.ts        # Main WS server
│       └── handlers.ts      # Message handlers
├── prisma/
│   └── schema.prisma         # Database schema
├── ws-server.ts              # WebSocket server entry point
└── ecosystem.config.js       # PM2 configuration
```

## Available Scripts

### Development
- `npm run dev` - Start Next.js development server
- `npm run ws:dev` - Start WebSocket server in watch mode
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint

### Database
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma migrate deploy` - Apply migrations (production)
- `npx prisma db push` - Push schema changes without migrations
- `npx prisma studio` - Open Prisma Studio GUI
- `npm run db:seed` - Seed database with initial data

### Production
- `npm run build` - Build Next.js app
- `npm run build:prod` - Typecheck and build
- `npm run start` - Start production Next.js server
- `npm run ws:start` - Start production WebSocket server
- `npm run start:prod` - Start both servers (PM2 recommended)

## Architecture

### Dual-Server Architecture

The application uses two separate Node.js processes:

1. **Next.js Application (port 3000)**
   - Main web application
   - API routes and server actions
   - Server-side rendering
   - NextAuth authentication

2. **WebSocket Server (port 3001)**
   - Standalone Node.js server
   - Real-time updates for observations
   - User presence tracking
   - System notifications
   - JWT-based authentication

Both servers must run for full functionality. The WebSocket server is independent and can scale separately.

### Authentication

- **NextAuth v5** with credentials provider
- JWT sessions with configurable timeouts
- Idle timeout: 15 minutes (configurable)
- Absolute session: 24 hours (configurable)
- WebSocket uses separate JWT tokens

### Database

PostgreSQL with Prisma ORM. Key entities:
- Users (with roles)
- Plants (facilities)
- Audits (with assignments)
- Observations (with approval workflow)
- Checklists (with items)
- Approvals (multi-stage)
- Audit Events (audit trail)

## Deployment

For production deployment:

1. **Build the application**
   ```bash
   npm run build:prod
   ```

2. **Set up environment variables**
   - Configure production DATABASE_URL
   - Set NODE_ENV=production
   - Update NEXTAUTH_URL and NEXT_PUBLIC_WEBSOCKET_URL

3. **Run migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the servers**

   **Option A: Using PM2 (Recommended)**
   ```bash
   # Create logs directory
   mkdir -p logs

   # Start both servers with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Enable on system boot
   ```

   **Option B: Manual start**
   ```bash
   # Starts both Next.js (standalone) and WebSocket server
   npm run start:prod
   ```

See `DEPLOYMENT.md` for detailed deployment instructions, including Nginx configuration and systemd services.

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application URL

### Session Configuration
- `IDLE_TIMEOUT_MINUTES` - Session idle timeout (default: 15)
- `ABSOLUTE_SESSION_HOURS` - Max session duration (default: 24)

### WebSocket
- `WEBSOCKET_PORT` - WebSocket server port (default: 3001)
- `NEXT_PUBLIC_WEBSOCKET_URL` - WebSocket URL for client

### S3 Storage (Optional)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials for S3
- `S3_BUCKET_NAME`, `S3_REGION` - S3 bucket configuration

### Database Seeding
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` - Admin user
- `AUDITOR_EMAIL`, `AUDITOR_PASSWORD`, `AUDITOR_NAME` - Auditor user
- `AUDITEE_EMAIL`, `AUDITEE_PASSWORD`, `AUDITEE_NAME` - Auditee user
- `GUEST_EMAIL`, `GUEST_PASSWORD`, `GUEST_NAME` - Guest user

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]
