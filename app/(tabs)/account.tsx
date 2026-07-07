import { useQueryClient } from '@tanstack/react-query';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import appI18n from '@/src/i18n';

import {
  HubScreen,
  QueryRetryCard,
  SegmentedControl,
  SettingsBlock,
  HubNavRow,
  SettingsGroup,
  SettingsRow,
  hubListStyles,
} from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { LanguagePreference } from '@/src/stores/locale-store';
import { useLocaleStore } from '@/src/stores/locale-store';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { resetOnboardingOnServer } from '@/src/api/account-api';
import { confirmAction } from '@/src/lib/confirm-action';
import { alertAction } from '@/src/lib/app-dialog';
import { resolveAccountProfileHeroMeta } from '@/src/lib/creator-profile-aggregate';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { ConnectedPlatformIcons } from '@/src/components/profile/ConnectedPlatformIcons';
import { OnboardingStatusCard } from '@/components/account/OnboardingStatusCard';
import { CreatorVerificationBadge } from '@/components/inbox/CreatorVerificationBadge';
import { isCreatorAiInboxEnabled, type CreatorVerificationStatus } from '@/src/lib/creator-verification';
import { useCreatorFocusMode } from '@/src/hooks/use-creator-focus';
import { useAccountOverview } from '@/src/hooks/use-account-overview';
import { useOnboardingDashboardStatus } from '@/src/hooks/use-onboarding-dashboard-status';
import { useAccountRowSummaries } from '@/src/hooks/use-account-row-summaries';
import { usePendingTenantInvites } from '@/src/hooks/use-tenants';
import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { useSessionStore } from '@/src/stores/session-store';

const LANGUAGE_OPTIONS: LanguagePreference[] = ['en', 'zh', 'system'];

export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const accountEmail = useSessionStore((s) => s.accountEmail);
  const profile = useSessionStore((s) => s.profileBasics);
  const emailWizardFinished = useSessionStore((s) => s.emailWizardFinished);
  const emailSkipped = useSessionStore((s) => s.emailSkipped);
  const mailboxConnection = useSessionStore((s) => s.mailboxConnection);
  const agentSendMode = useSessionStore((s) => s.agentSendMode);
  const membershipRole = useSessionStore((s) => s.membershipRole);
  const creatorVerificationStatus = useSessionStore((s) => s.creatorVerificationStatus);
  const { creatorFocusMode, setCreatorFocusMode } = useCreatorFocusMode();
  const { signOut } = useAuthActions();
  const replayOnboarding = useSessionStore((s) => s.replayOnboardingDemo);
  const languagePreference = useLocaleStore((s) => s.languagePreference);
  const setLanguagePreference = useLocaleStore((s) => s.setLanguagePreference);

  const overview = useAccountOverview();
  const onboardingDashboard = useOnboardingDashboardStatus();
  const overviewMailbox = overview.data?.mailbox;
  const inboxEmail =
    overviewMailbox?.emailAddress ?? mailboxConnection?.email ?? accountEmail ?? '';
  const creatorName = profile?.displayName?.trim() || t('account.profileFallback');
  const connectedEmail =
    overviewMailbox?.connected ||
    (emailWizardFinished && !emailSkipped && !!mailboxConnection);
  const overviewLoadError =
    shouldUseBackendApi() && overview.isError
      ? overview.error instanceof Error
        ? overview.error.message
        : t('account.overviewError')
      : null;
  const inboxSyncSubtitle = useMemo(() => {
    if (!connectedEmail) return t('account.connectInbox');
    const lastSync = overviewMailbox?.lastSyncAtISO;
    if (lastSync) {
      return t('account.inboxLastSync', {
        time: new Date(lastSync).toLocaleString(
          appI18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US',
          { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        ),
      });
    }
    return t('account.reconnectInbox');
  }, [connectedEmail, overviewMailbox?.lastSyncAtISO, t]);
  const platformMeta = useMemo(() => {
    const emailFallback = accountEmail ?? t('account.emailNotConnected');
    return resolveAccountProfileHeroMeta(profile, emailFallback);
  }, [accountEmail, profile, t]);
  const { profileDetail, planDetail, teamDetail, workspaceDetail, dataDetail } = useAccountRowSummaries();
  const pendingInvites = usePendingTenantInvites();
  const canUseOps = shouldUseBackendApi() && membershipRole === 'OWNER';

  useFocusEffect(
    useCallback(() => {
      if (!shouldUseBackendApi()) return;
      void pendingInvites.refetch();
      void onboardingDashboard.refetch();
    }, [onboardingDashboard.refetch, pendingInvites.refetch]),
  );

  const refreshAccount = useCallback(async () => {
    await Promise.all([
      invalidateTenantScopedQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['account', 'team-roles'] }),
    ]);
  }, [queryClient]);
  const { refreshing, onRefresh } = useTabRefresh(refreshAccount);

  const replyStyleSummary =
    agentSendMode === 'review_only'
      ? t('account.agentModes.reviewOnly.label')
      : t('account.agentModes.agentAssist.label');

  const focusModes = useMemo(
    () =>
      [
        { id: 'quiet' as const, label: t('account.focusModes.quiet.label'), icon: 'moon-outline' as const },
        { id: 'work' as const, label: t('account.focusModes.work.label'), icon: 'flash-outline' as const },
      ] as const,
    [t]
  );

  const confirmReplayOnboarding = () => {
    void (async () => {
      const confirmed = await confirmAction({
        title: t('account.replayConfirm.title'),
        message: t('account.replayConfirm.message'),
        cancelLabel: t('account.replayConfirm.cancel'),
        confirmLabel: t('account.replayConfirm.confirm'),
        destructive: true,
      });
      if (!confirmed) return;
      try {
        if (shouldUseBackendApi()) {
          await resetOnboardingOnServer();
        }
        replayOnboarding();
        if (shouldUseBackendApi()) {
          await invalidateTenantScopedQueries(queryClient);
        }
        router.replace('/onboarding' as Href);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('account.replayConfirm.errorBody');
        void alertAction(t('account.replayConfirm.errorTitle'), message);
      }
    })();
  };

  const profileHeader = (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/settings/profile' as Href)}
      android_ripple={{ color: `${theme.primary}18`, borderless: false }}
      style={({ pressed }) => [
        styles.profileHero,
        { borderColor: theme.border, backgroundColor: theme.card },
        pressed && styles.profileHeroPressed,
      ]}>
      <View style={[styles.avatarRing, { borderColor: theme.primary + '55' }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Text style={[styles.avatarLabel, { color: theme.primaryForeground }]}>
            {creatorName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.profileText}>
        <Text style={[styles.profileName, { color: theme.foreground }]}>{creatorName}</Text>
        <View style={styles.profileMetaRow}>
          {platformMeta.connectedKeys.length > 0 ? (
            <ConnectedPlatformIcons platforms={platformMeta.connectedKeys} size={14} />
          ) : null}
          <Text style={[styles.profileMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
            {platformMeta.subtitle}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.foregroundEyebrow} />
    </Pressable>
  );

  return (
    <HubScreen
      testID="screen-account"
      eyebrow={t('tabs.account')}
      header={profileHeader}
      refreshing={refreshing || overview.isRefetching}
      onRefresh={onRefresh}
      footer={
        <Pressable
          testID="account-sign-out"
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
          onPress={async () => {
            await signOut();
            router.replace('/home' as Href);
          }}>
          <Text style={[styles.signOutLabel, { color: theme.mutedForeground }]}>{t('account.signOut')}</Text>
        </Pressable>
      }>
      {overviewLoadError ? (
        <QueryRetryCard
          message={overviewLoadError}
          onRetry={() => void overview.refetch()}
        />
      ) : null}

      {shouldUseBackendApi() && pendingInvites.pendingCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          testID="account-pending-invite-banner"
          onPress={() => router.push('/settings/workspace' as Href)}
          style={({ pressed }) => [
            styles.inviteBanner,
            { borderColor: theme.primary, backgroundColor: `${theme.primary}14` },
            pressed && { opacity: 0.9 },
          ]}>
          <View style={styles.inviteBannerText}>
            <Text style={[styles.inviteBannerTitle, { color: theme.foreground }]}>
              {t('account.pendingInviteBannerTitle', { count: pendingInvites.pendingCount })}
            </Text>
            <Text style={[styles.inviteBannerLead, { color: theme.mutedForeground }]}>
              {t('account.pendingInviteBannerLead')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.primary} />
        </Pressable>
      ) : null}

      <OnboardingStatusCard status={onboardingDashboard.status} />

      <SettingsGroup title={t('account.inboxTitle')}>
        <AccountInboxRow
          connected={connectedEmail}
          email={inboxEmail}
          syncSubtitle={inboxSyncSubtitle}
          verificationStatus={creatorVerificationStatus}
          onPress={() => router.push('/onboarding/email?source=account' as Href)}
        />
      </SettingsGroup>

      {isCreatorAiInboxEnabled(creatorVerificationStatus) ? (
      <SettingsGroup title={t('account.automationHeading')} insetDividers={false}>
        <SettingsBlock label={t('account.focusHeading')}>
          <SegmentedControl options={focusModes} value={creatorFocusMode} onChange={setCreatorFocusMode} />
        </SettingsBlock>
      </SettingsGroup>
      ) : null}

      <SettingsGroup title={t('account.workspaceHeading')} insetDividers={false}>
        {shouldUseBackendApi() ? (
          <NavRow
            testID="account-workspace-row"
            title={t('account.rows.workspaceTitle')}
            detail={workspaceDetail}
            onPress={() => router.push('/settings/workspace' as Href)}
          />
        ) : null}
        <NavRow
          testID="account-profile-row"
          title={t('account.rows.profileTitle')}
          detail={profileDetail}
          onPress={() => router.push('/settings/profile' as Href)}
        />
        <NavRow
          testID="account-media-kit-row"
          title={t('account.rows.mediaKitTitle')}
          detail={t('account.summaries.mediaKitPublic')}
          onPress={() => router.push('/media-kit' as Href)}
        />
        <NavRow
          testID="account-team-row"
          title={t('account.rows.teamTitle')}
          detail={teamDetail}
          onPress={() => router.push('/settings/team' as Href)}
        />
        <NavRow
          testID="account-subscription-row"
          title={t('account.rows.planTitle')}
          detail={planDetail}
          onPress={() => router.push('/settings/subscription' as Href)}
        />
      </SettingsGroup>

      <SettingsGroup title={t('account.prefsHeading')} insetDividers={false}>
        <SettingsBlock label={t('account.rows.languageTitle')}>
          <SegmentedControl
            options={LANGUAGE_OPTIONS.map((code) => ({
              id: code,
              label: t(`account.languages.${code}`),
            }))}
            value={languagePreference}
            onChange={setLanguagePreference}
          />
        </SettingsBlock>
        <NavRow
          testID="account-reply-style-row"
          title={t('account.rows.replyStyleTitle')}
          detail={replyStyleSummary}
          onPress={() => router.push('/settings/reply-style' as Href)}
        />
        <NavRow
          testID="account-data-export-row"
          title={t('account.rows.dataTitle')}
          detail={dataDetail}
          onPress={() => router.push('/settings/data-export' as Href)}
        />
        {canUseOps ? (
          <NavRow
            testID="account-mailbox-ops-row"
            title="Mailbox ops"
            detail="Subscriptions, cursors, jobs"
            onPress={() => router.push('/ops/mailbox' as Href)}
          />
        ) : null}
        <NavRow
          testID="account-replay-row"
          title={t('account.rows.replayTitle')}
          onPress={confirmReplayOnboarding}
        />
      </SettingsGroup>

      <SettingsGroup title={t('account.legalHeading')} insetDividers={false}>
        <NavRow
          testID="account-legal-home-row"
          title={t('legal.footerHome')}
          onPress={() => router.push('/home' as Href)}
        />
        <NavRow
          testID="account-legal-privacy-row"
          title={t('legal.footerPrivacy')}
          onPress={() => router.push('/privacy' as Href)}
        />
        <NavRow
          testID="account-legal-terms-row"
          title={t('legal.footerTerms')}
          onPress={() => router.push('/terms' as Href)}
        />
      </SettingsGroup>
    </HubScreen>
  );
}

function AccountInboxRow({
  connected,
  email,
  syncSubtitle,
  verificationStatus,
  onPress,
}: {
  connected: boolean;
  email: string;
  syncSubtitle: string;
  verificationStatus: CreatorVerificationStatus;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Pressable
      testID="account-inbox-row"
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: `${theme.primary}18`, borderless: false }}
      style={({ pressed }) => [pressed && hubListStyles.pressablePressed]}>
      <View style={styles.accountInboxContentRow}>
        <View style={[hubListStyles.icon, { backgroundColor: theme.muted }]}>
          <Ionicons name="mail-outline" size={17} color={theme.primary} />
        </View>
        <View style={hubListStyles.body}>
          <Text style={[hubListStyles.title, { color: theme.foreground }]} numberOfLines={2}>
            {connected ? email : t('account.inboxNotConnected')}
          </Text>
          <Text
            style={[
              hubListStyles.subtitle,
              { color: connected ? theme.mutedForeground : theme.primary },
            ]}
            numberOfLines={2}>
            {syncSubtitle}
          </Text>
        </View>
        <View style={styles.accountInboxTrailing}>
          <Ionicons name="chevron-forward" size={16} color={theme.foregroundEyebrow} />
          {connected ? <CreatorVerificationBadge status={verificationStatus} compact /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function NavRow({
  title,
  detail,
  onPress,
  testID,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  testID?: string;
}) {
  return <HubNavRow testID={testID} title={title} detail={detail} onPress={onPress} />;
}

const styles = StyleSheet.create({
  profileHero: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileHeroPressed: { opacity: 0.88 },
  avatarRing: {
    borderWidth: 1,
    borderRadius: 32,
    padding: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarLabel: { fontSize: 24, fontWeight: '800' },
  profileText: { flex: 1, gap: 2 },
  profileName: { fontSize: fontSize.sectionTitle, fontWeight: '800', letterSpacing: -0.4, lineHeight: lineHeight.lead },
  profileMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  profileMeta: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body, flex: 1 },
  signOut: {
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  signOutPressed: { opacity: 0.65 },
  signOutLabel: { fontSize: fontSize.body, fontWeight: '600' },
  inviteBanner: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  inviteBannerText: { flex: 1, gap: spacing.xs },
  inviteBannerTitle: { fontSize: fontSize.body, fontWeight: '700', lineHeight: lineHeight.body },
  inviteBannerLead: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  accountInboxContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: layout.touchMin - 4,
  },
  accountInboxTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
});
