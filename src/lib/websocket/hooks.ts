'use client';

import { useEffect } from 'react';
import { useWebSocket } from './provider';

export function useObservationWebSocket(observationId: string | null) {
  const { joinObservation, leaveObservation, presence, lastUpdate, isConnected } = useWebSocket();

  useEffect(() => {
    console.log(`[useObservationWebSocket] observationId: ${observationId}, isConnected: ${isConnected}`);
    if (!observationId || !isConnected) {
      console.log(`[useObservationWebSocket] Not joining - observationId: ${observationId}, isConnected: ${isConnected}`);
      return;
    }

    console.log(`[useObservationWebSocket] Calling joinObservation for ${observationId}`);
    joinObservation(observationId);

    return () => {
      console.log(`[useObservationWebSocket] Calling leaveObservation for ${observationId}`);
      leaveObservation(observationId);
    };
  }, [observationId, isConnected, joinObservation, leaveObservation]);

  return {
    presence,
    lastUpdate,
    isConnected
  };
}

export function usePresence(_observationId: string | null) {
  const { presence } = useWebSocket();

  return {
    users: presence,
    count: presence.length,
    isAnyoneElseViewing: presence.length > 1
  };
}