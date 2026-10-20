/**
 * Notification preferences service
 * Per-user, per-type, per-channel notification preferences
 */

import { NotificationPreference } from './notification-preference.model';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

export interface PreferenceInput {
  userId: string;
  type: string;
  channel: 'in_app' | 'email';
  enabled: boolean;
}

export interface PreferenceRow {
  type: string;
  channel: 'in_app' | 'email';
  enabled: boolean;
}

/**
 * Get all preferences for a user.
 */
export const getPreferences = async (userId: string): Promise<PreferenceRow[]> => {
  const prefs = await NotificationPreference.find({ userId }).lean();

  return prefs.map((p) => ({
    type: p.type,
    channel: p.channel,
    enabled: p.enabled,
  }));
};

/**
 * Set (upsert) a single preference.
 */
export const setPreference = async (input: PreferenceInput): Promise<PreferenceRow> => {
  const { userId, type, channel, enabled } = input;

  const pref = await NotificationPreference.findOneAndUpdate(
    { userId, type, channel },
    { enabled },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info('Notification preference updated', {
    userId,
    type,
    channel,
    enabled,
  });

  return {
    type: pref.type,
    channel: pref.channel as 'in_app' | 'email',
    enabled: pref.enabled,
  };
};

/**
 * Check whether a notification should be delivered via a given channel.
 * Defaults to enabled if no preference is recorded.
 */
export const isChannelEnabled = async (
  userId: string,
  type: string,
  channel: 'in_app' | 'email'
): Promise<boolean> => {
  const pref = await NotificationPreference.findOne({ userId, type, channel }).lean();
  if (!pref) {
    return true;
  }
  return pref.enabled;
};
