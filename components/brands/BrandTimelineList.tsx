import { useMemo, useState } from 'react';
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

type TimelineGroup = {
  id: string;
  title: string;
  kind: 'thread' | 'deal';
  opportunityId?: string | null;
  dealId?: string | null;
  items: BrandTimelineItem[];
};

function groupTimelineItems(items: BrandTimelineItem[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  for (const item of items) {
    if (item.kind === 'deal') {
      groups.push({
        id: item.id,
        title: item.title,
        kind: 'deal',
        dealId: item.dealId,
        opportunityId: item.opportunityId,
        items: [item],
      });
      continue;
    }
    const threadKey = item.opportunityId ?? item.id;
    const last = groups[groups.length - 1];
    if (last?.kind === 'thread' && (last.opportunityId ?? last.id) === threadKey) {
      last.items.push(item);
      continue;
    }
    groups.push({
      id: threadKey,
      title: item.title,
      kind: 'thread',
      opportunityId: item.opportunityId,
      items: [item],
    });
  }
  return groups;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TimelineMessageRow({
  item,
  onPress,
}: {
  item: BrandTimelineItem;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const outbound = item.direction === 'outbound';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.messageRow,
        {
          borderColor: outbound ? theme.accentMintStrong + '55' : theme.border,
          backgroundColor: outbound ? theme.accentMintSoft + 'CC' : theme.card,
        },
        pressed && { opacity: 0.88 },
      ]}>
      <View style={styles.messageTop}>
        <Ionicons
          name={outbound ? 'arrow-up-circle-outline' : 'mail-outline'}
          size={14}
          color={outbound ? theme.accentMintStrong : theme.foregroundEyebrow}
        />
        <Text style={[styles.messageMeta, { color: theme.foregroundEyebrow }]} numberOfLines={1}>
          {outbound ? t('inboxThreadDetail.youLabel') : t('brandDetail.inboundLabel')} · {formatWhen(item.sentAtISO)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={theme.mutedForeground} />
      </View>
      {item.subtitle ? (
        <Text style={[styles.messageSnippet, { color: theme.foregroundSubtitle }]} numberOfLines={4}>
          {item.subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TimelineGroupCard({
  group,
  brandReturnTo,
  emailReturnLink,
}: {
  group: TimelineGroup;
  brandReturnTo: string;
  emailReturnLink: CrossScreenLink;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [open, setOpen] = useState(group.kind === 'thread' && group.items.length === 1);

  const latest = group.items[group.items.length - 1];
  const isDeal = group.kind === 'deal';

  const openGroup = () => {
    if (isDeal && group.dealId) {
      router.push(dealHref(group.dealId, brandReturnTo));
      return;
    }
    if (group.opportunityId) {
      router.push(inboxThreadHref(group.opportunityId, emailReturnLink));
    }
  };

  const openMessage = (item: BrandTimelineItem) => {
    if (item.dealId && item.kind === 'deal') {
      router.push(dealHref(item.dealId, brandReturnTo));
      return;
    }
    if (item.opportunityId && item.id.startsWith('email-')) {
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

  const openSingle = () => {
    if (group.items.length === 1 && !isDeal) {
      openMessage(latest);
      return;
    }
    openGroup();
  };

  return (
    <View style={[styles.groupCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => (group.items.length > 1 ? setOpen((value) => !value) : openSingle())}
        style={({ pressed }) => [styles.groupHeader, pressed && { opacity: 0.88 }]}>
        <View
          style={[
            styles.groupIcon,
            {
              backgroundColor: isDeal ? theme.primary + '18' : theme.card,
              borderColor: theme.border,
            },
          ]}>
          <Ionicons
            name={isDeal ? 'briefcase-outline' : 'mail-outline'}
            size={16}
            color={isDeal ? theme.primary : theme.foregroundEyebrow}
          />
        </View>
        <View style={styles.groupCopy}>
          <Text style={[styles.groupTitle, { color: theme.foreground }]} numberOfLines={2}>
            {group.title}
          </Text>
          <Text style={[styles.groupMeta, { color: theme.mutedForeground }]}>
            {formatWhen(latest.sentAtISO)}
            {isDeal
              ? ` · ${t('brandDetail.dealKind')}`
              : ` · ${t('brandDetail.threadMessageCount', { count: group.items.length })}`}
          </Text>
        </View>
        {group.items.length > 1 ? (
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.mutedForeground} />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={theme.mutedForeground} />
        )}
      </Pressable>

      {open && group.items.length > 1 ? (
        <View style={styles.messageList}>
          {group.items.map((item) => (
            <TimelineMessageRow key={item.id} item={item} onPress={() => openMessage(item)} />
          ))}
        </View>
      ) : null}

      {!open && latest.subtitle && group.items.length > 1 ? (
        <Text style={[styles.groupPreview, { color: theme.foregroundSubtitle }]} numberOfLines={2}>
          {latest.subtitle}
        </Text>
      ) : null}

      {group.items.length === 1 && latest.subtitle ? (
        <Pressable accessibilityRole="button" onPress={openSingle} style={styles.singlePreview}>
          <Text style={[styles.messageSnippet, { color: theme.foregroundSubtitle }]} numberOfLines={3}>
            {latest.subtitle}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function BrandTimelineList({ brandId, emailReturnLink, items }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const groups = useMemo(() => groupTimelineItems(items), [items]);
  const brandReturnTo = emailReturnLink.returnTo ?? `/brand/${brandId}`;

  if (items.length === 0) {
    return <Text style={[styles.empty, { color: theme.mutedForeground }]}>{t('brandDetail.timelineEmpty')}</Text>;
  }

  return (
    <View style={styles.list}>
      {groups.map((group) => (
        <TimelineGroupCard
          key={group.id}
          group={group}
          brandReturnTo={brandReturnTo}
          emailReturnLink={emailReturnLink}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  groupCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  groupIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupCopy: { flex: 1, minWidth: 0, gap: 2 },
  groupTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  groupMeta: { fontSize: fontSize.eyebrow },
  groupPreview: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    paddingLeft: 34 + spacing.sm,
  },
  singlePreview: { paddingLeft: 34 + spacing.sm },
  messageList: { gap: spacing.sm, paddingTop: spacing.xs },
  messageRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 2,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  messageTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  messageMeta: { flex: 1, fontSize: fontSize.caption, fontWeight: '600' },
  messageSnippet: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
