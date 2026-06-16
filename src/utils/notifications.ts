/**
 * Local notifications — fully backend-free.
 *
 * NOTE: Remote push was removed from Expo Go on Android (SDK 53+), but LOCAL
 * scheduled notifications work fine in a production / dev build, which is what
 * ships to the Play Store. These must be tested in an EAS build, not Expo Go.
 *
 * Timing is best-effort: Android Doze / OEM battery killers can delay or batch
 * scheduled notifications. We never promise exact delivery.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_ID = 'daily-fresh-batch';
const ANDROID_CHANNEL = 'default';

let handlerConfigured = false;

/** Show notifications even when the app is in the foreground. Call once at startup. */
export const configureNotifications = (): void => {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        // Both the legacy and the new (SDK 53+) fields, so it works either way.
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      } as any),
  });
};

export const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Fresh Batch alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FF6E76',
    });
  } catch {
    /* channel creation is best-effort */
  }
};

/** Request permission (and ensure the Android channel exists). Returns true if granted. */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  await ensureAndroidChannel();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
};

/** Schedule (or reschedule) the opt-in daily "fresh batch" reminder. */
export const scheduleDailyReminder = async (hour: number, minute: number): Promise<boolean> => {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID);
  } catch {
    /* nothing scheduled yet */
  }
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: '🍩 Fresh batch is ready',
        body: 'New coins have been baking — tap to see today’s batch.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      } as any,
    });
    return true;
  } catch {
    return false;
  }
};

export const cancelDailyReminder = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID);
  } catch {
    /* nothing scheduled */
  }
};

/** Fire a notification right now (used for watchlist move alerts while the app is open). */
export const presentImmediateAlert = async (title: string, body: string): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    /* no-op if permission missing */
  }
};
