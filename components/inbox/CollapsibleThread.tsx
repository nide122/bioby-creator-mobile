import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmailAttachmentBadge } from '@/components/mail/EmailAttachmentsList';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { formatThreadToggleLabel } from '@/src/lib/inbox-message-stats';
import { stripQuotedPlainText } from '@/src/lib/email-body';
import type { InboxMessage, InboxMessageStats } from '@/src/types/domain';

function isOutboundMessage(message: InboxMessage): boolean {
  return message.direction === 'outbound';
}

function messageFromLabel(message: InboxMessage, t: (key: string) => string): string {
  if (isOutboundMessage(message)) {
    return t('inboxThreadDetail.youLabel');
  }
  return message.fromLabel;
}

type CollapsibleThreadProps = {
  messages: InboxMessage[];
  messageStats?: InboxMessageStats;
  initiallyOpen?: boolean;
  dateLocale: string;
  onOpenMessage: (message: InboxMessage) => void;
};

export function CollapsibleThread({
  messages,
  messageStats,
  initiallyOpen = false,
  dateLocale,
  onOpenMessage,
}: CollapsibleThreadProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [open, setOpen] = useState(initiallyOpen);
  const heightAnim = useRef(new Animated.Value(0)).current;

  function toggle() {
    Animated.timing(heightAnim, {
      toValue: open ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setOpen((v) => !v);
  }

  return (
    <View style={[styles.threadBox, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Pressable accessibilityRole="button" onPress={toggle} style={styles.threadToggleRow}>
        <Ionicons name="mail-outline" size={14} color={theme.foregroundEyebrow} />
        <Text style={[styles.threadToggleLabel, { color: theme.foregroundEyebrow }]}>
          {formatThreadToggleLabel(messageStats, messages.length, t)}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.mutedForeground} />
      </Pressable>

      {open ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {messages.map((m) => {
            const outbound = isOutboundMessage(m);
            const unread = !outbound && m.read === false;
            const snippet = stripQuotedPlainText(m.snippet) || m.snippet;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => onOpenMessage(m)}
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
                      {messageFromLabel(m, t)} ·{' '}
                      {new Date(m.sentAtISO).toLocaleString(dateLocale, {
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
                <Text style={[styles.msgSnippet, { color: theme.foreground }]} numberOfLines={3}>
                  {snippet}
                </Text>
                {(m.attachmentCount ?? 0) > 0 ? (
                  <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
                    <EmailAttachmentBadge count={m.attachmentCount ?? 0} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  threadBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md },
  threadToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  threadToggleLabel: { flex: 1, fontSize: fontSize.caption, fontWeight: '600' },
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
