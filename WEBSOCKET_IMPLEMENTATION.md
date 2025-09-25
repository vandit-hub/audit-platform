# WebSocket Implementation for EZAudit MVP

## Overview
This document describes the WebSocket implementation added to the EZAudit platform for real-time collaboration features.

## Features Implemented
✅ **Real-time Observation Updates** - Changes made by one user are immediately reflected for all viewers
✅ **Presence System** - See who else is currently viewing/editing an observation
✅ **Field Lock Notifications** - Real-time alerts when admin locks/unlocks fields
✅ **Approval Status Broadcasting** - Instant updates when observations are approved/rejected
✅ **Auto-reconnection** - Automatic reconnection with exponential backoff
✅ **JWT Authentication** - Secure WebSocket connections using existing auth

## Architecture

### Server Components
- `src/websocket/server.ts` - Main WebSocket server
- `src/websocket/auth.ts` - JWT verification and permissions
- `src/websocket/handlers.ts` - Message handling logic
- `src/websocket/rooms.ts` - Room management for observations
- `src/websocket/broadcast.ts` - Helper functions for API routes

### Client Components
- `src/lib/websocket/client.ts` - WebSocket client singleton
- `src/lib/websocket/provider.tsx` - React context provider
- `src/lib/websocket/hooks.ts` - Custom React hooks
- `src/components/PresenceBadge.tsx` - UI component for presence

## Setup Instructions

### 1. Environment Configuration
Add the following to your `.env` file:
```env
WEBSOCKET_PORT=3001
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
NEXT_PUBLIC_NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
```

### 2. Start the WebSocket Server
In a separate terminal, run:
```bash
npm run ws:dev  # For development with auto-reload
# or
npm run ws:start  # For production
```

### 3. Start the Next.js App
In another terminal:
```bash
npm run dev
```

## Usage Example

### In React Components
```tsx
import { useObservationWebSocket } from '@/lib/websocket/hooks';

function ObservationPage({ id }) {
  const { presence, lastUpdate, isConnected } = useObservationWebSocket(id);

  // Auto-refresh on updates
  useEffect(() => {
    if (lastUpdate) {
      loadObservation();
    }
  }, [lastUpdate]);

  return (
    <div>
      {isConnected && <PresenceBadge users={presence} />}
      {/* Rest of component */}
    </div>
  );
}
```

## Message Flow

### Client → Server Messages
- `join_observation` - Join an observation room
- `leave_observation` - Leave an observation room
- `heartbeat` - Keep connection alive
- `presence_ping` - Update activity status

### Server → Client Messages
- `observation_updated` - Observation data changed
- `field_locked`/`field_unlocked` - Field lock status changed
- `approval_status_changed` - Approval status updated
- `presence_update` - Users in room changed
- `change_request_created` - New change request

## API Integration
The following API endpoints broadcast WebSocket events:
- `PATCH /api/v1/observations/[id]` - Broadcasts observation updates
- `POST /api/v1/observations/[id]/locks` - Broadcasts field lock changes
- `POST /api/v1/observations/[id]/approve` - Broadcasts approval status

## Security
- JWT tokens validated on connection
- User permissions checked before joining rooms
- Admins can access all observations
- Auditors can access assigned observations
- Auditees/Guests can only access published observations

## Production Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start WebSocket server
pm2 start ws-server.ts --name "ws-server"

# Start Next.js app
pm2 start npm --name "next-app" -- start
```

### Nginx Configuration
```nginx
# WebSocket proxy
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Environment Variables for Production
```env
WEBSOCKET_PORT=3001
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-domain.com/ws
```

## Testing

### Manual Testing Steps
1. Start both WebSocket server and Next.js app
2. Log in as an admin in one browser
3. Log in as an auditor in another browser/incognito
4. Both navigate to the same observation
5. Verify presence badge shows other user
6. Make changes as admin - verify auditor sees updates
7. Lock fields as admin - verify auditor cannot edit
8. Approve observation - verify status updates for both

## Monitoring
The WebSocket server logs:
- New connections with user email/role
- Disconnections
- Room joins/leaves
- Errors

Check logs with:
```bash
pm2 logs ws-server
```

## Future Enhancements
- [ ] Message persistence with Redis
- [ ] Horizontal scaling with Redis pub/sub
- [ ] Typing indicators
- [ ] Conflict resolution for concurrent edits
- [ ] Offline sync
- [ ] Push notifications
- [ ] Real-time comments/chat

## Troubleshooting

### WebSocket not connecting
- Check WEBSOCKET_PORT is not in use
- Verify NEXTAUTH_SECRET is set correctly
- Check browser console for connection errors

### Presence not updating
- Ensure observation IDs match
- Check user has permission to access observation
- Verify WebSocket is connected (check presence badge)

### Updates not broadcasting
- Check API routes import broadcast functions
- Verify WebSocket server is running
- Check for errors in WebSocket server logs