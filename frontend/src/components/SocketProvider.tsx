import React, { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { connectSocket, subscribeToEvents, disconnectSocket } from '../lib/socket';

/**
 * SocketProvider mounts the Socket.IO client and subscribes to real-time events.
 * It reconnects when the access token changes (e.g. after refresh) and
 * disconnects on logout / unmount.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnectSocket();
      return undefined;
    }

    connectSocket();
    const unsubscribe = subscribeToEvents();

    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, [isAuthenticated, accessToken]);

  return <>{children}</>;
}
