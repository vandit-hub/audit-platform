'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { WebSocketContextValue, WebSocketState, PresenceUser, WebSocketMessage } from './types';
import { wsClient } from './client';

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session } = useSession();
  const [state, setState] = useState<WebSocketState>('disconnected');
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user || typeof window === 'undefined') return;

    // Fetch WebSocket token from API
    fetch('/api/v1/websocket/token')
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          wsClient.connect(data.token);
        }
      })
      .catch(error => {
        // Silently handle token fetch errors (WebSocket server may not be running)
        if (process.env.NODE_ENV === 'development') {
          console.warn('WebSocket token fetch failed (server may not be running)');
        }
      });

    const unsubscribeMessage = wsClient.onMessage((message: WebSocketMessage) => {
      switch (message.type) {
        case 'presence_update':
          if (message.data?.users) {
            setPresence(message.data.users);
          }
          break;

        case 'observation_updated':
        case 'field_locked':
        case 'field_unlocked':
        case 'approval_status_changed':
        case 'change_request_created':
          setLastUpdate(message.timestamp);
          break;

        case 'error':
          console.error('WebSocket error:', message.error);
          break;
      }
    });

    const unsubscribeState = wsClient.onStateChange((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeState();
      wsClient.disconnect();
    };
  }, [session]);

  const joinObservation = useCallback((observationId: string) => {
    wsClient.joinObservation(observationId);
  }, []);

  const leaveObservation = useCallback((observationId: string) => {
    wsClient.leaveObservation(observationId);
  }, []);

  const sendMessage = useCallback((message: any) => {
    wsClient.send(message);
  }, []);

  const value: WebSocketContextValue = {
    isConnected: state === 'connected',
    state,
    presence,
    lastUpdate,
    joinObservation,
    leaveObservation,
    sendMessage
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    return {
      isConnected: false,
      state: 'disconnected',
      presence: [],
      lastUpdate: null,
      joinObservation: () => {},
      leaveObservation: () => {},
      sendMessage: () => {}
    };
  }
  return context;
}