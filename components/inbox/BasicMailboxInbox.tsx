import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyStateCard, HubListRow, SettingsGroup } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useMailboxMessages } from '@/src/hooks/use-mailbox-messages';
import type { MailboxMessageListItem } from '@/src/api/mailbox-api';

function formatWhen(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BasicMailboxRow({
  item,
  onPress,
}: {
  item: MailboxMessageListItem;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const when = formatWhen(item.receivedAtISO ?? item.sentAtISO, i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US');
  const fromLabel = item.fromLabel ?? item.fromAddress;

  return (
    <HubListRow
      testID={`basic-mailbox-message-${item.id}`}
      icon={item.direction === 'outbound' ? 'paper-plane-outline' : 'mail-outline'}
      title={item.subject || t('basicMailbox.noSubject')}
      subtitle={
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
          {[fromLabel, item.snippet].filter(Boolean).join(' · ')}
        </Text>
      }
      detail={when}
      detailAccent={!item.read}
      onPress={onPress}
    />
  );
}

export function BasicMailboxInbox({
  refreshing,
}: {
  refreshing?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const mailboxMessages = useMailboxMessages();
  const messages = mailboxMessages.data ?? [];
  const loading = mailboxMessages.isPending && messages.length === 0;
  const syncing = mailboxMessages.isFetching && messages.length > 0;

  const openMessage = (item: MailboxMessageListItem) => {
    router.push(`/inbox/message/${item.id}` as Href);
  };

  if (loading) {
    return (
      <View style={[styles.loading, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <EmptyStateCard
        title={t('basicMailbox.emptyTitle')}
        description={t('basicMailbox.emptyDesc')}
      />
    );
  }

  return (
    <View style={styles.stack}>
      {syncing || refreshing ? (
        <View style={[styles.syncingBanner, { backgroundColor: theme.secondary }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.syncingText, { color: theme.mutedForeground }]}>
            {t('inboxScreen.syncingInlineMailbox')}
          </Text>
        </View>
      ) : null}
      <Text style={[styles.sectionTitle, { color: theme.foregroundSubtitle }]}>
        {t('basicMailbox.sectionTitle')}
      </Text>
      <SettingsGroup insetDividers>
        {messages.map((item) => (
          <BasicMailboxRow key={item.id} item={item} onPress={() => openMessage(item)} />
        ))}
      </SettingsGroup>
      {mailboxMessages.isFetchingNextPage ? (
        <View style={[styles.loading, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  loading: {
    minHeight: 96,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  syncingText: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
    fontWeight: '600',
  },
});
