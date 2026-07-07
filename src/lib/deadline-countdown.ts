export type DeadlineCountdown = {
  i18nKey: string;
  params: Record<string, number>;
};

/** Runtime countdown label from ISO deadline (matches backend TimelineUrgencyCalculator windows). */
export function resolveDeadlineCountdown(
  deadlineAtISO: string,
  now: Date = new Date()
): DeadlineCountdown | null {
  const deadline = new Date(deadlineAtISO);
  if (Number.isNaN(deadline.getTime())) {
    return null;
  }
  const hours = Math.floor((deadline.getTime() - now.getTime()) / (3600 * 1000));
  if (hours > 0) {
    if (hours <= 48) {
      return {
        i18nKey: 'inboxThreadDetail.deadlineCountdown.hoursRemaining',
        params: { hours },
      };
    }
    const days = Math.ceil(hours / 24);
    return {
      i18nKey: 'inboxThreadDetail.deadlineCountdown.daysRemaining',
      params: { days },
    };
  }
  const days = Math.max(1, Math.ceil(-hours / 24));
  return {
    i18nKey: 'inboxThreadDetail.deadlineCountdown.daysOverdue',
    params: { days },
  };
}
