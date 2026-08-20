/**
 * Express Request type extensions for Sentinel Backend
 */

import { UserRole } from './index';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    organizationId?: string;
    userId?: string;
    user?: {
      id: string;
      email: string;
      name: string;
      status: string;
    };
    userRole?: UserRole;
    permissions?: string[];
    apiKeyId?: string;
  }
}
