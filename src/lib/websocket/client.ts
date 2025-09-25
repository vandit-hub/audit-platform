import { WebSocketMessage } from './types';

type MessageHandler = (message: WebSocketMessage) => void;
type StateChangeHandler = (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private stateChangeHandlers = new Set<StateChangeHandler>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private token: string | null = null;
  private currentObservationId: string | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
  }

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.token = token;
    this.notifyStateChange('connecting');

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
    const url = `${wsUrl}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyStateChange('connected');
        this.startHeartbeat();

        if (this.currentObservationId) {
          this.joinObservation(this.currentObservationId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyStateChange('error');
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.notifyStateChange('disconnected');
        this.stopHeartbeat();

        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.notifyStateChange('error');
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.currentObservationId = null;
  }

  joinObservation(observationId: string): void {
    console.log(`[WebSocket Client] Joining observation: ${observationId}`);
    this.currentObservationId = observationId;
    this.send({
      type: 'join_observation',
      observationId
    });
  }

  leaveObservation(observationId: string): void {
    if (this.currentObservationId === observationId) {
      this.currentObservationId = null;
    }
    this.send({
      type: 'leave_observation',
      observationId
    });
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`[WebSocket Client] Sending message:`, data);
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    if (message.type === 'pong') return;

    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }

  private notifyStateChange(state: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('State change handler error:', error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();