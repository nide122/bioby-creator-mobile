import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  contractWarningSeverity,
  primaryContractWarningLabel,
  sortContractWarningFlags,
} from '@/src/lib/contract-warning';
import { contractWarningVisuals } from '@/src/lib/contract-warning-visuals';
import { localizeRiskFlag } from '@/src/lib/inbox-detail-labels';
import type { InboxRiskFlag } from '@/src/types/domain';

type RiskBannerProps = {
  flags: InboxRiskFlag[];
  compact?: boolean;
  pinned?: boolean;
  showAckRequired?: boolean;
};

export function RiskBanner({
  flags,
  compact = false,
  pinned = false,
  showAckRequired = false,
}: RiskBannerProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const severity = contractWarningSeverity(flags);
  if (!severity) return null;

  const visuals = contractWarningVisuals(severity, theme);
  const sorted = sortContractWarningFlags(flags).map((flag) => localizeRiskFlag(flag, t));

  if (compact) {
    const label = primaryContractWarningLabel(sorted);
    if (!label) return null;
    return (
      <View
        style={[
          styles.compact,
          {
            borderColor: visuals.border,
            backgroundColor: visuals.background,
          },
        ]}>
        <Ionicons name={visuals.iconName} size={12} color={visuals.icon} style={styles.compactIcon} />
        <Text style={[styles.compactText, { color: visuals.title }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  if (pinned) {
    const label = primaryContractWarningLabel(sorted);
    if (!label) return null;
    return (
      <View
        style={[
          styles.pinned,
          {
            borderColor: visuals.border,
            backgroundColor: visuals.background,
          },
        ]}>
        <View style={[styles.rail, { backgroundColor: visuals.rail }]} />
        <View style={[styles.iconShell, { backgroundColor: visuals.iconBg }]}>
          <Ionicons name={visuals.iconName} size={15} color={visuals.icon} />
        </View>
        <View style={styles.compactCopy}>
          <Text style={[styles.pinnedEyebrow, { color: visuals.muted }]}>
            {t('inboxThreadDetail.contractWarning.title')}
          </Text>
          <Text style={[styles.pinnedText, { color: visuals.title }]} numberOfLines={3}>
            {label}
          </Text>
          {showAckRequired ? (
            <Text style={[styles.pinnedAck, { color: visuals.body }]}>
              {t('inboxThreadDetail.contractWarning.ackRequired')}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.banner,
        {
          borderColor: visuals.border,
          backgroundColor: visuals.background,
        },
      ]}>
      <View style={[styles.rail, { backgroundColor: visuals.rail }]} />
      <View style={styles.bannerBody}>
        <View style={styles.header}>
          <View style={[styles.iconShell, { backgroundColor: visuals.iconBg }]}>
            <Ionicons name={visuals.iconName} size={16} color={visuals.icon} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: visuals.muted }]}>
              {t('inboxThreadDetail.contractWarning.title')}
            </Text>
            <Text style={[styles.subtitle, { color: visuals.body }]}>
              {t('inboxThreadDetail.contractWarning.subtitle')}
            </Text>
          </View>
        </View>
        <View style={styles.flagList}>
          {sorted.map((flag) => (
            <View key={flag.id} style={styles.flagRow}>
              <View style={[styles.flagDot, { backgroundColor: visuals.rail }]} />
              <View style={styles.flagCopy}>
                <Text style={[styles.flagLabel, { color: visuals.title }]}>{flag.label}</Text>
                {flag.hint?.trim() ? (
                  <Text style={[styles.flagHint, { color: visuals.body }]}>{flag.hint}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        {showAckRequired ? (
          <Text style={[styles.ackNote, { color: visuals.body }]}>
            {t('inboxThreadDetail.contractWarning.ackRequired')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  rail: {
    width: 3,
    alignSelf: 'stretch',
  },
  bannerBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconShell: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '500',
  },
  flagList: {
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  flagCopy: {
    flex: 1,
    gap: 2,
  },
  flagLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  flagHint: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  ackNote: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm + 2,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  compactIcon: {
    flexShrink: 0,
  },
  pinned: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    overflow: 'hidden',
  },
  compactCopy: {
    flex: 1,
    gap: 2,
  },
  compactText: {
    flexShrink: 1,
    fontSize: fontSize.caption,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },
  pinnedEyebrow: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  pinnedText: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  pinnedAck: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    lineHeight: lineHeight.body,
    marginTop: 2,
  },
});
