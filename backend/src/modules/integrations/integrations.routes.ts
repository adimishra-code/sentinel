import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  handleCreateWebhook,
  handleListWebhooks,
  handleDeleteWebhook,
  handleGetDeliveries,
} from './integrations.controller';

const router = Router();

router.use(authenticate);

router.get('/webhooks', handleListWebhooks);
router.post('/webhooks', handleCreateWebhook);
router.delete('/webhooks/:id', handleDeleteWebhook);
router.get('/webhooks/:id/deliveries', handleGetDeliveries);

export default router;
