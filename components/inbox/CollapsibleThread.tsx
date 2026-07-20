import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmailAttachmentBadge } from '@/components/mail/EmailAttachmentsList';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { stripQuotedPlainText } from '@/src/lib/email-body';
import { isSenderLikeLabel } from '@/src/lib/cooperation-display-name';
import type { InboxMessage, InboxMessageStats } from '@/src/types/domain';

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

function latestMessageTime(messages: InboxMessage[], dateLocale: string, t: TFunction) {
  const latestTimestamp = messages.reduce((latest, message) => {
    const timestamp = new Date(message.sentAtISO).getTime();
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);
  if (!latestTimestamp) return null;

  const latest = new Date(latestTimestamp);
  const today = new Date();
  const time = latest.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
  if (
    latest.getFullYear() === today.getFullYear() &&
    latest.getMonth() === today.getMonth() &&
    latest.getDate() === today.getDate()
  ) {
    return t('inboxThreadDetail.threadRecentToday', { time });
  }
  return latest.toLocaleString(dateLocale, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type CollapsibleThreadProps = {
  messages: InboxMessage[];
  messageStats?: InboxMessageStats;
  initiallyOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dateLocale: string;
  counterpartyLabel?: string;
  onOpenMessage: (message: InboxMessage) => void;
};

export function CollapsibleThread({
  messages,
  messageStats,
  initiallyOpen = false,
  open: controlledOpen,
  onOpenChange,
  dateLocale,
  counterpartyLabel,
  onOpenMessage,
}: CollapsibleThreadProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(initiallyOpen);
  const open = isControlled ? controlledOpen : internalOpen;
  const heightAnim = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;
  const messageCount = messageStats?.total ?? messages.length;
  const recentTime = latestMessageTime(messages, dateLocale, t);

  useEffect(() => {
    if (!isControlled) return;
    Animated.timing(heightAnim, {
      toValue: controlledOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [controlledOpen, heightAnim, isControlled]);

  function toggle() {
    const next = !open;
    if (isControlled) {
      onOpenChange?.(next);
      return;
    }
    Animated.timing(heightAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setInternalOpen(next);
  }

  return (
    <View style={[styles.threadBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable accessibilityRole="button" onPress={toggle} style={styles.threadToggleRow}>
        <View style={[styles.threadIconBox, { backgroundColor: theme.secondary }]}>
          <Ionicons name="layers-outline" size={18} color={theme.foregroundEyebrow} />
        </View>
        <Text style={[styles.threadTitle, { color: theme.foreground }]}>
          {t('inboxThreadDetail.threadSectionTitle')}
        </Text>
        <Text style={[styles.threadMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
          {t('inboxThreadDetail.threadSectionMeta', {
            count: messageCount,
            recent: recentTime ?? t('inboxThreadDetail.threadRecentUnknown'),
          })}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.mutedForeground} />
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
                      {messageFromLabel(m, t, counterpartyLabel)} ·{' '}
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
  threadIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadTitle: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  threadMeta: { flex: 1, textAlign: 'right', fontSize: fontSize.caption, lineHeight: lineHeight.caption },
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
