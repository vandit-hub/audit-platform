import { AuthenticatedWebSocket, ClientMessage, ServerMessage } from './types';
import { canAccessObservation } from './auth';
import { roomManager } from './rooms';

export async function handleMessage(
  ws: AuthenticatedWebSocket,
  message: ClientMessage,
  clients: Set<AuthenticatedWebSocket>
): Promise<void> {
  try {
    console.log(`Received message: ${message.type}, observationId: ${message.observationId}`);

    switch (message.type) {
      case 'join_observation':
        console.log(`User ${ws.userEmail} attempting to join observation ${message.observationId}`);
        await handleJoinObservation(ws, message.observationId!, clients);
        break;

      case 'leave_observation':
        if (message.observationId) {
          roomManager.leaveRoom(message.observationId, ws);
        }
        break;

      case 'presence_ping':
        ws.lastActivity = Date.now();
        break;

      case 'heartbeat':
        ws.isAlive = true;
        const pong: ServerMessage = {
          type: 'pong',
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(pong));
        break;

      default:
        const errorMsg: ServerMessage = {
          type: 'error',
          error: 'Unknown message type',
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(errorMsg));
    }
  } catch (error) {
    console.error('Error handling message:', error);
    const errorMsg: ServerMessage = {
      type: 'error',
      error: 'Failed to process message',
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(errorMsg));
  }
}

async function handleJoinObservation(
  ws: AuthenticatedWebSocket,
  observationId: string,
  clients: Set<AuthenticatedWebSocket>
): Promise<void> {
  console.log(`handleJoinObservation called for user ${ws.userEmail}, observation ${observationId}`);

  if (!ws.userId || !ws.userRole) {
    console.log(`User not authenticated: userId=${ws.userId}, userRole=${ws.userRole}`);
    const errorMsg: ServerMessage = {
      type: 'error',
      error: 'Not authenticated',
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(errorMsg));
    return;
  }

  console.log(`Checking access for user ${ws.userId} (${ws.userRole}) to observation ${observationId}`);
  // Check RBAC v2 permissions (delegates to rbac-queries.ts for centralized authorization logic)
  const hasAccess = await canAccessObservation(ws.userId, ws.userRole, observationId);
  console.log(`Access check result: ${hasAccess}`);

  if (!hasAccess) {
    console.log(`Access denied for user ${ws.userEmail} to observation ${observationId}`);
    const errorMsg: ServerMessage = {
      type: 'error',
      error: 'Access denied to this observation',
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(errorMsg));
    return;
  }

  console.log(`User ${ws.userEmail} joining room for observation ${observationId}`);
  roomManager.joinRoom(observationId, ws);

  const users = roomManager.getRoomUsers(observationId);
  console.log(`Room ${observationId} now has ${users.length} users:`, users.map(u => u.email));

  const presenceMsg: ServerMessage = {
    type: 'presence_update',
    data: { roomId: observationId, users },
    timestamp: new Date().toISOString()
  };

  console.log(`Broadcasting presence update to room ${observationId}`);
  roomManager.broadcastToRoom(observationId, presenceMsg, undefined, clients);
}

export function broadcastObservationUpdate(
  observationId: string,
  data: any,
  clients: Set<AuthenticatedWebSocket>
): void {
  const message: ServerMessage = {
    type: 'observation_updated',
    data: {
      observationId,
      ...data
    },
    timestamp: new Date().toISOString()
  };

  roomManager.broadcastToRoom(observationId, message, undefined, clients);
}

export function broadcastFieldLockUpdate(
  observationId: string,
  fields: string[],
  locked: boolean,
  clients: Set<AuthenticatedWebSocket>
): void {
  const message: ServerMessage = {
    type: locked ? 'field_locked' : 'field_unlocked',
    data: {
      observationId,
      fields
    },
    timestamp: new Date().toISOString()
  };

  roomManager.broadcastToRoom(observationId, message, undefined, clients);
}

export function broadcastApprovalStatusChange(
  observationId: string,
  status: string,
  clients: Set<AuthenticatedWebSocket>
): void {
  const message: ServerMessage = {
    type: 'approval_status_changed',
    data: {
      observationId,
      approvalStatus: status
    },
    timestamp: new Date().toISOString()
  };

  roomManager.broadcastToRoom(observationId, message, undefined, clients);
}

export function broadcastChangeRequestCreated(
  observationId: string,
  changeRequest: any,
  clients: Set<AuthenticatedWebSocket>
): void {
  const message: ServerMessage = {
    type: 'change_request_created',
    data: {
      observationId,
      changeRequest
    },
    timestamp: new Date().toISOString()
  };

  roomManager.broadcastToRoom(observationId, message, undefined, clients);
}