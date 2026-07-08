import { DEADLINE_REMINDER_LEAD_MS } from '@/src/lib/deadline-reminder-config';

export type DeadlineEntityType = 'deal' | 'opportunity';

export type DeadlineReminderInput = {
  entityType: DeadlineEntityType;
  entityId: string;
  deadlineAtISO?: string | null;
  notificationTitle: string;
  notificationBody: string;
  leadTimeMs?: number;
};

export type DeadlineReminderSyncResult = 'scheduled' | 'skipped' | 'permission_denied';

export function deadlineReminderNotificationId(entityType: DeadlineEntityType, entityId: string): string {
  return `deadline-reminder:${entityType}:${entityId}`;
}

export function parseDeadlineInstant(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso.trim());
  return Number.isNaN(ms) ? null : ms;
}

export function computeReminderTriggerAt(
  deadlineAtISO: string,
  leadTimeMs: number = DEADLINE_REMINDER_LEAD_MS,
  nowMs: number = Date.now(),
): number | null {
  const deadlineMs = parseDeadlineInstant(deadlineAtISO);
  if (deadlineMs == null) {
    return null;
  }
  const triggerAt = deadlineMs - leadTimeMs;
  if (triggerAt < nowMs) {
    return null;
  }
  return triggerAt;
}

export function shouldScheduleDeadlineReminder(
  deadlineAtISO?: string | null,
  leadTimeMs: number = DEADLINE_REMINDER_LEAD_MS,
  nowMs: number = Date.now(),
): boolean {
  if (!deadlineAtISO?.trim()) {
    return false;
  }
  return computeReminderTriggerAt(deadlineAtISO, leadTimeMs, nowMs) != null;
}
