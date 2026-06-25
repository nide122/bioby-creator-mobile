import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette } from '@/constants/tokens';
import type { InboxMessageStats } from '@/src/types/domain';

type InboxMessageStatsFooterProps = {
  stats?: InboxMessageStats;
  fallbackCount?: number;
  accentUnread?: boolean;
};

type Theme = (typeof palette)['light'];

type StatSegment = {
  key: string;
  label: string;
  count: number;
  countFirst?: boolean;
  accent?: boolean;
};

function countPillStyle(theme: Theme, accent?: boolean) {
  return {
    backgroundColor: accent ? `${theme.primary}28` : theme.inputBackground,
    color: accent ? theme.primary : theme.foreground,
  };
}

function InlineCount({ count, theme, accent }: { count: number; theme: Theme; accent?: boolean }) {
  const pill = countPillStyle(theme, accent);
  return (
    <Text style={[styles.countPill, { backgroundColor: pill.backgroundColor, color: pill.color }]}>
      {` ${count} `}
    </Text>
  );
}

function InlineSegment({
  segment,
  theme,
  labelColor,
}: {
  segment: StatSegment;
  theme: Theme;
  labelColor: string;
}) {
  if (segment.countFirst) {
    return (
      <Text style={styles.inline}>
        <InlineCount count={segment.count} theme={theme} accent={segment.accent} />
        <Text style={[styles.label, { color: labelColor }]}>{segment.label}</Text>
      </Text>
    );
  }
  return (
    <Text style={styles.inline}>
      <Text style={[styles.label, { color: labelColor }]}>{segment.label}</Text>
      <InlineCount count={segment.count} theme={theme} accent={segment.accent} />
    </Text>
  );
}

export function InboxMessageStatsFooter({
  stats,
  fallbackCount,
  accentUnread = false,
}: InboxMessageStatsFooterProps) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const countFirstUnread = i18n.language.startsWith('en');
  const labelColor = theme.foregroundEyebrow;

  if (!stats) {
    const count = Math.max(1, fallbackCount ?? 1);
    const pill = countPillStyle(theme);
    return (
      <Text style={[styles.row, { color: labelColor }]} numberOfLines={1}>
        <Text style={[styles.countPill, { backgroundColor: pill.backgroundColor, color: pill.color }]}>
          {` ${count} `}
        </Text>
        <Text style={styles.label}>{t('inboxScreen.threadMessageCountShort')}</Text>
      </Text>
    );
  }

  const segments: StatSegment[] = [
    { key: 'received', label: t('inboxScreen.messageStatsReceivedLabel'), count: stats.received },
    { key: 'sent', label: t('inboxScreen.messageStatsSentLabel'), count: stats.sent },
  ];
  if (stats.unread > 0) {
    segments.push({
      key: 'unread',
      label: t('inboxScreen.messageStatsUnreadLabel'),
      count: stats.unread,
      countFirst: countFirstUnread,
      accent: accentUnread,
    });
  }

  return (
    <View style={styles.rowWrap}>
      <Text style={styles.row} numberOfLines={1} ellipsizeMode="clip">
        {segments.map((segment, index) => (
          <Text key={segment.key}>
            {index > 0 ? <Text style={[styles.separator, { color: labelColor }]}> · </Text> : null}
            <InlineSegment
              segment={segment}
              theme={theme}
              labelColor={segment.accent ? theme.primary : labelColor}
            />
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexShrink: 0,
    alignSelf: 'flex-end',
    marginTop: -2,
    maxWidth: '100%',
  },
  row: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    textAlign: 'right',
  },
  inline: {
    fontSize: fontSize.caption,
    lineHeight: 18,
  },
  separator: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  countPill: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    borderRadius: 9,
    overflow: 'hidden',
  },
});
