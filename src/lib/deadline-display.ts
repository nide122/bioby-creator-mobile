import type { TFunction } from 'react-i18next';

import { resolveDeadlineCountdown } from '@/src/lib/deadline-countdown';

const KNOWN_KINDS = new Set([
  'reply_by',
  'deliver_by',
  'post_by',
  'contract_review_by',
  'script_due',
  'go_live',
  'review_by',
  'other',
  'unknown',
]);

export function formatDeadlineAt(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function resolveDeadlineKindLabel(t: TFunction, kind?: string | null): string | null {
  const normalized = kind?.trim().toLowerCase();
  if (!normalized || !KNOWN_KINDS.has(normalized)) {
    return null;
  }
  return t(`inboxThreadDetail.deadlineCountdown.kinds.${normalized}`);
}

export function formatDeadlineLine(
  t: TFunction,
  options: {
    atISO?: string | null;
    kind?: string | null;
    text?: string | null;
    locale: string;
    context: 'thread' | 'item';
    now?: Date;
  }
): string | null {
  const { atISO, kind, text, locale, context, now } = options;
  const dateLabel = atISO ? formatDeadlineAt(atISO, locale) : null;
  const countdown = atISO ? resolveDeadlineCountdown(atISO, now) : null;
  const relative = countdown ? t(countdown.i18nKey, countdown.params) : null;
  const kindLabel =
    resolveDeadlineKindLabel(t, kind) ??
    (context === 'thread' ? t('inboxThreadDetail.deadlineCountdown.kinds.fallback') : null);

  if (dateLabel && relative) {
    if (context === 'item') {
      if (kindLabel) {
        return t('inboxThreadDetail.deadlineCountdown.itemScheduleWithCountdown', {
          kind: kindLabel,
          date: dateLabel,
          relative,
        });
      }
      return t('inboxThreadDetail.deadlineCountdown.itemScheduleNoKindWithCountdown', {
        date: dateLabel,
        relative,
      });
    }
    return t('inboxThreadDetail.deadlineCountdown.lineWithCountdown', {
      kind: kindLabel,
      date: dateLabel,
      relative,
    });
  }

  if (dateLabel) {
    if (context === 'item') {
      if (kindLabel) {
        return t('inboxThreadDetail.deadlineCountdown.itemScheduleDateOnly', {
          kind: kindLabel,
          date: dateLabel,
        });
      }
      return dateLabel;
    }
    return t('inboxThreadDetail.deadlineCountdown.lineDateOnly', {
      kind: kindLabel,
      date: dateLabel,
    });
  }

  return text?.trim() || null;
}
