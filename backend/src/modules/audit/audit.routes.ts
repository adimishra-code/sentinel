import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { handleListAuditLogs, handleGetEntityAuditTrail } from './audit.controller';

const router = Router();

router.use(authenticate);

// List all audit logs (with optional filters)
router.get('/', handleListAuditLogs);

// Get audit trail for a specific entity
router.get('/:entityType/:entityId', handleGetEntityAuditTrail);

export default router;
