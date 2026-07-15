import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { GoogleOAuthButton, type GoogleOAuthLifecycleEvent } from '@/components/oauth/GoogleOAuthButton';
import { MicrosoftOAuthButton } from '@/components/oauth/MicrosoftOAuthButton';
import { OAuthUnconfiguredButton } from '@/components/oauth/OAuthUnconfiguredButton';
import { Badge, getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchGoogleMailboxOAuthStatus, markInboxSetupSkipped } from '@/src/api/account-api';
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

export default function EmailOnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const fromAccount = source === 'account';
  const fromRepair = source === 'inbox-repair' || source === 'draft-send';
  const skipOnboardingPrerequisites = fromAccount || fromRepair;
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
  const gmailFlowIdRef = useRef<string | null>(null);
  const gmailFlowStartedAtRef = useRef<number | null>(null);
  const gmailAnalyticsSource = fromAccount
    ? 'account'
    : source === 'inbox-repair'
      ? 'inbox_repair'
      : source === 'draft-send'
        ? 'draft_send'
        : 'onboarding';
  const apiMode = shouldUseBackendApi();

  useEffect(() => {
    if (!authReady || !apiMode) return;
    const flowId = createMailboxOAuthFlowId();
    void trackGmailOAuthEvent({
      eventType: 'GMAIL_CONNECT_VIEWED',
      flowId,
      source: gmailAnalyticsSource,
    }).catch(() => undefined);
  }, [apiMode, authReady, gmailAnalyticsSource]);

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

  const goNext = () => {
    if (fromRepair && router.canGoBack()) {
      router.back();
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
    enabled: apiMode,
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
    setSyncState('syncing');
    setSyncMessage(null);
    const result = await syncMailboxOAuthToBackend({ provider: 'microsoft', accessToken, refreshToken });
    if (!result.ok) {
      await showSyncError('onboardingSync.mailboxTitle', result);
      return;
    }
  };

  const onConnected = async () => {
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled">
      {!authReady ? (
        <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
      ) : (
        <>
      <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>{t('onboardingEmailScreen.stepLabel')}</Text>
      <Text style={[styles.title, { color: theme.foreground }]}>{t('onboardingEmailScreen.title')}</Text>

      <OnboardingProgress current="email" />

      {skipOnboardingPrerequisites ? (
        <Text style={[styles.note, { color: theme.foregroundEyebrow }]}>
          {t('onboardingEmailScreen.noteFromAccount')}
        </Text>
      ) : null}

      {syncState !== 'idle' ? (
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
      ) : null}

      <SectionCard title={t('onboardingEmailScreen.aiImportsTitle')} subtitle={t('onboardingEmailScreen.aiImportsSubtitle')} emphasis>
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

      <View style={styles.quickConnect}>
        {gmailOAuthConfigured ? (
          <GoogleOAuthButton
            label={t('onboardingEmailScreen.connectGmail')}
            variant="gmail"
            onGmailOAuthTokens={apiMode ? onGmailOAuthTokens : undefined}
            onGoogleAuthCode={apiMode ? onGmailOAuthCode : undefined}
            onOAuthLifecycle={onGmailOAuthLifecycle}
            onSuccess={onOAuthConnected}
            onError={(msg) => void alertAction(t('onboardingEmailScreen.gmailConnectFailTitle'), msg)}
          />
        ) : (
          <OAuthUnconfiguredButton provider="google" label={t('onboardingEmailScreen.connectGmail')} />
        )}
        <MicrosoftOAuthButton
          label={t('onboardingEmailScreen.connectOutlook')}
          variant="mailbox"
          onMicrosoftAccessToken={apiMode ? onMicrosoftMailboxTokens : undefined}
          onSuccess={onOAuthConnected}
          onError={(msg) => void alertAction(t('onboardingEmailScreen.outlookConnectFailTitle'), msg)}
        />
      </View>

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
              disabled={!canConnect || syncState === 'syncing'}
              onPress={onConnected}
              style={[
                styles.primary,
                {
                  backgroundColor: canConnect && syncState !== 'syncing' ? theme.primary : theme.secondary,
                  opacity: syncState === 'syncing' ? 0.75 : 1,
                  marginTop: spacing.sm,
                },
              ]}>
              <Text
                style={[
                  styles.primaryLabel,
                  { color: canConnect && syncState !== 'syncing' ? theme.primaryForeground : theme.foregroundEyebrow },
                ]}>
                {syncState === 'syncing'
                  ? t('onboardingEmailScreen.ctaConnectingInbox')
                  : t('onboardingEmailScreen.ctaConnectInbox')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

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
    </ScrollView>
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
  quickConnect: { gap: spacing.sm },
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
