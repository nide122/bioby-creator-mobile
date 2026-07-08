import {
  computeReminderTriggerAt,
  deadlineReminderNotificationId,
  shouldScheduleDeadlineReminder,
} from '@/src/lib/deadline-reminder.shared';

describe('deadline reminder scheduling', () => {
  const now = Date.parse('2026-06-27T12:00:00Z');

  it('uses stable notification identifiers', () => {
    expect(deadlineReminderNotificationId('deal', '12')).toBe('deadline-reminder:deal:12');
  });

  it('schedules 24h before deadline when still in the future', () => {
    const triggerAt = computeReminderTriggerAt('2026-06-28T12:00:00Z', 24 * 60 * 60 * 1000, now);
    expect(triggerAt).toBe(Date.parse('2026-06-27T12:00:00Z'));
    expect(shouldScheduleDeadlineReminder('2026-06-28T12:00:00Z', 24 * 60 * 60 * 1000, now)).toBe(true);
  });

  it('skips when lead window already passed', () => {
    expect(shouldScheduleDeadlineReminder('2026-06-27T18:00:00Z', 24 * 60 * 60 * 1000, now)).toBe(false);
    expect(computeReminderTriggerAt('2026-06-27T18:00:00Z', 24 * 60 * 60 * 1000, now)).toBeNull();
  });

  it('skips without deadline', () => {
    expect(shouldScheduleDeadlineReminder(undefined, 24 * 60 * 60 * 1000, now)).toBe(false);
  });
});
