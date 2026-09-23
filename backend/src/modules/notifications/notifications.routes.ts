import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  handleGetNotifications,
  handleMarkRead,
  handleMarkAllRead,
} from './notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/', handleGetNotifications);
router.post('/mark-read', handleMarkRead);
router.post('/mark-all-read', handleMarkAllRead);

export default router;
