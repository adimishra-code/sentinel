import { Request, Response, NextFunction } from 'express';
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  getWebhookDeliveries,
} from './integrations.service';
import { WebhookEvent } from './webhook.model';

export const handleCreateWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const { name, url, events } = req.body;
    const webhook = await createWebhook(organizationId!, { name, url, events: events as WebhookEvent[] });
    res.status(201).json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
};

export const handleListWebhooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const webhooks = await listWebhooks(organizationId!);
    res.json({ success: true, data: webhooks });
  } catch (err) {
    next(err);
  }
};

export const handleDeleteWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    await deleteWebhook(req.params.id, organizationId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const handleGetDeliveries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const deliveries = await getWebhookDeliveries(req.params.id, organizationId!);
    res.json({ success: true, data: deliveries });
  } catch (err) {
    next(err);
  }
};
