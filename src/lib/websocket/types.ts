export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
  error?: string;
}

export interface PresenceUser {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketContextValue {
  isConnected: boolean;
  state: WebSocketState;
  presence: PresenceUser[];
  lastUpdate: string | null;
  joinObservation: (observationId: string) => void;
  leaveObservation: (observationId: string) => void;
  sendMessage: (message: any) => void;
}