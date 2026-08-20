/**
 * Express Request type extensions for Sentinel
 */

declare namespace Express {
  export interface Request {
    requestId?: string;
    organizationId?: string;
    userId?: string;
    userRole?: string;
    permissions?: string[];
  }
}
