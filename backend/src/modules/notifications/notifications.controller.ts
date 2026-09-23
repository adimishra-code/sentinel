import { Request, Response, NextFunction } from 'express';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from './notifications.service';

export const handleGetNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, user } = req;
    const { unread, page, limit } = req.query;
    const result = await getUserNotifications(user!.id, organizationId!, {
      unreadOnly: unread === 'true',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const handleMarkRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, user } = req;
    const { ids } = req.body;
    await markAsRead(ids, user!.id, organizationId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const handleMarkAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, user } = req;
    await markAllAsRead(user!.id, organizationId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
