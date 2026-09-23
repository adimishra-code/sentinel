import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate';
import { CreateWebhookSchema, IdParamSchema } from '../../types/schemas';
import {
  handleCreateWebhook,
  handleListWebhooks,
  handleDeleteWebhook,
  handleGetDeliveries,
} from './integrations.controller';

const router = Router();

router.use(authenticate);

router.get('/webhooks', handleListWebhooks);
router.post('/webhooks', validateBody(CreateWebhookSchema), handleCreateWebhook);
router.delete('/webhooks/:id', validateParams(IdParamSchema), handleDeleteWebhook);
router.get('/webhooks/:id/deliveries', validateParams(IdParamSchema), handleGetDeliveries);

export default router;
