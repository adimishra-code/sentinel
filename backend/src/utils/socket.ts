/**
 * Socket.IO utilities
 * Real-time event broadcasting
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import config from '../config';
import logger from './logger';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    logger.info('Socket.IO client connected', {
      socketId: socket.id,
    });

    // Join organization room
    socket.on('join:organization', (organizationId: string) => {
      socket.join(`org:${organizationId}`);
      logger.info('Client joined organization room', {
        socketId: socket.id,
        organizationId,
      });
    });

    // Join user-specific room for direct notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      logger.info('Client joined user room', { socketId: socket.id, userId });
    });

    // Leave organization room
    socket.on('leave:organization', (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
    });

    socket.on('disconnect', () => {
      logger.info('Socket.IO client disconnected', {
        socketId: socket.id,
      });
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit case event to organization
 */
export const emitCaseEvent = (
  organizationId: string,
  event: string,
  data: any
): void => {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit event');
    return;
  }

  io.to(`org:${organizationId}`).emit(event, data);

  logger.debug('Case event emitted', {
    organizationId,
    event,
  });
};

/**
 * Emit notification to specific user
 */
export const emitUserNotification = (
  userId: string,
  notification: any
): void => {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit notification');
    return;
  }

  io.to(`user:${userId}`).emit('notification:new', notification);
};
