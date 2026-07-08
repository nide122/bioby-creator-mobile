import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDeadlineAt, resolveDeadlineKindLabel } from '@/src/lib/deadline-display';
import {
  shouldScheduleDeadlineReminder,
  syncDeadlineReminder,
  type DeadlineEntityType,
  type DeadlineReminderSyncResult,
} from '@/src/lib/deadline-reminder';

export type UseDeadlineReminderSyncInput = {
  entityType: DeadlineEntityType;
  entityId: string;
  title: string;
  brandLabel?: string;
  deadlineAtISO?: string | null;
  deadlineKind?: string | null;
  enabled?: boolean;
};

export function useDeadlineReminderSync(input: UseDeadlineReminderSyncInput): DeadlineReminderSyncResult | null {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<DeadlineReminderSyncResult | null>(null);
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';

  useEffect(() => {
    if (input.enabled === false || !input.deadlineAtISO?.trim() || !input.entityId) {
      setResult(null);
      return;
    }

    let cancelled = false;
    const kindLabel =
      resolveDeadlineKindLabel(t, input.deadlineKind) ??
      t('inboxThreadDetail.deadlineCountdown.kinds.fallback');
    const dateLabel = formatDeadlineAt(input.deadlineAtISO, locale) ?? input.deadlineAtISO;
    const brand = input.brandLabel?.trim() || input.title.trim() || t('deadlineReminder.fallbackBrand');

    void syncDeadlineReminder({
      entityType: input.entityType,
      entityId: input.entityId,
      deadlineAtISO: input.deadlineAtISO,
      notificationTitle: t('deadlineReminder.notificationTitle', { kind: kindLabel, brand }),
      notificationBody: t('deadlineReminder.notificationBody', { date: dateLabel }),
    }).then((next) => {
      if (!cancelled) {
        setResult(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    input.brandLabel,
    input.deadlineAtISO,
    input.deadlineKind,
    input.enabled,
    input.entityId,
    input.entityType,
    input.title,
    locale,
    t,
  ]);

  return result;
}

export function useDeadlineReminderEligible(deadlineAtISO?: string | null): boolean {
  return shouldScheduleDeadlineReminder(deadlineAtISO);
}
