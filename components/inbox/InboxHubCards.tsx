import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { Badge, FilterChipRow, SegmentedControl } from '@/components/product';
import { CreatorVerificationBadge } from '@/components/inbox/CreatorVerificationBadge';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import {
  formatInboxRelativeTime,
  resolveInboxCollaborationPresentation,
} from '@/src/lib/inbox-collaboration-presentation';
import type { InboxPriorityChip } from '@/src/lib/inbox-priority-filter';
import { inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';
import { resolveDisplayInboxPriority, type InboxPriorityInput } from '@/src/lib/resolve-inbox-priority';
import type { CreatorVerificationStatus } from '@/src/lib/creator-verification';
import type { InboxThread } from '@/src/types/domain';
import type { InboxViewMode } from '@/src/stores/inbox-view-store';
import { useSessionStore } from '@/src/stores/session-store';

export function InboxEmailStatusCard({
  email,
  verificationStatus,
  onPress,
  onSync,
  syncing,
}: {
  email?: string | null;
  verificationStatus?: CreatorVerificationStatus;
  onPress: () => void;
  onSync?: () => void;
  syncing?: boolean;
}) {
  const { t } = useTranslation();
  const isPublicDemo = useSessionStore((state) => state.demoWorkspaceKind === 'public');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (!email) return null;

  return (
    <View
      style={[
        styles.card,
        styles.emailStatusCard,
        { borderColor: theme.border, backgroundColor: theme.card },
      ]}>
      <Pressable
        testID="inbox-email-status-card"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.emailStatusMain, pressed && styles.cardPressed]}>
        <View style={[styles.emailIconBadge, { backgroundColor: theme.accentMintSoft }]}>
          <Ionicons name="mail-outline" size={18} color={theme.primary} />
        </View>
        <View style={styles.emailCopy}>
          {verificationStatus && verificationStatus !== 'verified' ? (
            <CreatorVerificationBadge status={verificationStatus} compact />
          ) : null}
          <Text style={[styles.emailAddress, { color: theme.foreground }]} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.foregroundEyebrow} />
      </Pressable>
      {onSync ? (
        <Pressable
          testID="inbox-sync-button"
          accessibilityRole="button"
          accessibilityLabel={t(isPublicDemo ? 'publicDemo.simulateSyncA11y' : 'inboxScreen.syncNowA11y')}
          disabled={syncing}
          onPress={onSync}
          hitSlop={8}
          style={({ pressed }) => [
            styles.syncButton,
            { borderColor: theme.border, backgroundColor: theme.card },
            pressed && !syncing && styles.syncButtonPressed,
            syncing && styles.syncButtonDisabled,
          ]}>
          {syncing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={theme.primary} />
          )}
          <Text style={[styles.syncButtonLabel, { color: theme.primary }]} numberOfLines={1}>
            {syncing
              ? t(isPublicDemo ? 'publicDemo.simulatingSync' : 'inboxScreen.syncMailboxCtaBusy')
              : t(isPublicDemo ? 'publicDemo.simulateSync' : 'inboxScreen.syncMailboxCta')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function InboxAddDealCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Pressable
      testID="inbox-manual-entry-cta"
      accessibilityRole="button"
      onPress={() => router.push('/inbox/manual' as Href)}
      style={({ pressed }) => [
        styles.addDealCard,
        { borderColor: '#F59E0B55', backgroundColor: theme.card },
        pressed && styles.cardPressed,
      ]}>
      <View style={[styles.addDealIcon, { backgroundColor: '#F59E0B18' }]}>
        <Ionicons name="add" size={18} color={theme.primary} />
      </View>
      <Text style={[styles.addDealTitle, { color: theme.foreground }]}>{t('inboxScreen.addDealTitle')}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.foregroundEyebrow} />
    </Pressable>
  );
}

export function InboxPriorityFilterRow({
  value,
  counts,
  onChange,
}: {
  value: InboxPriorityChip;
  counts: Record<InboxPriorityChip, number>;
  onChange: (value: InboxPriorityChip) => void;
}) {
  const { t } = useTranslation();
  const { inboxPriorityLabel } = useDomainLabels();

  const items = [
    { id: 'p0' as const, label: inboxPriorityLabel.p0, count: counts.p0 },
    { id: 'p1' as const, label: inboxPriorityLabel.p1, count: counts.p1 },
    { id: 'p2' as const, label: inboxPriorityLabel.p2, count: counts.p2 },
    { id: 'archived' as const, label: t('inboxScreen.priorityArchived'), count: counts.archived },
  ];

  return <FilterChipRow items={items} value={value} onChange={onChange} testIdForItem={(id) => `inbox-priority-chip-${id}`} />;
}

export function InboxNeedsActionToggle({
  value,
  onChange,
}: {
  value: InboxViewMode;
  onChange: (value: InboxViewMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      options={[
        { id: 'priority' as const, label: t('inboxScreen.viewNeedsAction') },
        { id: 'all' as const, label: t('inboxScreen.viewSorted') },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

export function InboxCollaborationCard({
  thread,
  onPress,
}: {
  thread: InboxThread;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { inboxCategoryLabel, inboxPriorityLabel } = useDomainLabels();
  const displayPriority = resolveDisplayInboxPriority(thread as unknown as InboxPriorityInput);
  const presentation = resolveInboxCollaborationPresentation(thread, t, inboxCategoryLabel);
  const relativeTime = formatInboxRelativeTime(
    thread.updatedAtISO,
    i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US',
  );
  const metaLine = `${presentation.infoLine} · ${relativeTime}`;

  return (
    <Pressable
      testID={`inbox-thread-${thread.id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.collabCard,
        { borderColor: theme.border, backgroundColor: theme.card },
        pressed && styles.cardPressed,
      ]}>
      <View style={[styles.collabAvatar, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.collabAvatarLabel, { color: theme.foreground }]}>{presentation.initials}</Text>
      </View>
      <View style={styles.collabCopy}>
        <Text style={[styles.collabName, { color: theme.foreground }]} numberOfLines={1}>
          {presentation.name}
        </Text>
        <Text style={[styles.collabInfo, { color: theme.mutedForeground }]} numberOfLines={1}>
          {metaLine}
        </Text>
      </View>
      <View style={styles.collabTrailing}>
        {displayPriority ? (
          <Badge tone={inboxPriorityBadgeTone(displayPriority)} label={inboxPriorityLabel[displayPriority]} />
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={theme.foregroundEyebrow} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchMin,
  },
  cardPressed: { opacity: 0.88 },
  emailStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emailStatusMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  syncButton: {
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexShrink: 0,
    maxWidth: 132,
  },
  syncButtonLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    flexShrink: 1,
  },
  syncButtonPressed: { opacity: 0.72 },
  syncButtonDisabled: { opacity: 0.55 },
  emailIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  emailAddress: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  addDealCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchMin,
  },
  addDealIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDealTitle: { flex: 1, fontSize: fontSize.body, fontWeight: '800', lineHeight: lineHeight.body },
  collabCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  collabAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collabAvatarLabel: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  collabCopy: { flex: 1, gap: 2, minWidth: 0 },
  collabName: { fontSize: fontSize.body, fontWeight: '800', lineHeight: lineHeight.body },
  collabInfo: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  collabTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 56,
    paddingTop: 2,
  },
});
