export {
  computeReminderTriggerAt,
  deadlineReminderNotificationId,
  parseDeadlineInstant,
  shouldScheduleDeadlineReminder,
  type DeadlineEntityType,
  type DeadlineReminderInput,
  type DeadlineReminderSyncResult,
} from '@/src/lib/deadline-reminder.shared';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  computeReminderTriggerAt,
  deadlineReminderNotificationId,
  type DeadlineReminderInput,
  type DeadlineReminderSyncResult,
} from '@/src/lib/deadline-reminder.shared';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGo()) {
    return null;
  }
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

export async function syncDeadlineReminder(input: DeadlineReminderInput): Promise<DeadlineReminderSyncResult> {
  const Notifications = await loadNotificationsModule();
  const identifier = deadlineReminderNotificationId(input.entityType, input.entityId);
  if (!Notifications) {
    return 'skipped';
  }

  await Notifications.cancelScheduledNotificationAsync(identifier);

  const triggerAt = input.deadlineAtISO
    ? computeReminderTriggerAt(input.deadlineAtISO, input.leadTimeMs)
    : null;
  if (triggerAt == null) {
    return 'skipped';
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') {
    return 'permission_denied';
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deadlines', {
      name: 'Deadlines',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: input.notificationTitle,
      body: input.notificationBody,
      data: {
        kind: 'deadline_reminder',
        entityType: input.entityType,
        entityId: input.entityId,
        deadlineAtISO: input.deadlineAtISO,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(triggerAt),
      channelId: Platform.OS === 'android' ? 'deadlines' : undefined,
    },
  });

  return 'scheduled';
}

export async function cancelDeadlineReminder(
  entityType: DeadlineReminderInput['entityType'],
  entityId: string,
): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(
    deadlineReminderNotificationId(entityType, entityId),
  );
}
