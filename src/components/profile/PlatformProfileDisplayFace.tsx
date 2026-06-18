import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/product';
import { PlatformIcon } from '@/components/PlatformIcon';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import {
  formatAvgViewsLabel,
  formatEngagementRateLabel,
} from '@/src/lib/platform-matrix-sync';
import {
  PRESET_PLATFORM_LABELS,
  type CreatorPlatformProfile,
  type PresetPlatformKey,
} from '@/src/types/creator-profile';

type Props = {
  platform: PresetPlatformKey;
  slot: CreatorPlatformProfile;
  testIdPrefix: string;
  onEdit: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

function ReadOnlyStatRow({
  label,
  value,
  placeholder,
  theme,
  testID,
}: {
  label: string;
  value?: string;
  placeholder: string;
  theme: (typeof palette)['light'];
  testID?: string;
}) {
  const display = value?.trim();
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: theme.foregroundEyebrow }]}>{label}</Text>
      <Text
        testID={testID}
        style={[styles.statValue, { color: display ? theme.foreground : theme.mutedForeground }]}>
        {display || placeholder}
      </Text>
    </View>
  );
}

export function PlatformProfileDisplayFace({
  platform,
  slot,
  testIdPrefix,
  onEdit,
  onRefresh,
  refreshing,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const platformLabel = PRESET_PLATFORM_LABELS[platform];
  const tags = slot.nicheTags ?? [];
  const handle = slot.handle?.replace(/^@/, '');
  const avgViewsLabel = formatAvgViewsLabel(slot.avgViews);
  const engagementLabel = formatEngagementRateLabel(slot.engagementRate);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerMain}>
        <PlatformIcon platform={platformLabel} size={16} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.foreground }]}>
            {slot.displayName ?? platformLabel}
          </Text>
          <Text style={[styles.meta, { color: theme.foregroundSubtitle }]}>{platformLabel}</Text>
        </View>
      </View>

      <View style={[styles.statsBlock, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
        <Text style={[styles.statsHint, { color: theme.mutedForeground }]}>
          {t('creatorProfileEditor.fetchedStatsHint')}
        </Text>
        <ReadOnlyStatRow
          label={t('creatorProfileEditor.labelHandle')}
          value={handle ? `@${handle}` : undefined}
          placeholder={t('creatorProfileEditor.handlePending')}
          theme={theme}
          testID={`${testIdPrefix}-handle-${platform}`}
        />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.foregroundEyebrow }]}>
            {t('creatorProfileEditor.labelFollowers')}
          </Text>
          {slot.followerCountLabel?.trim() ? (
            <Badge tone="mint" label={slot.followerCountLabel.trim()} />
          ) : (
            <Text
              testID={`${testIdPrefix}-followers-${platform}`}
              style={[styles.statValue, { color: theme.mutedForeground }]}>
              {t('creatorProfileEditor.followersPending')}
            </Text>
          )}
        </View>
        <ReadOnlyStatRow
          label={t('creatorProfileEditor.labelAvgViews')}
          value={avgViewsLabel}
          placeholder={t('creatorProfileEditor.statsPending')}
          theme={theme}
          testID={`${testIdPrefix}-avg-views-${platform}`}
        />
        <ReadOnlyStatRow
          label={t('creatorProfileEditor.labelEngagement')}
          value={engagementLabel}
          placeholder={t('creatorProfileEditor.statsPending')}
          theme={theme}
          testID={`${testIdPrefix}-engagement-${platform}`}
        />
      </View>

      {slot.bio ? (
        <Text style={[styles.bio, { color: theme.mutedForeground }]}>{slot.bio}</Text>
      ) : null}

      {tags.length ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
              <Text style={[styles.tagLabel, { color: theme.foreground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          testID={`${testIdPrefix}-edit-${platform}`}
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: theme.border, backgroundColor: theme.card },
            pressed && { opacity: 0.88 },
          ]}>
          <Text style={[styles.actionLabel, { color: theme.foreground }]}>
            {t('creatorProfileEditor.editLink')}
          </Text>
        </Pressable>
        <Pressable
          testID={`${testIdPrefix}-refresh-${platform}`}
          accessibilityRole="button"
          disabled={refreshing}
          onPress={onRefresh}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: theme.border, backgroundColor: theme.secondary },
            pressed && !refreshing && { opacity: 0.88 },
            refreshing && { opacity: 0.6 },
          ]}>
          <Text style={[styles.actionLabel, { color: theme.primary }]}>
            {refreshing ? t('creatorProfileEditor.refreshing') : t('creatorProfileEditor.refresh')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  headerMain: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerText: { flex: 1, gap: spacing.xs },
  title: { fontSize: fontSize.cardTitle, fontWeight: '700' },
  meta: { fontSize: fontSize.bodySmall, lineHeight: 20 },
  statsBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statsHint: { fontSize: fontSize.caption, lineHeight: 18 },
  statRow: { gap: spacing.xs },
  statLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  statValue: { fontSize: fontSize.body, fontWeight: '600' },
  bio: { fontSize: fontSize.bodySmall, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    flex: 1,
    minHeight: layout.touchMin - 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
});
