import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateQuery } from '../../middleware/validate';
import { ListAuditLogsSchema } from '../../types/schemas';
import { handleListAuditLogs, handleGetEntityAuditTrail } from './audit.controller';

const router = Router();

router.use(authenticate);

// List all audit logs (with optional filters)
router.get('/', validateQuery(ListAuditLogsSchema), handleListAuditLogs);

// Get audit trail for a specific entity
router.get('/:entityType/:entityId', handleGetEntityAuditTrail);

export default router;
