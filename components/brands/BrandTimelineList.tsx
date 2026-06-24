import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { BrandTimelineItem } from '@/src/api/brands-api';
import type { CrossScreenLink } from '@/src/lib/open-brand-detail';
import { dealHref, inboxMessageHref, inboxThreadHref } from '@/src/lib/open-brand-detail';

type Props = {
  brandId: string;
  emailReturnLink: CrossScreenLink;
  items: BrandTimelineItem[];
};

export function BrandTimelineList({ brandId, emailReturnLink, items }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const brandReturnTo = emailReturnLink.returnTo ?? `/brand/${brandId}`;

  if (items.length === 0) {
    return <Text style={[styles.empty, { color: theme.mutedForeground }]}>{t('brandDetail.timelineEmpty')}</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const outbound = item.direction === 'outbound';
        const isEmail = item.kind === 'email';
        const isDeal = item.kind === 'deal';
        const subtitle = isDeal ? item.subtitle ?? t('brandDetail.dealEvent') : item.subtitle ?? t('brandDetail.emailEvent');
        const iconName = isDeal ? 'briefcase-outline' : outbound ? 'arrow-up-circle-outline' : 'mail-outline';
        const iconColor = isDeal
          ? theme.primary
          : outbound
            ? theme.accentMintStrong
            : theme.foregroundEyebrow;
        const borderColor = isDeal ? theme.border : outbound ? theme.accentMintStrong + '55' : theme.border;
        const backgroundColor = isDeal
          ? theme.secondary
          : outbound
            ? theme.accentMintSoft + 'CC'
            : theme.card;

        const openTarget = () => {
          if (item.dealId && isDeal) {
            router.push(dealHref(item.dealId, brandReturnTo));
            return;
          }
          if (item.opportunityId && isEmail && item.id.startsWith('email-')) {
            const messageId = item.id.slice('email-'.length);
            if (messageId) {
              router.push(inboxMessageHref(messageId, item.opportunityId, { ...emailReturnLink, directReturn: true }));
              return;
            }
          }
          if (item.opportunityId) {
            router.push(inboxThreadHref(item.opportunityId, emailReturnLink));
          }
        };

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={openTarget}
            style={({ pressed }) => [
              styles.row,
              { borderColor, backgroundColor },
              pressed && { opacity: 0.88 },
            ]}>
            <View style={styles.rowTop}>
              <Ionicons name={iconName} size={14} color={iconColor} />
              <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <Text style={[styles.meta, { color: theme.foregroundEyebrow }]}>
              {new Date(item.sentAtISO).toLocaleString(undefined, {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {isEmail ? ` · ${t('brandDetail.emailKind')}` : ` · ${t('brandDetail.dealKind')}`}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.foregroundSubtitle }]} numberOfLines={3}>
                {subtitle}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  title: { flex: 1, fontSize: fontSize.bodySmall, fontWeight: '600', lineHeight: lineHeight.body },
  meta: { fontSize: fontSize.eyebrow },
  subtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
});
