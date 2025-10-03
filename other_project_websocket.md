WebSocket Implementation in Another Open WebUI Project
  The Open WebUI project implements WebSockets using Socket.IO, which provides additional features on top of raw WebSockets like automatic reconnection, fallback to polling, and room management.
  Backend Implementation
  Core Files:
  - backend/open_webui/socket/main.py - Main WebSocket server implementation
  - backend/open_webui/env.py - WebSocket configuration
  - backend/open_webui/main.py - Integration with FastAPI app
  Key Features:
  1. Socket.IO Server Setup (socket/main.py:60-75):
  sio = socketio.AsyncServer(
      cors_allowed_origins=[],
      async_mode="asgi",
      transports=["websocket"] if ENABLE_WEBSOCKET_SUPPORT else ["polling"],
      allow_upgrades=ENABLE_WEBSOCKET_SUPPORT,
      always_connect=True,
  )
  2. Redis Support for Scaling (socket/main.py:51-67):
    - Uses AsyncRedisManager for multi-instance deployments
    - Supports Redis Sentinel for high availability
    - Configurable via WEBSOCKET_MANAGER=redis
  3. Session and User Management:
    - SESSION_POOL - Maps socket IDs to user sessions
    - USER_POOL - Tracks active users and their socket connections
    - USAGE_POOL - Monitors model usage across connections
  4. Event Handlers:
    - connect - User authentication and session setup
    - user-join - Channel membership management
    - usage - Model usage tracking
    - ydoc:* - Collaborative document editing (Yjs integration)
    - channel-events - Real-time chat features
  5. Integration with FastAPI (main.py:119):
  app.mount("/ws", socket_app)
  Frontend Implementation
  Core Files:
  - src/routes/+layout.svelte - Socket.IO client setup
  Key Features:
  1. Client Connection (+layout.svelte:72-83):
  const _socket = io(`${WEBUI_BASE_URL}`, {
      reconnection: true,
      path: '/ws/socket.io',
      transports: enableWebsocket ? ['websocket'] : ['polling', 'websocket'],
      auth: { token: localStorage.token }
  });
  2. Event Handlers:
    - chat-events - Real-time chat updates and notifications
    - channel-events - Channel message broadcasting
    - Connection management (connect, disconnect, reconnect)
  3. Real-time Features:
    - Chat completion streaming
    - Typing indicators
    - Push notifications
    - Code execution results
    - Collaborative document editing
  Configuration
  WebSocket behavior is controlled through environment variables in env.py:
  - ENABLE_WEBSOCKET_SUPPORT - Enable/disable WebSocket transport (default: True)
  - WEBSOCKET_MANAGER - Use Redis for scaling (default: local)
  - WEBSOCKET_REDIS_URL - Redis connection for WebSocket manager
  - WEBSOCKET_REDIS_CLUSTER - Enable Redis cluster mode
  - WEBSOCKET_REDIS_LOCK_TIMEOUT - Lock timeout for cleanup operations
  Use Cases in the Project
  1. Real-time Chat: Live message streaming and notifications
  2. Collaborative Editing: Multi-user document editing with Yjs
  3. Model Usage Tracking: Monitor which models are actively being used
  4. Code Execution: Stream Python execution results
  5. Channel Communication: Group chat and broadcasting
  6. User Presence: Track online/offline status
  7. Push Notifications: Browser notifications for background activity