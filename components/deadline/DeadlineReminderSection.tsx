import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { formatDeadlineLine } from '@/src/lib/deadline-display';
import { exportAndShareDeadlineIcs } from '@/src/lib/deadline-ics';
import {
  useDeadlineReminderEligible,
  useDeadlineReminderSync,
} from '@/src/hooks/use-deadline-reminder-sync';
import type { DeadlineEntityType } from '@/src/lib/deadline-reminder.shared';
import { alertAction } from '@/src/lib/app-dialog';

export type DeadlineReminderSectionProps = {
  entityType: DeadlineEntityType;
  entityId: string;
  title: string;
  brandLabel?: string;
  deadlineAtISO?: string | null;
  deadlineKind?: string | null;
  deadlineText?: string | null;
  enableReminder?: boolean;
  /** When false, only export/reminder actions render (deadline line shown elsewhere). */
  showSummary?: boolean;
};

export function DeadlineReminderSection({
  entityType,
  entityId,
  title,
  brandLabel,
  deadlineAtISO,
  deadlineKind,
  deadlineText,
  enableReminder = true,
  showSummary = true,
}: DeadlineReminderSectionProps) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';
  const [exportPending, setExportPending] = useState(false);

  const deadlineLine = formatDeadlineLine(t, {
    atISO: deadlineAtISO,
    kind: deadlineKind,
    text: deadlineText,
    locale,
    context: 'thread',
  });

  const reminderEligible = useDeadlineReminderEligible(deadlineAtISO);
  const reminderSyncResult = useDeadlineReminderSync({
    entityType,
    entityId,
    title,
    brandLabel,
    deadlineAtISO,
    deadlineKind,
    enabled: enableReminder && reminderEligible,
  });

  if (!deadlineLine) {
    return null;
  }

  const onExportIcs = () => {
    if (!deadlineAtISO?.trim() || exportPending) {
      return;
    }
    setExportPending(true);
    const kindLabel =
      deadlineKind?.trim() ||
      t('inboxThreadDetail.deadlineCountdown.kinds.fallback');
    void exportAndShareDeadlineIcs({
      entityType,
      entityId,
      deadlineAtISO,
      summary: t('deadlineReminder.icsSummary', {
        kind: kindLabel,
        title: title.trim() || brandLabel?.trim() || t('deadlineReminder.fallbackBrand'),
      }),
      description: deadlineText?.trim() || deadlineLine,
    })
      .catch(() => {
        void alertAction(t('deadlineReminder.exportErrorTitle'), t('deadlineReminder.exportErrorBody'));
      })
      .finally(() => setExportPending(false));
  };

  const reminderHint =
    reminderSyncResult === 'scheduled'
      ? t('deadlineReminder.reminderScheduled')
      : reminderSyncResult === 'permission_denied'
        ? t('deadlineReminder.permissionDenied')
        : reminderEligible
          ? null
          : t('deadlineReminder.reminderUnavailable');

  const body = (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
      {showSummary ? (
        <View style={styles.headerRow}>
          <Ionicons name="calendar-outline" size={18} color={theme.primary} />
          <Text style={[styles.deadlineLine, { color: theme.foreground }]}>{deadlineLine}</Text>
        </View>
      ) : null}
      {reminderHint ? (
        <Text style={[styles.hint, { color: theme.mutedForeground }]}>{reminderHint}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={exportPending}
        onPress={onExportIcs}
        style={[
          styles.exportBtn,
          { borderColor: theme.border, opacity: exportPending ? 0.6 : 1 },
        ]}>
        {exportPending ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            <Ionicons name="share-outline" size={16} color={theme.primary} />
            <Text style={[styles.exportLabel, { color: theme.primary }]}>
              {t('deadlineReminder.exportIcsCta')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );

  if (!showSummary) {
    return body;
  }

  return (
    <SectionCard
      title={t('inboxThreadDetail.deadlineCountdown.title')}
      subtitle={t('inboxThreadDetail.deadlineCountdown.subtitle')}>
      {body}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  deadlineLine: {
    flex: 1,
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
    fontWeight: '600',
  },
  hint: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  exportBtn: {
    marginTop: spacing.xs,
    minHeight: layout.touchMin,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  exportLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
});
