import { Ionicons } from '@expo/vector-icons';
import { Stack, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import appI18n from '@/src/i18n';

import { GoogleOAuthButton, type GoogleOAuthLifecycleEvent } from '@/components/oauth/GoogleOAuthButton';
import { GoogleIcon } from '@/components/oauth/GoogleIcon';
import { MicrosoftOAuthButton } from '@/components/oauth/MicrosoftOAuthButton';
import { MicrosoftIcon } from '@/components/oauth/MicrosoftIcon';
import { OAuthUnconfiguredButton } from '@/components/oauth/OAuthUnconfiguredButton';
import { CreatorVerificationBadge } from '@/components/inbox/CreatorVerificationBadge';
import { Badge, getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchGoogleMailboxOAuthStatus, markInboxSetupSkipped } from '@/src/api/account-api';
import { useAccountOverview } from '@/src/hooks/use-account-overview';
import {
  createMailboxOAuthFlowId,
  mailboxOAuthPlatform,
  normalizeGmailOAuthFailureCode,
  trackGmailOAuthEvent,
} from '@/src/api/mailbox-oauth-analytics-api';
import {
  syncMailboxGoogleOAuthCodeToBackend,
  syncMailboxOAuthToBackend,
  syncMailboxToBackend,
} from '@/src/auth/sync-onboarding';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';
import { alertAction } from '@/src/lib/app-dialog';
import { useSessionStore } from '@/src/stores/session-store';

const MAILBOX_PRESETS = {
  gmail: {
    imapHost: 'imap.gmail.com',
    imapPort: '993',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
  },
  outlook: {
    imapHost: 'outlook.office365.com',
    imapPort: '993',
    smtpHost: 'smtp.office365.com',
    smtpPort: '587',
  },
  qq: {
    imapHost: 'imap.qq.com',
    imapPort: '993',
    smtpHost: 'smtp.qq.com',
    smtpPort: '465',
  },
  custom: {
    imapHost: '',
    imapPort: '993',
    smtpHost: '',
    smtpPort: '587',
  },
} as const;

type MailboxPresetKey = keyof typeof MAILBOX_PRESETS;

function mailboxPresetLabel(key: MailboxPresetKey, t: TFunction) {
  switch (key) {
    case 'gmail':
      return t('onboardingEmailScreen.presetGmail');
    case 'outlook':
      return t('onboardingEmailScreen.presetOutlook');
    case 'qq':
      return t('onboardingEmailScreen.presetQQ');
    default:
      return t('onboardingEmailScreen.presetOther');
  }
}

function DemoOAuthButton({
  provider,
  label,
  onPress,
}: {
  provider: 'google' | 'microsoft';
  label: string;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.demoOAuthButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
      {provider === 'google' ? <GoogleIcon size={20} /> : <MicrosoftIcon size={20} />}
      <Text style={[styles.demoOAuthButtonLabel, { color: theme.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export default function EmailOnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const fromAccount = source === 'account';
  const fromInbox = source === 'inbox';
  const fromRepair = source === 'inbox-repair' || source === 'draft-send';
  const fromMailboxSettings = fromAccount || fromInbox;
  const skipOnboardingPrerequisites = fromMailboxSettings || fromRepair;
  const authReady = useOnboardingRouteGuard('email', { skipPrerequisites: skipOnboardingPrerequisites });
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const completeEmailWizard = useSessionStore((s) => s.completeEmailWizard);
  const skipEmailWizard = useSessionStore((s) => s.skipEmailWizard);
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const complianceAcceptedAt = useSessionStore((s) => s.complianceAcceptedAt);
  const agentSendMode = useSessionStore((s) => s.agentSendMode);
  const creatorFocusMode = useSessionStore((s) => s.creatorFocusMode);
  const accountEmail = useSessionStore((s) => s.accountEmail);
  const mailboxConnection = useSessionStore((s) => s.mailboxConnection);
  const emailWizardFinished = useSessionStore((s) => s.emailWizardFinished);
  const emailSkipped = useSessionStore((s) => s.emailSkipped);
  const creatorVerificationStatus = useSessionStore((s) => s.creatorVerificationStatus);
  const publicDemo = useSessionStore((s) => s.demoWorkspaceKind === 'public');
  const overview = useAccountOverview({ enabled: !publicDemo });
  const overviewMailbox = overview.data?.mailbox;
  const connectedMailbox =
    overviewMailbox?.connected ||
    (emailWizardFinished && !emailSkipped && Boolean(mailboxConnection));
  const connectedInboxEmail =
    overviewMailbox?.emailAddress ?? mailboxConnection?.email ?? accountEmail ?? '';
  const showConnectedState = fromMailboxSettings && connectedMailbox;
  const showOnboardingChrome = !fromMailboxSettings;
  const [preset, setPreset] = useState<MailboxPresetKey>('gmail');
  const [mailbox, setMailbox] = useState(accountEmail ?? mailboxConnection?.email ?? '');
  const [imapHost, setImapHost] = useState<string>(MAILBOX_PRESETS.gmail.imapHost);
  const [imapPort, setImapPort] = useState<string>(MAILBOX_PRESETS.gmail.imapPort);
  const [smtpHost, setSmtpHost] = useState<string>(MAILBOX_PRESETS.gmail.smtpHost);
  const [smtpPort, setSmtpPort] = useState<string>(MAILBOX_PRESETS.gmail.smtpPort);
  const [appPassword, setAppPassword] = useState('');
  const [senderName, setSenderName] = useState(profileBasics?.displayName ?? '');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [manualSetupExpanded, setManualSetupExpanded] = useState(false);
  const [reconnectExpanded, setReconnectExpanded] = useState(false);
  const gmailFlowIdRef = useRef<string | null>(null);
  const gmailFlowStartedAtRef = useRef<number | null>(null);
  const gmailAnalyticsSource = fromMailboxSettings
    ? 'account'
    : source === 'inbox-repair'
      ? 'inbox_repair'
      : source === 'draft-send'
        ? 'draft_send'
        : 'onboarding';
  const apiMode = shouldUseBackendApi();
  const showDemoMode = () => {
    void alertAction(t('publicDemo.actionTitle'), t('publicDemo.mailboxActionBody'));
  };

  useEffect(() => {
    if (!authReady || !apiMode || publicDemo) return;
    const flowId = createMailboxOAuthFlowId();
    void trackGmailOAuthEvent({
      eventType: 'GMAIL_CONNECT_VIEWED',
      flowId,
      source: gmailAnalyticsSource,
    }).catch(() => undefined);
  }, [apiMode, authReady, gmailAnalyticsSource, publicDemo]);

  useEffect(() => {
    if (mailboxConnection?.email) {
      setMailbox(mailboxConnection.email);
      return;
    }
    if (accountEmail) {
      setMailbox(accountEmail);
    }
  }, [accountEmail, mailboxConnection]);

  useEffect(() => {
    if (profileBasics?.displayName) {
      setSenderName(profileBasics.displayName);
    }
  }, [profileBasics?.displayName]);

  const canConnect = useMemo(() => {
    const hasMailbox = mailbox.trim().includes('@');
    const hasPassword = appPassword.trim().length >= 6;
    if (preset !== 'custom') {
      return hasMailbox && hasPassword;
    }
    return (
      hasMailbox &&
      hasPassword &&
      imapHost.trim().length >= 6 &&
      smtpHost.trim().length >= 6 &&
      /^\d{2,5}$/.test(imapPort.trim()) &&
      /^\d{2,5}$/.test(smtpPort.trim())
    );
  }, [appPassword, imapHost, imapPort, mailbox, preset, smtpHost, smtpPort]);

  const syncStatusSubtitle = useMemo(() => {
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
  }, [overviewMailbox?.lastSyncAtISO, t]);

  const goNext = () => {
    if (fromRepair && router.canGoBack()) {
      router.back();
      return;
    }
    if (fromInbox) {
      router.replace('/inbox' as Href);
      return;
    }
    if (fromAccount) {
      router.replace('/account' as Href);
      return;
    }
    router.push('/onboarding/pricing-setup' as Href);
  };

  const selectPreset = (key: MailboxPresetKey) => {
    const next = MAILBOX_PRESETS[key];
    setPreset(key);
    setImapHost(next.imapHost);
    setImapPort(next.imapPort);
    setSmtpHost(next.smtpHost);
    setSmtpPort(next.smtpPort);
  };

  const googleMailboxOAuthStatus = useQuery({
    queryKey: ['mailbox-oauth', 'google', 'status'],
    queryFn: fetchGoogleMailboxOAuthStatus,
    enabled: apiMode && !publicDemo,
    staleTime: 60_000,
  });
  const gmailOAuthConfigured =
    !apiMode ||
    (Platform.OS === 'web'
      ? googleMailboxOAuthStatus.data?.codeExchangeEnabled === true
      : googleMailboxOAuthStatus.data?.clientConfigured === true);
  const manualPasswordLabel =
    preset === 'qq'
      ? t('onboardingEmailScreen.labelMailboxAuthCode')
      : t('onboardingEmailScreen.labelAppPassword');
  const manualPasswordPlaceholder =
    preset === 'qq'
      ? t('onboardingEmailScreen.mailboxAuthCodePlaceholder')
      : t('onboardingEmailScreen.appPasswordPlaceholder');

  const onOAuthConnected = (mailboxAddress: string) => {
    if (publicDemo) {
      showDemoMode();
      return;
    }
    completeEmailWizard(mailboxAddress.trim());
    goNext();
  };

  const showSyncError = async (titleKey: string, result: { error: string; code?: string; status?: number }) => {
    const details = result.code ? `${result.code}: ${result.error}` : result.error;
    setSyncState('error');
    setSyncMessage(details);
    await alertAction(t(titleKey), details);
  };

  const onGmailOAuthTokens = async (tokens: {
    accessToken: string;
    refreshToken?: string | null;
    clientId?: string;
  }): Promise<boolean> => {
    if (publicDemo) {
      showDemoMode();
      return false;
    }
    setSyncState('syncing');
    setSyncMessage(null);
    const result = await syncMailboxOAuthToBackend({
      provider: 'google',
      ...tokens,
      analytics: gmailAnalyticsContext(),
    });
    if (!result.ok) {
      await showSyncError('onboardingSync.mailboxTitle', result);
      return false;
    }
    return true;
  };

  const onGmailOAuthCode = async (payload: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
    clientId?: string;
  }) => {
    if (publicDemo) {
      showDemoMode();
      return;
    }
    setSyncState('syncing');
    setSyncMessage(null);
    const result = await syncMailboxGoogleOAuthCodeToBackend({
      ...payload,
      analytics: gmailAnalyticsContext(),
    });
    if (!result.ok) {
      await showSyncError('onboardingSync.mailboxTitle', result);
      return;
    }
    completeEmailWizard(result.data.emailAddress ?? mailbox.trim());
    goNext();
  };

  const gmailAnalyticsContext = () => ({
    flowId: gmailFlowIdRef.current ?? createMailboxOAuthFlowId(),
    source: gmailAnalyticsSource,
    platform: mailboxOAuthPlatform(),
  });

  const onGmailOAuthLifecycle = (event: GoogleOAuthLifecycleEvent) => {
    if (event.type === 'started') {
      gmailFlowIdRef.current = event.flowId;
      gmailFlowStartedAtRef.current = Date.now();
    }
    const eventType = event.type === 'started'
      ? 'GMAIL_OAUTH_STARTED'
      : event.type === 'callback_received'
        ? 'GMAIL_OAUTH_CALLBACK_RECEIVED'
        : event.type === 'cancelled'
          ? 'GMAIL_OAUTH_CANCELLED'
          : 'GMAIL_OAUTH_FAILED';
    void trackGmailOAuthEvent({
      eventType,
      flowId: event.flowId,
      source: gmailAnalyticsSource,
      failureCode: event.failureCode ? normalizeGmailOAuthFailureCode(event.failureCode) : undefined,
      durationMs: event.type === 'started' || gmailFlowStartedAtRef.current == null
        ? undefined
        : Math.max(0, Date.now() - gmailFlowStartedAtRef.current),
    }).catch(() => undefined);
  };

  const onMicrosoftMailboxTokens = async (accessToken: string, refreshToken?: string | null) => {
    if (publicDemo) {
      showDemoMode();
      return;
    }
    setSyncState('syncing');
    setSyncMessage(null);
    const result = await syncMailboxOAuthToBackend({ provider: 'microsoft', accessToken, refreshToken });
    if (!result.ok) {
      await showSyncError('onboardingSync.mailboxTitle', result);
      return;
    }
  };

  const onConnected = async () => {
    if (publicDemo) {
      showDemoMode();
      return;
    }
    if (!isAuthenticated) {
      router.replace('/home' as Href);
      return;
    }
    if (!profileBasics) {
      router.replace('/onboarding/profile' as Href);
      return;
    }
    if (!complianceAcceptedAt) {
      router.replace('/onboarding/consent' as Href);
      return;
    }
    if (!canConnect) return;
    setSyncState('syncing');
    setSyncMessage(null);
    const result = await syncMailboxToBackend({
      emailAddress: mailbox.trim(),
      password: appPassword.trim(),
      preset:
        preset === 'gmail' ? 'gmail' : preset === 'outlook' ? 'outlook' : preset === 'qq' ? 'qq' : undefined,
      imapHost: preset === 'custom' ? imapHost.trim() : undefined,
      imapPort: preset === 'custom' ? Number(imapPort) : undefined,
      smtpHost: preset === 'custom' ? smtpHost.trim() : undefined,
      smtpPort: preset === 'custom' ? Number(smtpPort) : undefined,
    });
    if (!result.ok) {
      await showSyncError('onboardingSync.mailboxTitle', result);
      return;
    }
    completeEmailWizard(mailbox.trim());
    goNext();
  };

  const onSkip = () => {
    if (publicDemo) {
      showDemoMode();
      return;
    }
    if (!isAuthenticated) {
      router.replace('/home' as Href);
      return;
    }
    if (!profileBasics) {
      router.replace('/onboarding/profile' as Href);
      return;
    }
    if (!complianceAcceptedAt) {
      router.replace('/onboarding/consent' as Href);
      return;
    }
    skipEmailWizard();
    void trackGmailOAuthEvent({
      eventType: 'GMAIL_CONNECT_SKIPPED',
      flowId: createMailboxOAuthFlowId(),
      source: gmailAnalyticsSource,
    }).catch(() => undefined);
    void markInboxSetupSkipped({
      agentSendMode: agentSendMode ?? undefined,
      creatorFocusMode,
    });
    goNext();
  };

  const gmailConnectLabel = showConnectedState
    ? t('onboardingEmailScreen.reconnectGmail')
    : t('onboardingEmailScreen.connectGmail');
  const outlookConnectLabel = showConnectedState
    ? t('onboardingEmailScreen.reconnectOutlook')
    : t('onboardingEmailScreen.connectOutlook');

  const syncBanner =
    syncState !== 'idle' ? (
      <View
        style={[
          styles.syncBanner,
          {
            borderColor:
              syncState === 'error'
                ? '#EF4444'
                : syncState === 'success'
                  ? '#34D399'
                  : theme.border,
            backgroundColor:
              syncState === 'error'
                ? 'rgba(239,68,68,0.14)'
                : syncState === 'success'
                  ? 'rgba(52,211,153,0.14)'
                  : theme.card,
          },
        ]}>
        {syncState === 'syncing' ? <ActivityIndicator color={theme.primary} /> : null}
        <Text style={[styles.syncBannerText, { color: theme.foreground }]}>
          {syncMessage ?? t('onboardingSync.mailboxWorking')}
        </Text>
      </View>
    ) : null;

  const quickConnect = (
    <View style={styles.quickConnect}>
      {publicDemo ? (
        <DemoOAuthButton provider="google" label={gmailConnectLabel} onPress={showDemoMode} />
      ) : gmailOAuthConfigured ? (
        <GoogleOAuthButton
          label={gmailConnectLabel}
          variant="gmail"
          onGmailOAuthTokens={apiMode ? onGmailOAuthTokens : undefined}
          onGoogleAuthCode={apiMode ? onGmailOAuthCode : undefined}
          onOAuthLifecycle={onGmailOAuthLifecycle}
          onSuccess={onOAuthConnected}
          onError={(msg) => void alertAction(t('onboardingEmailScreen.gmailConnectFailTitle'), msg)}
        />
      ) : (
        <OAuthUnconfiguredButton provider="google" label={gmailConnectLabel} />
      )}
      {publicDemo ? (
        <DemoOAuthButton provider="microsoft" label={outlookConnectLabel} onPress={showDemoMode} />
      ) : (
        <MicrosoftOAuthButton
          label={outlookConnectLabel}
          variant="mailbox"
          onMicrosoftAccessToken={apiMode ? onMicrosoftMailboxTokens : undefined}
          onSuccess={onOAuthConnected}
          onError={(msg) => void alertAction(t('onboardingEmailScreen.outlookConnectFailTitle'), msg)}
        />
      )}
    </View>
  );

  const manualSetupCard = (
    <View style={[styles.manualSetupCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: manualSetupExpanded }}
        accessibilityLabel={
          manualSetupExpanded
            ? t('onboardingEmailScreen.manualSetupCollapseA11y')
            : t('onboardingEmailScreen.manualSetupExpandA11y')
        }
        onPress={() => setManualSetupExpanded((value) => !value)}
        style={({ pressed }) => [styles.manualSetupHeader, pressed && { opacity: 0.85 }]}>
        <View style={styles.manualSetupHeaderText}>
          <Text style={[styles.manualSetupTitle, { color: theme.foreground }]}>
            {t('onboardingEmailScreen.manualSetupTitle')}
          </Text>
          <Text style={[styles.manualSetupSubtitle, { color: theme.mutedForeground }]}>
            {t('onboardingEmailScreen.manualSetupSubtitle')}
          </Text>
        </View>
        <Ionicons
          name={manualSetupExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {manualSetupExpanded ? (
        <View style={styles.manualSetupBody}>
          <View style={styles.presetRow}>
            {(Object.keys(MAILBOX_PRESETS) as MailboxPresetKey[]).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: preset === key }}
                onPress={() => selectPreset(key)}
                style={[
                  styles.presetChip,
                  {
                    borderColor: preset === key ? theme.primary : theme.border,
                    backgroundColor: preset === key ? theme.accentMintSoft : theme.card,
                  },
                ]}>
                <Text
                  style={[
                    styles.presetLabel,
                    { color: preset === key ? theme.primary : theme.foregroundSubtitle },
                  ]}>
                  {mailboxPresetLabel(key, t)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {t('onboardingEmailScreen.labelMailbox')}
          </Text>
          <TextInput
            value={mailbox}
            onChangeText={setMailbox}
            editable={!publicDemo}
            onPressIn={publicDemo ? showDemoMode : undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="brand@example.com"
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />

          {preset === 'custom' ? (
            <>
              <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
                {t('onboardingEmailScreen.labelImapServer')}
              </Text>
              <TextInput
                value={imapHost}
                onChangeText={setImapHost}
                editable={!publicDemo}
                onPressIn={publicDemo ? showDemoMode : undefined}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="imap.example.com"
                {...getTextInputProps(theme)}
                style={getTextInputStyle(theme)}
              />
              <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
                {t('onboardingEmailScreen.labelImapPort')}
              </Text>
              <TextInput
                value={imapPort}
                onChangeText={setImapPort}
                editable={!publicDemo}
                onPressIn={publicDemo ? showDemoMode : undefined}
                keyboardType="number-pad"
                placeholder="993"
                {...getTextInputProps(theme)}
                style={getTextInputStyle(theme)}
              />
              <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
                {t('onboardingEmailScreen.labelSmtpServer')}
              </Text>
              <TextInput
                value={smtpHost}
                onChangeText={setSmtpHost}
                editable={!publicDemo}
                onPressIn={publicDemo ? showDemoMode : undefined}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="smtp.example.com"
                {...getTextInputProps(theme)}
                style={getTextInputStyle(theme)}
              />
              <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
                {t('onboardingEmailScreen.labelSmtpPort')}
              </Text>
              <TextInput
                value={smtpPort}
                onChangeText={setSmtpPort}
                editable={!publicDemo}
                onPressIn={publicDemo ? showDemoMode : undefined}
                keyboardType="number-pad"
                placeholder="587"
                {...getTextInputProps(theme)}
                style={getTextInputStyle(theme)}
              />
            </>
          ) : null}

          <View style={styles.twoColumn}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
                {t('onboardingEmailScreen.labelSenderName')}
              </Text>
              <TextInput
                value={senderName}
                onChangeText={setSenderName}
                editable={!publicDemo}
                onPressIn={publicDemo ? showDemoMode : undefined}
                placeholder="Your public name"
                {...getTextInputProps(theme)}
                style={getTextInputStyle(theme)}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
            {manualPasswordLabel}
          </Text>
          <TextInput
            value={appPassword}
            onChangeText={setAppPassword}
            editable={!publicDemo}
            onPressIn={publicDemo ? showDemoMode : undefined}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={manualPasswordPlaceholder}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          {preset === 'qq' ? (
            <Text style={[styles.oauthHint, { color: theme.mutedForeground }]}>
              {t('onboardingEmailScreen.qqAuthHint')}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={(!publicDemo && !canConnect) || syncState === 'syncing'}
            onPress={onConnected}
            style={[
              styles.primary,
              {
                backgroundColor: (publicDemo || canConnect) && syncState !== 'syncing' ? theme.primary : theme.secondary,
                opacity: syncState === 'syncing' ? 0.75 : 1,
                marginTop: spacing.sm,
              },
            ]}>
            <Text
              style={[
                styles.primaryLabel,
                {
                  color:
                    (publicDemo || canConnect) && syncState !== 'syncing'
                      ? theme.primaryForeground
                      : theme.foregroundEyebrow,
                },
              ]}>
              {syncState === 'syncing'
                ? t('onboardingEmailScreen.ctaConnectingInbox')
                : t('onboardingEmailScreen.ctaConnectInbox')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      {fromInbox ? (
        <Stack.Screen
          options={{
            headerLeft: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('navigation.back')}
                hitSlop={8}
                onPress={() => router.replace('/inbox' as Href)}
                style={styles.headerBackButton}>
                <Ionicons name="arrow-back" size={24} color={theme.foreground} />
              </Pressable>
            ),
          }}
        />
      ) : null}
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
      {!authReady ? (
        <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
      ) : (
        <>
          {showConnectedState ? (
            <>
              <Text style={[styles.title, { color: theme.foreground }]}>
                {t('onboardingEmailScreen.connectedTitle')}
              </Text>

              <View
                testID="onboarding-email-connected"
                style={[styles.connectedCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={[styles.connectedIcon, { backgroundColor: theme.muted }]}>
                  <Ionicons name="mail-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.connectedBody}>
                  <Text style={[styles.connectedEmail, { color: theme.foreground }]} numberOfLines={2}>
                    {connectedInboxEmail}
                  </Text>
                  <Text style={[styles.connectedSync, { color: theme.mutedForeground }]} numberOfLines={2}>
                    {syncStatusSubtitle}
                  </Text>
                  <Text style={[styles.connectedHint, { color: theme.mutedForeground }]}>
                    {t('onboardingEmailScreen.connectedStatusSubtitle')}
                  </Text>
                  <CreatorVerificationBadge status={creatorVerificationStatus} compact />
                </View>
              </View>

              {syncBanner}

              <View style={[styles.manualSetupCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: reconnectExpanded }}
                  accessibilityLabel={
                    reconnectExpanded
                      ? t('onboardingEmailScreen.reconnectCollapseA11y')
                      : t('onboardingEmailScreen.reconnectExpandA11y')
                  }
                  onPress={() => setReconnectExpanded((value) => !value)}
                  style={({ pressed }) => [styles.manualSetupHeader, pressed && { opacity: 0.85 }]}>
                  <View style={styles.manualSetupHeaderText}>
                    <Text style={[styles.manualSetupTitle, { color: theme.foreground }]}>
                      {t('onboardingEmailScreen.reconnectHeading')}
                    </Text>
                    <Text style={[styles.manualSetupSubtitle, { color: theme.mutedForeground }]}>
                      {t('onboardingEmailScreen.reconnectSubtitle')}
                    </Text>
                  </View>
                  <Ionicons
                    name={reconnectExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.foregroundEyebrow}
                  />
                </Pressable>

                {reconnectExpanded ? (
                  <View style={styles.reconnectBody}>
                    {quickConnect}
                    {manualSetupCard}
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <>
              {showOnboardingChrome ? (
                <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>
                  {t('onboardingEmailScreen.stepLabel')}
                </Text>
              ) : null}
              <Text style={[styles.title, { color: theme.foreground }]}>
                {t('onboardingEmailScreen.title')}
              </Text>

              {showOnboardingChrome ? <OnboardingProgress current="email" /> : null}

              {skipOnboardingPrerequisites ? (
                <Text style={[styles.note, { color: theme.foregroundEyebrow }]}>
                  {t('onboardingEmailScreen.noteFromAccount')}
                </Text>
              ) : null}

              {syncBanner}

              <SectionCard
                title={t('onboardingEmailScreen.aiImportsTitle')}
                subtitle={t('onboardingEmailScreen.aiImportsSubtitle')}
                emphasis>
                <View style={styles.scopeGrid}>
                  <View style={[styles.scopeCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    <Badge tone="mint" label={t('onboardingEmailScreen.badgeSignal')} />
                    <Text style={[styles.scopeText, { color: theme.foreground }]}>
                      {t('onboardingEmailScreen.signalHint')}
                    </Text>
                  </View>
                  <View style={[styles.scopeCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    <Badge tone="warning" label={t('onboardingEmailScreen.badgeControlHub')} />
                    <Text style={[styles.scopeText, { color: theme.foreground }]}>
                      {t('onboardingEmailScreen.controlHint')}
                    </Text>
                  </View>
                </View>
              </SectionCard>

              {quickConnect}
              {manualSetupCard}

              <Pressable
                testID="onboarding-email-skip"
                accessibilityRole="button"
                onPress={onSkip}
                style={[styles.secondary, { borderColor: theme.border }]}>
                <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                  {t('onboardingEmailScreen.ctaSkip')}
                </Text>
              </Pressable>
            </>
          )}
        </>
      )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sectionY,
    gap: spacing.lg,
  },
  kicker: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.3, lineHeight: 44 },
  connectedCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  connectedIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  connectedBody: { flex: 1, gap: spacing.xs },
  connectedEmail: {
    fontSize: fontSize.body,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  connectedSync: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  connectedHint: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  reconnectBody: { gap: spacing.md },
  quickConnect: { gap: spacing.sm },
  demoOAuthButton: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerBackButton: {
    minWidth: layout.touchMin,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoOAuthButtonLabel: { fontSize: fontSize.body, fontWeight: '600' },
  manualSetupCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  manualSetupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  manualSetupHeaderText: { flex: 1, gap: spacing.xs },
  manualSetupTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  manualSetupSubtitle: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  manualSetupBody: { gap: spacing.sm },
  oauthHint: { fontSize: fontSize.caption, lineHeight: 18 },
  label: { fontSize: fontSize.caption, fontWeight: '700', marginTop: spacing.md },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.touchMin - 8,
    justifyContent: 'center',
  },
  presetLabel: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  scopeGrid: { flexDirection: 'row', gap: spacing.sm },
  scopeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  scopeText: { fontSize: fontSize.caption, lineHeight: lineHeight.body, fontWeight: '700' },
  twoColumn: { flexDirection: 'row', gap: spacing.sm },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  note: { fontSize: fontSize.caption, lineHeight: 18 },
  syncBanner: {
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  syncBannerText: { flex: 1, fontSize: fontSize.caption, fontWeight: '700', lineHeight: 18 },
});
