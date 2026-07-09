import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmailAttachmentBadge } from '@/components/mail/EmailAttachmentsList';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { stripQuotedPlainText } from '@/src/lib/email-body';
import { isSenderLikeLabel } from '@/src/lib/cooperation-display-name';
import type { InboxMessage } from '@/src/types/domain';

function isOutboundMessage(message: InboxMessage): boolean {
  return message.direction === 'outbound';
}

function messageFromLabel(
  message: InboxMessage,
  t: (key: string) => string,
  counterpartyLabel?: string
): string {
  if (isOutboundMessage(message)) {
    return t('inboxThreadDetail.youLabel');
  }
  if (counterpartyLabel && !isSenderLikeLabel(counterpartyLabel)) {
    return counterpartyLabel;
  }
  const from = message.fromLabel?.trim() ?? '';
  if (from && isSenderLikeLabel(from)) {
    const angle = from.match(/^(.+?)\s*<[^>]+>$/);
    if (angle?.[1]?.trim() && !isSenderLikeLabel(angle[1].trim())) {
      return angle[1].trim();
    }
  }
  return message.fromLabel;
}

export function sortThreadMessagesNewestFirst(messages: InboxMessage[]): InboxMessage[] {
  return [...messages].sort(
    (left, right) => new Date(right.sentAtISO).getTime() - new Date(left.sentAtISO).getTime()
  );
}

type InboxThreadMessageListProps = {
  messages: InboxMessage[];
  dateLocale: string;
  counterpartyLabel?: string;
  onOpenMessage: (message: InboxMessage) => void;
};

export function InboxThreadMessageList({
  messages,
  dateLocale,
  counterpartyLabel,
  onOpenMessage,
}: InboxThreadMessageListProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const sortedMessages = sortThreadMessagesNewestFirst(messages);

  return (
    <View style={styles.list}>
      {sortedMessages.map((message) => {
        const outbound = isOutboundMessage(message);
        const unread = !outbound && message.read === false;
        const snippet = stripQuotedPlainText(message.snippet) || message.snippet;

        return (
          <Pressable
            key={message.id}
            accessibilityRole="button"
            onPress={() => onOpenMessage(message)}
            style={({ pressed }) => [
              styles.msgRow,
              outbound ? styles.msgRowOutbound : styles.msgRowInbound,
              {
                borderColor: outbound ? theme.accentMintStrong + '55' : theme.border,
                backgroundColor: outbound ? theme.accentMintSoft + 'CC' : theme.card,
              },
              pressed && { opacity: 0.88 },
            ]}>
            <View style={styles.msgRowTop}>
              <View style={styles.msgMetaGroup}>
                <Ionicons
                  name={outbound ? 'arrow-up-circle-outline' : 'mail-outline'}
                  size={14}
                  color={outbound ? theme.accentMintStrong : theme.foregroundEyebrow}
                />
                <Text style={[styles.msgMeta, { color: theme.foregroundEyebrow, flex: 1 }]}>
                  {messageFromLabel(message, t, counterpartyLabel)} ·{' '}
                  {new Date(message.sentAtISO).toLocaleString(dateLocale, {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {unread ? (
                  <View
                    style={[styles.unreadDot, { backgroundColor: theme.primary }]}
                    accessibilityLabel={t('inboxThreadDetail.unreadA11y')}
                  />
                ) : null}
              </View>
              {outbound ? (
                <View
                  style={[
                    styles.replyBadge,
                    { borderColor: theme.accentMintStrong + '66', backgroundColor: theme.accentMintSoft },
                  ]}>
                  <Text style={[styles.replyBadgeText, { color: theme.accentMintStrong }]}>
                    {t('inboxThreadDetail.yourReplyBadge')}
                  </Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={14} color={theme.mutedForeground} />
            </View>
            <Text style={[styles.msgSnippet, { color: theme.foreground }]} numberOfLines={4}>
              {snippet}
            </Text>
            {(message.attachmentCount ?? 0) > 0 ? (
              <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
                <EmailAttachmentBadge count={message.attachmentCount ?? 0} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  msgRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  msgRowInbound: { borderLeftWidth: 2 },
  msgRowOutbound: { borderLeftWidth: 2, marginLeft: spacing.sm },
  msgRowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  msgMetaGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  msgMeta: { fontSize: fontSize.caption, fontWeight: '600' },
  replyBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  replyBadgeText: { fontSize: fontSize.caption, fontWeight: '700' },
  msgSnippet: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
});
