import { WebSocket } from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  userEmail?: string;
  observationRooms?: Set<string>;
  isAlive?: boolean;
  lastActivity?: number;
}

export type ClientMessageType =
  | 'join_observation'
  | 'leave_observation'
  | 'presence_ping'
  | 'heartbeat';

export interface ClientMessage {
  type: ClientMessageType;
  observationId?: string;
  token?: string;
}

export type ServerMessageType =
  | 'observation_updated'
  | 'field_locked'
  | 'field_unlocked'
  | 'approval_status_changed'
  | 'presence_update'
  | 'change_request_created'
  | 'error'
  | 'connected'
  | 'pong';

export interface ServerMessage {
  type: ServerMessageType;
  data?: any;
  timestamp: string;
  error?: string;
}

export interface PresenceData {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface ObservationRoom {
  id: string;
  users: Map<string, PresenceData>;
}