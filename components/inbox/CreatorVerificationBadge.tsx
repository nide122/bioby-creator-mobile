import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { CreatorVerificationStatus } from '@/src/lib/creator-verification';

export function CreatorVerificationBadge({
  status,
  compact = false,
}: {
  status: CreatorVerificationStatus;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (status === 'verified') {
    return (
      <View
        style={[
          styles.badge,
          compact && styles.badgeCompact,
          { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}14` },
        ]}>
        <Ionicons name="shield-checkmark-outline" size={compact ? 12 : 14} color={theme.primary} />
        <Text style={[styles.label, compact && styles.labelCompact, { color: theme.primary }]}>
          {t('creatorVerification.badgeVerified')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { borderColor: `${theme.mutedForeground}44`, backgroundColor: theme.secondary },
      ]}>
      <Ionicons name="alert-circle-outline" size={compact ? 12 : 14} color={theme.mutedForeground} />
      <Text style={[styles.label, compact && styles.labelCompact, { color: theme.mutedForeground }]}>
        {t('creatorVerification.badgeUnverified')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeCompact: {
    paddingVertical: 2,
  },
  label: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '800',
  },
  labelCompact: {
    fontSize: 11,
  },
});
