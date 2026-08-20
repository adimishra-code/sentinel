/**
 * Express Request type extensions for Sentinel
 */

import { UserRole } from './index';

declare global {
  namespace Express {
    export interface Request {
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
}

export {};
