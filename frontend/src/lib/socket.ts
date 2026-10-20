import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { queryClient } from './queryClient';

let socket: Socket | null = null;
let reconnecting = false;

/**
 * Connect (or reconnect) the Socket.IO client using the current access token.
 * The token is sent in the handshake `auth` so the server can verify JWT
 * and derive the organization (never from client input).
 */
export const connectSocket = (): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  const { accessToken } = useAuthStore.getState();
  if (!accessToken) {
    return socket as Socket;
  }

  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

  socket = io(wsUrl, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    reconnecting = false;
  });

  socket.on('connect_error', (err: any) => {
    if (err?.message === 'Invalid or expired token' || err?.message === 'Authentication required') {
      useAuthStore.getState().clearAuth();
    }
  });

  socket.on('disconnect', () => {
    reconnecting = false;
  });

  return socket;
};

/**
 * Get the connected socket instance, connecting if needed.
 */
export const getSocket = (): Socket | null => {
  if (!socket || !socket.connected) {
    return connectSocket();
  }
  return socket;
};

/**
 * Disconnect the socket (called on logout).
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  reconnecting = false;
};

/**
 * Subscribe to real-time events and invalidate the relevant React Query keys.
 * Call this once from a provider mounted in the layout.
 */
export const subscribeToEvents = (): (() => void) => {
  const skt = getSocket();
  if (!skt) {
    return () => {};
  }

  const handlers: Record<string, () => void> = {
    'notification:new': () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    'case:created': () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    'case:updated': () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    'appeal:created': () => {
      queryClient.invalidateQueries({ queryKey: ['appeals'] });
    },
    'appeal:resolved': () => {
      queryClient.invalidateQueries({ queryKey: ['appeals'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  };

  Object.entries(handlers).forEach(([event, handler]) => {
    skt.on(event, handler);
  });

  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      skt.off(event, handler);
    });
  };
};

/**
 * Reconnect with a refreshed access token (called after token rotation).
 */
export const refreshSocketToken = (): void => {
  if (reconnecting) return;
  reconnecting = true;
  disconnectSocket();
  setTimeout(() => {
    connectSocket();
    reconnecting = false;
  }, 100);
};
