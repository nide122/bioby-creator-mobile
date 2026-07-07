import { resolveDeadlineCountdown } from '@/src/lib/deadline-countdown';

describe('resolveDeadlineCountdown', () => {
  const now = new Date('2026-06-27T12:00:00Z');

  it('returns hours when within 48h', () => {
    const result = resolveDeadlineCountdown('2026-06-28T12:00:00Z', now);
    expect(result).toEqual({
      i18nKey: 'inboxThreadDetail.deadlineCountdown.hoursRemaining',
      params: { hours: 24 },
    });
  });

  it('returns days when beyond 48h', () => {
    const result = resolveDeadlineCountdown('2026-07-02T12:00:00Z', now);
    expect(result).toEqual({
      i18nKey: 'inboxThreadDetail.deadlineCountdown.daysRemaining',
      params: { days: 5 },
    });
  });

  it('returns overdue days when past deadline', () => {
    const result = resolveDeadlineCountdown('2026-06-20T12:00:00Z', now);
    expect(result).toEqual({
      i18nKey: 'inboxThreadDetail.deadlineCountdown.daysOverdue',
      params: { days: 7 },
    });
  });
});
