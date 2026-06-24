import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { ContractSummaryCard, type ContractSummaryCardProps } from '@/components/deals/ContractSummaryCard';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { DealPanelTermLine } from '@/src/lib/deal-panel-fields';

type Props = {
  loading?: boolean;
  termLines: DealPanelTermLine[];
  deliverableLines: string[];
  usageRights: string[];
  showContractBlock: boolean;
  contractCardProps: ContractSummaryCardProps;
};

export function DealTermsWithContractSection({
  loading,
  termLines,
  deliverableLines,
  usageRights,
  showContractBlock,
  contractCardProps,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <SectionCard title={t('dealsScreen.panelTermsTitle')} subtitle={t('dealsScreen.panelTermsSubtitle')}>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.mutedForeground }]}>{t('dealsScreen.panelLoading')}</Text>
        </View>
      ) : null}

      {termLines.length > 0 ? (
        <View style={styles.termGrid}>
          {termLines.map((line) => (
            <View
              key={line.id}
              style={[styles.termRow, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Text style={[styles.termLabel, { color: theme.mutedForeground }]}>
                {t(`dealsScreen.panelTerm.${line.label}`)}
              </Text>
              <Text style={[styles.termValue, { color: theme.foreground }]}>{line.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {deliverableLines.length > 0 ? (
        <View style={[styles.list, termLines.length > 0 ? { marginTop: spacing.sm } : null]}>
          {deliverableLines.map((line) => (
            <View key={line} style={styles.listRow}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.listLabel, { color: theme.foreground }]}>{line}</Text>
            </View>
          ))}
        </View>
      ) : (
        !loading ? (
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>{t('dealsScreen.panelDeliverablesEmpty')}</Text>
        ) : null
      )}

      {usageRights.length > 0 ? (
        <View style={[styles.list, { marginTop: spacing.sm }]}>
          <Text style={[styles.termLabel, { color: theme.mutedForeground }]}>{t('dealsScreen.panelUsageRights')}</Text>
          {usageRights.map((right) => (
            <View key={right} style={styles.listRow}>
              <View style={[styles.dot, { backgroundColor: theme.foregroundEyebrow }]} />
              <Text style={[styles.listValue, { color: theme.foreground }]}>{right}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {showContractBlock ? (
        <View style={[styles.contractBlock, { borderTopColor: theme.border }]}>
          <Text style={[styles.contractEyebrow, { color: theme.foregroundEyebrow }]}>
            {t('contractSummary.sectionTitle')}
          </Text>
          <Text style={[styles.contractHint, { color: theme.mutedForeground }]}>
            {t('contractSummary.sectionSubtitle')}
          </Text>
          <ContractSummaryCard {...contractCardProps} />
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  loadingText: { fontSize: fontSize.bodySmall },
  termGrid: { gap: spacing.sm },
  termRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs / 2,
  },
  termLabel: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  termValue: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  list: { gap: spacing.sm },
  listRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  listLabel: { flex: 1, fontSize: fontSize.bodySmall, fontWeight: '600', lineHeight: lineHeight.body },
  listValue: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  bodyText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  contractBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  contractEyebrow: { fontSize: fontSize.caption, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  contractHint: { fontSize: fontSize.eyebrow, lineHeight: lineHeight.body },
});
