import { clients } from './server';
import {
  broadcastObservationUpdate,
  broadcastFieldLockUpdate,
  broadcastApprovalStatusChange,
  broadcastChangeRequestCreated
} from './handlers';

let wsClients: typeof clients | null = null;

export function initBroadcast(clientsSet: typeof clients) {
  wsClients = clientsSet;
}

export function notifyObservationUpdate(observationId: string, changes: any) {
  if (!wsClients) {
    console.warn('WebSocket clients not initialized');
    return;
  }
  broadcastObservationUpdate(observationId, changes, wsClients);
}

export function notifyFieldLockChange(observationId: string, fields: string[], locked: boolean) {
  if (!wsClients) {
    console.warn('WebSocket clients not initialized');
    return;
  }
  broadcastFieldLockUpdate(observationId, fields, locked, wsClients);
}

export function notifyApprovalStatusChange(observationId: string, status: string) {
  if (!wsClients) {
    console.warn('WebSocket clients not initialized');
    return;
  }
  broadcastApprovalStatusChange(observationId, status, wsClients);
}

export function notifyChangeRequestCreated(observationId: string, changeRequest: any) {
  if (!wsClients) {
    console.warn('WebSocket clients not initialized');
    return;
  }
  broadcastChangeRequestCreated(observationId, changeRequest, wsClients);
}