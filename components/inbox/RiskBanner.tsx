import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import type { InboxRiskFlag, RiskClearedCheck } from '@/src/types/domain';

type RiskBannerProps = {
  flags: InboxRiskFlag[];
  clearedChecks?: RiskClearedCheck[];
  compact?: boolean;
  pinned?: boolean;
  showAckRequired?: boolean;
};

export function RiskBanner({
  flags,
  clearedChecks = [],
  compact = false,
  pinned = false,
  showAckRequired = false,
}: RiskBannerProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const severity = contractWarningSeverity(flags);
  const hasRisks = severity != null;
  const hasCleared = clearedChecks.length > 0;
  const [riskExpanded, setRiskExpanded] = useState(hasRisks);
  const [clearedExpanded, setClearedExpanded] = useState(false);

  if (!hasRisks && !hasCleared) return null;

  const sorted = sortContractWarningFlags(flags).map((flag) => localizeRiskFlag(flag, t));
  const visuals = hasRisks ? contractWarningVisuals(severity!, theme) : null;

  if (compact) {
    const label = primaryContractWarningLabel(sorted);
    if (!label || !visuals) return null;
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
    if (!label || !visuals) return null;
    return (
      <View
        style={[
          styles.pinned,
          {
            borderColor: visuals.border,
            backgroundColor: visuals.background,
          },
        ]}>
        <View style={[styles.panelRail, { backgroundColor: visuals.rail }]} />
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

  const riskCollapsedSummary =
    primaryContractWarningLabel(sorted) ??
    t('inboxThreadDetail.contractWarning.riskCount', { count: sorted.length });

  return (
    <View style={styles.stack}>
      {hasRisks && visuals ? (
        <View
          style={[
            styles.panel,
            {
              borderColor: visuals.border,
              backgroundColor: visuals.background,
            },
          ]}>
          <View style={[styles.panelRail, { backgroundColor: visuals.rail }]} />
          <View style={styles.panelBody}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: riskExpanded }}
              onPress={() => setRiskExpanded((value) => !value)}
              style={styles.panelHeader}>
              <View style={[styles.iconShell, { backgroundColor: visuals.iconBg }]}>
                <Ionicons name={visuals.iconName} size={16} color={visuals.icon} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={[styles.eyebrow, { color: visuals.muted }]}>
                  {t('inboxThreadDetail.contractWarning.title')}
                </Text>
                {riskExpanded ? (
                  <Text style={[styles.subtitle, { color: visuals.body }]}>
                    {t('inboxThreadDetail.contractWarning.subtitle')}
                  </Text>
                ) : (
                  <Text style={[styles.collapsedSummary, { color: visuals.title }]} numberOfLines={2}>
                    {riskCollapsedSummary}
                  </Text>
                )}
              </View>
              <Ionicons
                name={riskExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={visuals.icon}
              />
            </Pressable>
            {riskExpanded ? (
              <>
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
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      {hasCleared ? (
        <View
          style={[
            styles.panel,
            styles.clearedPanel,
            {
              borderColor: '#34D39944',
              backgroundColor: '#34D39912',
            },
          ]}>
          <View style={[styles.panelRail, { backgroundColor: '#34D399' }]} />
          <View style={styles.panelBody}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: clearedExpanded }}
              onPress={() => setClearedExpanded((value) => !value)}
              style={styles.panelHeader}>
              <View style={[styles.iconShell, { backgroundColor: '#34D39922' }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#34D399" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={[styles.clearedTitle, { color: theme.foreground }]}>
                  {t('inboxThreadDetail.contractWarning.clearedTitle', { count: clearedChecks.length })}
                </Text>
                {clearedExpanded ? (
                  <Text style={[styles.clearedSubtitle, { color: theme.mutedForeground }]}>
                    {t('inboxThreadDetail.contractWarning.clearedSubtitle')}
                  </Text>
                ) : (
                  <Text style={[styles.collapsedSummary, { color: theme.foregroundSubtitle }]} numberOfLines={1}>
                    {t('inboxThreadDetail.contractWarning.clearedCollapsed')}
                  </Text>
                )}
              </View>
              <Ionicons
                name={clearedExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#34D399"
              />
            </Pressable>
            {clearedExpanded ? (
              <View style={styles.clearedList}>
                {clearedChecks.map((check) => (
                  <View key={check.code} style={styles.clearedRow}>
                    <View style={[styles.clearedDot, { backgroundColor: '#34D399' }]} />
                    <View style={styles.clearedCopy}>
                      <Text style={[styles.clearedLabel, { color: theme.foreground }]}>{check.label}</Text>
                      {check.detail?.trim() ? (
                        <Text style={[styles.clearedDetail, { color: theme.foregroundSubtitle }]}>
                          {check.detail}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  panel: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  clearedPanel: {},
  panelRail: {
    width: 3,
    alignSelf: 'stretch',
  },
  panelBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelHeader: {
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
  collapsedSummary: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    lineHeight: lineHeight.body,
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
  clearedTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  clearedSubtitle: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  clearedList: {
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  clearedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  clearedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  clearedCopy: {
    flex: 1,
    gap: 2,
  },
  clearedLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },
  clearedDetail: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
});
