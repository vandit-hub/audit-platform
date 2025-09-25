import { AuthenticatedWebSocket, ObservationRoom, PresenceData, ServerMessage } from './types';

class RoomManager {
  private rooms: Map<string, ObservationRoom> = new Map();

  getRoom(roomId: string): ObservationRoom {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map()
      });
    }
    return this.rooms.get(roomId)!;
  }

  joinRoom(roomId: string, ws: AuthenticatedWebSocket): void {
    if (!ws.userId || !ws.userEmail) return;

    const room = this.getRoom(roomId);

    if (!ws.observationRooms) {
      ws.observationRooms = new Set();
    }
    ws.observationRooms.add(roomId);

    const presenceData: PresenceData = {
      userId: ws.userId,
      email: ws.userEmail,
      role: ws.userRole || 'GUEST',
      joinedAt: new Date().toISOString()
    };

    room.users.set(ws.userId, presenceData);

    this.broadcastPresenceUpdate(roomId);
  }

  leaveRoom(roomId: string, ws: AuthenticatedWebSocket): void {
    if (!ws.userId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.delete(ws.userId);
    ws.observationRooms?.delete(roomId);

    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    } else {
      this.broadcastPresenceUpdate(roomId);
    }
  }

  leaveAllRooms(ws: AuthenticatedWebSocket): void {
    if (!ws.observationRooms) return;

    ws.observationRooms.forEach(roomId => {
      this.leaveRoom(roomId, ws);
    });
  }

  getRoomUsers(roomId: string): PresenceData[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  broadcastToRoom(
    roomId: string,
    message: ServerMessage,
    excludeWs?: AuthenticatedWebSocket,
    clients?: Set<AuthenticatedWebSocket>
  ): void {
    if (!clients) return;

    const messageStr = JSON.stringify(message);

    clients.forEach(client => {
      if (
        client !== excludeWs &&
        client.readyState === client.OPEN &&
        client.observationRooms?.has(roomId)
      ) {
        client.send(messageStr);
      }
    });
  }

  private broadcastPresenceUpdate(roomId: string): void {
    const users = this.getRoomUsers(roomId);
    const message: ServerMessage = {
      type: 'presence_update',
      data: { roomId, users },
      timestamp: new Date().toISOString()
    };

    const room = this.rooms.get(roomId);
    if (room) {
      this.broadcastToRoom(roomId, message);
    }
  }
}

export const roomManager = new RoomManager();