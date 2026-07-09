import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

/** Three stacked product-preview cards (inbox, AI summary, today action). */
export function LandingProductPreview() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const cardSurface =
    Platform.OS === 'web'
      ? ({ backgroundColor: '#ffffff' } as const)
      : ({ backgroundColor: theme.card, borderColor: theme.border } as const);

  return (
    <View
      className={webClassName(corporateCleanClass.landingPreviewStage)}
      style={styles.stage}
      accessibilityRole="image"
      accessibilityLabel={t('welcome.preview.a11y')}>
      <View
        className={webClassName(corporateCleanClass.landingPreviewCard, corporateCleanClass.landingPreviewCardInbox)}
        style={[styles.card, styles.cardInbox, cardSurface]}>
        <View style={styles.tabRow}>
          <View style={styles.tabSlotStart}>
            <View style={[styles.tabActive, { backgroundColor: theme.accentMintSoft }]}>
              <Text style={[styles.tabActiveText, { color: theme.primary }]} numberOfLines={1}>
                {t('welcome.preview.inboxTabP0')}
              </Text>
            </View>
          </View>
          <View style={styles.tabSlotCenter}>
            <Text style={[styles.tabMuted, { color: theme.mutedForeground }]} numberOfLines={1}>
              {t('welcome.preview.inboxTabP1')}
            </Text>
          </View>
          <View style={styles.tabSlotEnd}>
            <Text style={[styles.tabMuted, { color: theme.mutedForeground }]} numberOfLines={1}>
              {t('welcome.preview.inboxTabP2')}
            </Text>
          </View>
        </View>
        <PreviewInboxRow
          initials="TG"
          brand={t('welcome.preview.inboxRow1Brand')}
          meta={t('welcome.preview.inboxRow1Meta')}
          time={t('welcome.preview.inboxRow1Time')}
          badge={t('welcome.preview.inboxRow1Badge')}
          theme={theme}
          showBadge
        />
        <PreviewInboxRow
          initials="ML"
          brand={t('welcome.preview.inboxRow2Brand')}
          meta={t('welcome.preview.inboxRow2Meta')}
          time={t('welcome.preview.inboxRow2Time')}
          badge={t('welcome.preview.inboxRow2Badge')}
          theme={theme}
          showBadge
        />
        <PreviewInboxRow
          initials="CC"
          brand={t('welcome.preview.inboxRow3Brand')}
          meta={t('welcome.preview.inboxRow3Meta')}
          time={t('welcome.preview.inboxRow3Time')}
          theme={theme}
        />
      </View>

      <View
        className={webClassName(
          corporateCleanClass.landingPreviewCard,
          corporateCleanClass.landingPreviewCardSummary,
        )}
        style={[styles.card, styles.cardSummary, cardSurface]}>
        <View style={styles.summaryLabelRow}>
          <Ionicons name="sparkles" size={12} color={theme.primary} />
          <Text style={[styles.summaryEyebrow, { color: theme.primary }]}>{t('welcome.preview.summaryEyebrow')}</Text>
        </View>
        <Text style={[styles.inboxBrand, { color: theme.foreground }]}>{t('welcome.preview.summaryTitle')}</Text>
        <Text style={[styles.summaryBody, { color: theme.mutedForeground }]} numberOfLines={1}>
          {t('welcome.preview.summaryBody')}
        </Text>
        <View style={styles.factGrid}>
          <PreviewFact
            label={t('welcome.preview.summaryOffer')}
            value={t('welcome.preview.summaryOfferValue')}
            theme={theme}
          />
          <PreviewFact
            label={t('welcome.preview.summaryDeliverables')}
            value={t('welcome.preview.summaryDeliverablesValue')}
            theme={theme}
          />
          <PreviewFact
            label={t('welcome.preview.summaryDeadline')}
            value={t('welcome.preview.summaryDeadlineValue')}
            theme={theme}
          />
        </View>
      </View>

      <View
        className={webClassName(corporateCleanClass.landingPreviewCard, corporateCleanClass.landingPreviewCardToday)}
        style={[styles.card, styles.cardToday, cardSurface]}>
        <View style={styles.todayHeader}>
          <Text style={[styles.inboxBrand, styles.todayTitle, { color: theme.foreground }]} numberOfLines={2}>
            {t('welcome.preview.todayTitle')}
          </Text>
          <Text style={[styles.todayAmount, { color: theme.primary }]}>{t('welcome.preview.todayAmount')}</Text>
        </View>
        <Text style={[styles.todayStatus, { color: theme.mutedForeground }]}>{t('welcome.preview.todayStatus')}</Text>
        <View
          style={[styles.noteBox, { backgroundColor: theme.secondary, borderColor: theme.border }]}
          className={webClassName(corporateCleanClass.landingPreviewNoteBox)}>
          <Text style={[styles.noteEyebrow, { color: theme.foregroundEyebrow }]}>{t('welcome.preview.todayNoteLabel')}</Text>
          <Text style={[styles.noteText, { color: theme.foregroundSubtitle }]} numberOfLines={2}>
            {t('welcome.preview.todayNote')}
          </Text>
        </View>
        <View style={[styles.todayCta, { backgroundColor: theme.primary }]}>
          <Text style={[styles.todayCtaLabel, { color: theme.primaryForeground }]}>
            {t('welcome.preview.todayCta')}
          </Text>
        </View>
        <Text style={[styles.snooze, { color: theme.mutedForeground }]}>{t('welcome.preview.todaySnooze')}</Text>
      </View>
    </View>
  );
}

function PreviewInboxRow({
  initials,
  brand,
  meta,
  time,
  badge,
  theme,
  showBadge = false,
}: {
  initials: string;
  brand: string;
  meta: string;
  time: string;
  badge?: string;
  theme: ThemePalette;
  showBadge?: boolean;
}) {
  return (
    <View style={styles.inboxRow}>
      <View style={[styles.avatar, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
      </View>
      <View style={styles.inboxCopy}>
        <Text style={[styles.inboxBrand, { color: theme.foreground }]} numberOfLines={1}>
          {brand}
        </Text>
        <Text style={[styles.inboxMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={styles.inboxRight}>
        {showBadge && badge ? (
          <View style={styles.p0Badge}>
            <Text style={styles.p0BadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Text style={[styles.inboxTime, { color: theme.mutedForeground }]}>{time}</Text>
      </View>
    </View>
  );
}

function PreviewFact({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemePalette;
}) {
  return (
    <View style={[styles.factCell, { backgroundColor: theme.secondary, borderColor: theme.border }]}
      className={webClassName(corporateCleanClass.landingPreviewFactCell)}>
      <Text style={[styles.factLabel, { color: theme.foregroundEyebrow }]}>{label}</Text>
      <Text style={[styles.factValue, { color: theme.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    width: '100%',
    maxWidth: 340,
    height: 320,
    alignSelf: 'center',
  },
  card: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    gap: spacing.xs,
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    borderLeftColor: 'rgba(255, 255, 255, 0.82)',
    borderRightColor: 'rgba(203, 213, 225, 0.75)',
    borderBottomColor: 'rgba(148, 163, 184, 0.45)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 10,
  },
  cardInbox: {
    width: '68%',
    left: '50%',
    top: -62,
    transform: [{ translateX: '-83.33%' }, { rotate: '-8deg' }],
    zIndex: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
  },
  cardSummary: {
    width: '68%',
    left: '50%',
    top: 78,
    transform: [{ translateX: '-16.67%' }, { rotate: '8deg' }],
    zIndex: 3,
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 36,
    elevation: 12,
  },
  cardToday: {
    width: '68%',
    left: '50%',
    bottom: -50,
    transform: [{ translateX: '-83.33%' }, { rotate: '4deg' }],
    zIndex: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '88%',
    marginBottom: spacing.xs,
  },
  tabSlotStart: { flex: 1, alignItems: 'flex-start' },
  tabSlotCenter: { flex: 1, alignItems: 'center' },
  tabSlotEnd: { flex: 1, alignItems: 'flex-end' },
  tabActive: { borderRadius: radii.sm, paddingHorizontal: spacing.xs, paddingVertical: 3 },
  tabActiveText: { fontSize: 7, fontWeight: '800' },
  tabMuted: { fontSize: 7, fontWeight: '600' },
  inboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 5 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 8, fontWeight: '800' },
  inboxCopy: { flex: 1, minWidth: 0, gap: 4 },
  inboxBrand: { fontSize: 12, fontWeight: '700', lineHeight: 14 },
  inboxMeta: { fontSize: 8, fontWeight: '500', marginTop: 1 },
  inboxRight: { alignItems: 'flex-end', gap: 2 },
  p0Badge: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  p0BadgeText: { color: '#b91c1c', fontSize: 7, fontWeight: '800' },
  inboxTime: { fontSize: 7, fontWeight: '600' },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryEyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  summaryBody: { fontSize: 7, lineHeight: 10, fontWeight: '500' },
  factGrid: { flexDirection: 'column', gap: 5, marginTop: 2 },
  factCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: spacing.xs,
    minHeight: 26,
  },
  factLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.4 },
  factValue: { fontSize: 9, fontWeight: '700' },
  todayHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
  todayTitle: { flex: 1 },
  todayAmount: { fontSize: 9, fontWeight: '800' },
  todayStatus: { fontSize: 7, fontWeight: '500' },
  noteBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  noteEyebrow: { fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
  noteText: { fontSize: 8, lineHeight: 12, fontWeight: '500' },
  todayCta: {
    borderRadius: radii.md,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  todayCtaLabel: { fontSize: 9, fontWeight: '700' },
  snooze: { fontSize: 8, fontWeight: '600', textAlign: 'center' },
});
