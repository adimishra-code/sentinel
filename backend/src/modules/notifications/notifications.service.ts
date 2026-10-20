/**
 * Notifications Service
 * In-app notifications with optional email via Nodemailer
 */

import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Notification, INotification, NotificationType } from './notification.model';
import { NotificationPreference } from './notification-preference.model';
import { getIO } from '../../utils/socket';
import logger from '../../utils/logger';
import { renderNotificationEmail } from './email-renderer';
import { isChannelEnabled } from './preference.service';

interface NotifyInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  email?: string; // If provided, also send an email
}

let emailTransporter: Transporter | null = null;

function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  emailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return emailTransporter;
}

/**
 * Create an in-app notification and optionally send email
 * Respects per-user, per-channel notification preferences.
 */
export const notify = async (input: NotifyInput): Promise<INotification | null> => {
  // Respect in-app preference (default enabled)
  const inAppEnabled = await isChannelEnabled(
    input.userId,
    input.type,
    'in_app'
  );

  // Respect email preference (default enabled) only when an email is provided
  const emailEnabled =
    !!input.email && (await isChannelEnabled(input.userId, input.type, 'email'));

  if (!inAppEnabled && !emailEnabled) {
    logger.debug('Notification suppressed by preferences', {
      userId: input.userId,
      type: input.type,
    });
    return null;
  }

  let notification: INotification | null = null;

  if (inAppEnabled) {
    notification = await Notification.create({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data || {},
      read: false,
    });

    // Emit realtime notification via Socket.IO
    try {
      const io = getIO();
      io.to(`user:${input.userId}`).emit('notification:new', {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      });
    } catch (_err) {
      // Socket.IO might not be initialized in tests
    }
  }

  // Send email if address provided and enabled
  if (input.email && emailEnabled) {
    const transporter = getEmailTransporter();
    if (transporter) {
      const fromName = process.env.SMTP_HOST ? (process.env.SMTP_FROM_NAME || 'Sentinel') : 'Sentinel';
      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
      const { html, text } = renderNotificationEmail({
        title: input.title,
        message: input.message,
        type: input.type,
        metadata: input.data,
      });

      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: input.email,
          subject: input.title,
          text,
          html,
        });
        logger.info('Email notification sent', { to: input.email, type: input.type });
      } catch (err) {
        logger.error('Failed to send email notification', { error: err, to: input.email });
      }
    }
  }

  return notification;
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (
  userId: string,
  organizationId: string,
  options: { unreadOnly?: boolean; page?: number; limit?: number } = {}
) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 50);
  const skip = (page - 1) * limit;

  const filter: any = { userId, organizationId };
  if (options.unreadOnly) filter.read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, organizationId, read: false }),
  ]);

  return {
    items: items.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      read: n.read,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mark notification(s) as read
 */
export const markAsRead = async (
  notificationIds: string[],
  userId: string,
  organizationId: string
) => {
  await Notification.updateMany(
    { _id: { $in: notificationIds }, userId, organizationId },
    { read: true, readAt: new Date() }
  );
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId: string, organizationId: string) => {
  await Notification.updateMany(
    { userId, organizationId, read: false },
    { read: true, readAt: new Date() }
  );
};
