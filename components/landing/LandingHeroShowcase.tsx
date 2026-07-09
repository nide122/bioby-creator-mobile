import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

function PlaceholderLine({ width = '72%' }: { width?: `${number}%` | number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return <View style={[styles.skeleton, { width, backgroundColor: theme.muted }]} />;
}

function InboxPreviewCard() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View
      className={webClassName(
        corporateCleanClass.showcaseCard,
        corporateCleanClass.showcaseCardInbox,
      )}
      style={[styles.card, styles.cardInbox, { borderColor: '#dbeafe', backgroundColor: '#ffffff' }]}>
      <View style={styles.chipRow}>
        <View style={[styles.chip, styles.chipActive, { backgroundColor: theme.primary }]}>
          <Text style={[styles.chipLabel, { color: theme.primaryForeground }]}>
            {t('welcome.showcase.priorityTabActive')}
          </Text>
        </View>
        <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
          <Text style={[styles.chipLabel, { color: theme.mutedForeground }]}>
            {t('welcome.showcase.priorityTab')}
          </Text>
        </View>
        <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
          <Text style={[styles.chipLabel, { color: theme.mutedForeground }]}>
            {t('welcome.showcase.priorityTab')}
          </Text>
        </View>
      </View>
      {[0, 1, 2].map((index) => (
        <View
          key={`thread-${index}`}
          style={[styles.threadRow, index < 2 ? { borderBottomColor: theme.border } : null]}>
          <View style={[styles.avatar, { backgroundColor: theme.accentMintSoft }]}>
            <Text style={[styles.avatarLabel, { color: theme.primary }]}>AV</Text>
          </View>
          <View style={styles.threadCopy}>
            <Text style={[styles.componentLabel, { color: theme.foreground }]} numberOfLines={1}>
              {t('welcome.showcase.entityName')}
            </Text>
            <Text style={[styles.metaLabel, { color: theme.mutedForeground }]} numberOfLines={1}>
              {t('welcome.showcase.messageMeta')}
            </Text>
          </View>
          {index < 2 ? (
            <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
              <Text style={styles.badgeLabel}>{t('welcome.showcase.priorityBadge')}</Text>
            </View>
          ) : (
            <Text style={{ color: theme.mutedForeground }}>›</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function SummaryPreviewCard() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View
      className={webClassName(
        corporateCleanClass.showcaseCard,
        corporateCleanClass.showcaseCardSummary,
      )}
      style={[styles.card, styles.cardSummary, { borderColor: '#dbeafe', backgroundColor: '#ffffff' }]}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleRow}>
          <View style={[styles.aiIcon, { backgroundColor: theme.accentMintSoft }]}>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 10 }}>AI</Text>
          </View>
          <Text style={[styles.componentLabel, { color: theme.foreground }]}>
            {t('welcome.showcase.aiSummary')}
          </Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: theme.accentMintSoft }]}>
          <Text style={[styles.confidenceLabel, { color: theme.primary }]}>
            {t('welcome.showcase.confidenceBadge')}
          </Text>
        </View>
      </View>
      <Text style={[styles.componentLabel, { color: theme.foreground }]}>
        {t('welcome.showcase.titleComponent')}
      </Text>
      <View style={[styles.summaryBlock, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
        <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>
          {t('welcome.showcase.summaryBlock')}
        </Text>
        <PlaceholderLine width="88%" />
        <PlaceholderLine width="64%" />
      </View>
      {[1, 2, 3].map((n) => (
        <View key={`field-${n}`} style={styles.fieldBlock}>
          <Text style={[styles.fieldEyebrow, { color: theme.foregroundEyebrow }]}>
            {t('welcome.showcase.dataField')} {n}
          </Text>
          <View style={[styles.fieldValue, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
            <PlaceholderLine width="56%" />
          </View>
        </View>
      ))}
    </View>
  );
}

function TodayPreviewCard() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View
      className={webClassName(
        corporateCleanClass.showcaseCard,
        corporateCleanClass.showcaseCardToday,
      )}
      style={[styles.card, styles.cardToday, { borderColor: '#dbeafe', backgroundColor: '#ffffff' }]}>
      <View style={[styles.todayRail, { backgroundColor: '#fb923c' }]} />
      <View style={styles.todayBody}>
        <View style={styles.todayHeader}>
          <Text style={[styles.componentLabel, { color: theme.foreground, flex: 1 }]} numberOfLines={1}>
            {t('welcome.showcase.taskHeader')}
          </Text>
          <Text style={[styles.valueLabel, { color: theme.primary }]}>
            {t('welcome.showcase.valueIndicator')}
          </Text>
        </View>
        <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>
          {t('welcome.showcase.statusMessage')}
        </Text>
        <View style={[styles.noteBlock, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
          <Text style={[styles.fieldEyebrow, { color: theme.foregroundEyebrow }]}>
            {t('welcome.showcase.noteComponent')}
          </Text>
          <PlaceholderLine width="78%" />
        </View>
        <View style={[styles.mockPrimaryBtn, { backgroundColor: theme.primary }]}>
          <Text style={[styles.mockPrimaryLabel, { color: theme.primaryForeground }]}>
            {t('welcome.showcase.primaryAction')}
          </Text>
        </View>
        <Text style={[styles.mockSecondaryLink, { color: theme.mutedForeground }]}>
          {t('welcome.showcase.secondaryAction')}
        </Text>
      </View>
    </View>
  );
}

/** CSS-built floating product preview cards for the landing hero. */
export function LandingHeroShowcase() {
  return (
    <View
      className={webClassName(corporateCleanClass.showcaseStage)}
      style={styles.stage}
      accessibilityRole="image"
      accessibilityLabel="Product preview cards">
      <InboxPreviewCard />
      <SummaryPreviewCard />
      <TodayPreviewCard />
    </View>
  );
}

const CARD_SHADOW =
  Platform.OS === 'web'
    ? undefined
    : {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
      };

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    width: '100%',
    minHeight: 340,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
    ...CARD_SHADOW,
  },
  cardInbox: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '58%',
    zIndex: 1,
    transform: [{ rotate: '-3deg' }],
  },
  cardSummary: {
    position: 'absolute',
    top: 36,
    right: 0,
    width: '62%',
    zIndex: 3,
    transform: [{ rotate: '5deg' }],
  },
  cardToday: {
    position: 'absolute',
    bottom: 0,
    left: '8%',
    width: '64%',
    zIndex: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
    transform: [{ rotate: '-2deg' }],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipActive: { borderWidth: 0 },
  chipLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontSize: 9, fontWeight: '800' },
  threadCopy: { flex: 1, gap: 2, minWidth: 0 },
  componentLabel: { fontSize: fontSize.caption, fontWeight: '700', lineHeight: lineHeight.body },
  metaLabel: { fontSize: 10, lineHeight: 14 },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeLabel: { fontSize: 8, fontWeight: '800', color: '#b91c1c' },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  aiIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  confidenceLabel: { fontSize: 8, fontWeight: '800' },
  summaryBlock: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  fieldBlock: { gap: 4 },
  fieldEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldValue: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skeleton: { height: 6, borderRadius: 3 },
  todayRail: { width: 3 },
  todayBody: { flex: 1, padding: spacing.md, gap: spacing.sm },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  valueLabel: { fontSize: 10, fontWeight: '800' },
  noteBlock: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  mockPrimaryBtn: {
    borderRadius: radii.md,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockPrimaryLabel: { fontSize: 10, fontWeight: '700' },
  mockSecondaryLink: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
