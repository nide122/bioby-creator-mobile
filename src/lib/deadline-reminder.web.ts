export {
  computeReminderTriggerAt,
  deadlineReminderNotificationId,
  parseDeadlineInstant,
  shouldScheduleDeadlineReminder,
  type DeadlineEntityType,
  type DeadlineReminderInput,
  type DeadlineReminderSyncResult,
} from '@/src/lib/deadline-reminder.shared';

import type { DeadlineReminderInput, DeadlineReminderSyncResult } from '@/src/lib/deadline-reminder.shared';

export async function syncDeadlineReminder(_input: DeadlineReminderInput): Promise<DeadlineReminderSyncResult> {
  return 'skipped';
}

export async function cancelDeadlineReminder(): Promise<void> {
  // Local scheduled notifications are not supported on web.
}
