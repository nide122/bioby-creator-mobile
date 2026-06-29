import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmailAttachmentBadge } from '@/components/mail/EmailAttachmentsList';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { stripQuotedPlainText } from '@/src/lib/email-body';
import { isSenderLikeLabel } from '@/src/lib/cooperation-display-name';
import type { InboxMessage } from '@/src/types/domain';

function resolveFromLabel(
  message: InboxMessage,
  t: (key: string) => string,
  counterpartyLabel?: string
): string {
  if (message.direction === 'outbound') {
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

export function pickLatestInboundMessage(messages: InboxMessage[]): InboxMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].direction !== 'outbound') {
      return messages[index];
    }
  }
  return messages.length > 0 ? messages[messages.length - 1] : undefined;
}

type InboundMessagePreviewProps = {
  message: InboxMessage;
  dateLocale: string;
  counterpartyLabel?: string;
  onPress?: () => void;
};

export function InboundMessagePreview({ message, dateLocale, counterpartyLabel, onPress }: InboundMessagePreviewProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const outbound = message.direction === 'outbound';
  const unread = !outbound && message.read === false;
  const snippet = stripQuotedPlainText(message.snippet) || message.snippet;
  const fromLabel = resolveFromLabel(message, t, counterpartyLabel);

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <View style={styles.headerRow}>
        <Ionicons name="mail-outline" size={14} color={theme.foregroundEyebrow} />
        <Text style={[styles.eyebrow, { color: theme.foregroundEyebrow }]}>{t('draftDetail.latestInboundTitle')}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.messageCard,
          {
            borderColor: outbound ? theme.accentMintStrong + '55' : theme.border,
            backgroundColor: outbound ? theme.accentMintSoft + 'CC' : theme.card,
          },
          pressed && onPress ? { opacity: 0.88 } : null,
        ]}>
        <View style={styles.messageTop}>
          <View style={styles.metaGroup}>
            <Ionicons
              name={outbound ? 'arrow-up-circle-outline' : 'mail-outline'}
              size={14}
              color={outbound ? theme.accentMintStrong : theme.foregroundEyebrow}
            />
            <Text style={[styles.meta, { color: theme.foregroundEyebrow }]} numberOfLines={1}>
              {fromLabel} ·{' '}
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
          {onPress ? <Ionicons name="chevron-forward" size={14} color={theme.mutedForeground} /> : null}
        </View>
        <Text style={[styles.snippet, { color: theme.foreground }]} numberOfLines={6}>
          {snippet}
        </Text>
        {(message.attachmentCount ?? 0) > 0 ? (
          <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
            <EmailAttachmentBadge count={message.attachmentCount ?? 0} />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  messageCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 2,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  messageTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  meta: { flex: 1, fontSize: fontSize.caption, fontWeight: '600' },
  snippet: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
});
