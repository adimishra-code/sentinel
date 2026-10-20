/**
 * Socket.IO utilities
 * Real-time event broadcasting with authenticated, tenant-scoped rooms
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken, hashToken } from '../modules/auth/auth.utils';
import { User } from '../modules/auth/user.model';
import { OrganizationMember } from '../modules/organizations/organization-member.model';
import config from '../config';
import logger from './logger';
import { getRedisClient } from './redis';

let io: SocketIOServer | null = null;

interface AuthenticatedSocket {
  userId?: string;
  organizationId?: string;
  userRole?: string;
}

/**
 * Initialize Socket.IO server with JWT authentication middleware.
 * The access token is passed via the client handshake `auth.token`.
 * Organization is derived from the verified token (never from client input).
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    path: '/socket.io',
    allowRequest: (req, callback) => {
      // Allow health-check / polling requests from clients without auth
      callback(null, true);
    },
  });

  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Support "Bearer <token>" or raw token
      const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;

      const payload = verifyAccessToken(tokenValue);

      // Check token blocklist in Redis
      try {
        const redis = getRedisClient();
        const isBlocklisted = await redis.get(`blocklist:token:${tokenValue}`);
        if (isBlocklisted) {
          return next(new Error('Token has been revoked'));
        }
      } catch {
        // Non-fatal: continue without blocklist check
      }

      const user = await User.findById(payload.userId);
      if (!user || user.status !== 'active') {
        return next(new Error('User not found or inactive'));
      }

      // Derive the user's primary organization from membership (never client input)
      const membership = await OrganizationMember.findOne({ userId: user._id })
        .populate('organizationId')
        .sort({ createdAt: 1 });

      if (!membership) {
        return next(new Error('User has no organization membership'));
      }

      (socket as AuthenticatedSocket).userId = user._id.toString();
      (socket as AuthenticatedSocket).organizationId = membership.organizationId._id.toString();
      (socket as AuthenticatedSocket).userRole = membership.role;

      // Auto-join per-org and per-user rooms
      socket.join(`org:${(socket as AuthenticatedSocket).organizationId}`);
      socket.join(`user:${(socket as AuthenticatedSocket).userId}`);

      logger.info('Socket.IO client authenticated', {
        socketId: socket.id,
        userId: (socket as AuthenticatedSocket).userId,
        organizationId: (socket as AuthenticatedSocket).organizationId,
      });

      next();
    } catch (error) {
      logger.warn('Socket.IO authentication failed', { error: (error as Error).message });
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: any) => {
    logger.info('Socket.IO client connected', {
      socketId: socket.id,
      userId: socket.userId,
      organizationId: socket.organizationId,
    });

    socket.on('disconnect', () => {
      logger.info('Socket.IO client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
      });
    });
  });

  logger.info('Socket.IO server initialized with authentication');
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
 * Emit case event to organization (only members of that org receive it)
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
