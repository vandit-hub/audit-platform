import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { AuthenticatedWebSocket, ClientMessage, ServerMessage } from './types';
import { verifyWebSocketToken } from './auth';
import { handleMessage } from './handlers';
import { roomManager } from './rooms';
import { initBroadcast } from './broadcast';
import * as url from 'url';

const PORT = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);
const HEARTBEAT_INTERVAL = 30000;

const clients = new Set<AuthenticatedWebSocket>();

function createWebSocketServer() {
  const server = createServer();
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    console.log('New WebSocket connection attempt');

    try {
      const parsedUrl = url.parse(req.url || '', true);
      const token = parsedUrl.query.token as string;

      if (!token) {
        const errorMsg: ServerMessage = {
          type: 'error',
          error: 'No authentication token provided',
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(errorMsg));
        ws.close(1008, 'No authentication token');
        return;
      }

      const payload = await verifyWebSocketToken(token);

      if (!payload) {
        const errorMsg: ServerMessage = {
          type: 'error',
          error: 'Invalid or expired token',
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(errorMsg));
        ws.close(1008, 'Invalid authentication');
        return;
      }

      ws.userId = payload.userId;
      ws.userRole = payload.role;
      ws.userEmail = payload.email;
      ws.isAlive = true;
      ws.lastActivity = Date.now();

      clients.add(ws);

      const connectedMsg: ServerMessage = {
        type: 'connected',
        data: {
          userId: payload.userId,
          role: payload.role
        },
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(connectedMsg));

      console.log(`User ${payload.email} (${payload.role}) connected`);

      ws.on('message', async (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          await handleMessage(ws, message, clients);
        } catch (error) {
          console.error('Error parsing message:', error);
          const errorMsg: ServerMessage = {
            type: 'error',
            error: 'Invalid message format',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(errorMsg));
        }
      });

      ws.on('close', () => {
        console.log(`User ${ws.userEmail} disconnected`);
        roomManager.leaveAllRooms(ws);
        clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${ws.userEmail}:`, error);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

    } catch (error) {
      console.error('Connection setup error:', error);
      ws.close(1011, 'Server error');
    }
  });

  const heartbeatInterval = setInterval(() => {
    clients.forEach((ws) => {
      if (!ws.isAlive) {
        console.log(`Terminating inactive connection for user ${ws.userEmail}`);
        roomManager.leaveAllRooms(ws);
        clients.delete(ws);
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    initBroadcast(clients);
  });

  process.on('SIGTERM', () => {
    clearInterval(heartbeatInterval);
    clients.forEach(ws => ws.close(1012, 'Server shutting down'));
    server.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });

  return { wss, clients };
}

export const websocketServer = createWebSocketServer();
export { clients };