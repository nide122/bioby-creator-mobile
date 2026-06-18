import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { alertAction } from '@/src/lib/app-dialog';

import { AuthEmailExpandSection } from '@/components/auth/AuthEmailExpandSection';
import { GoogleOAuthButton } from '@/components/oauth/GoogleOAuthButton';
import { MicrosoftOAuthButton } from '@/components/oauth/MicrosoftOAuthButton';
import { Badge, getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { isApiConfigured } from '@/src/api/api-config';
import { resolvePostAuthRoute } from '@/src/auth/post-auth-navigation';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { isGoogleOAuthConfigured, isMicrosoftOAuthConfigured } from '@/src/auth/oauth-env';
import { useSessionStore } from '@/src/stores/session-store';
import { useTranslation } from 'react-i18next';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function EmailRegisterFields({
  theme,
  email,
  displayName,
  password,
  loading,
  canSubmit,
  onEmailChange,
  onDisplayNameChange,
  onPasswordChange,
  onContinue,
  t,
}: {
  theme: (typeof palette)['light'];
  email: string;
  displayName: string;
  password: string;
  loading: boolean;
  canSubmit: boolean;
  onEmailChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onContinue: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      {!isApiConfigured() ? (
        <Text style={[styles.apiHint, { color: theme.mutedForeground }]}>{t('auth.demoModeHint')}</Text>
      ) : null}
      <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.register.emailLabel')}</Text>
      <TextInput
        testID="auth-register-email"
        value={email}
        onChangeText={onEmailChange}
        placeholder={t('auth.login.emailPlaceholder')}
        {...getTextInputProps(theme)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        style={getTextInputStyle(theme)}
      />

      <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.register.publicNameLabel')}</Text>
      <TextInput
        testID="auth-register-name"
        value={displayName}
        onChangeText={onDisplayNameChange}
        placeholder={t('auth.register.namePlaceholder')}
        {...getTextInputProps(theme)}
        autoCapitalize="words"
        autoCorrect={false}
        style={getTextInputStyle(theme)}
      />

      <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.passwordLabel')}</Text>
      <TextInput
        testID="auth-register-password"
        value={password}
        onChangeText={onPasswordChange}
        placeholder={t('auth.passwordPlaceholder')}
        {...getTextInputProps(theme)}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        style={getTextInputStyle(theme)}
      />
      <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('auth.passwordMinHint')}</Text>

      <Pressable
        testID="auth-register-submit"
        accessibilityRole="button"
        disabled={!canSubmit || loading}
        onPress={onContinue}
        style={[
          styles.primary,
          { backgroundColor: canSubmit && !loading ? theme.primary : theme.secondary },
        ]}
        android_ripple={{ color: `${theme.primaryForeground}33` }}>
        {loading ? (
          <ActivityIndicator color={theme.primaryForeground} />
        ) : (
          <Text
            style={[
              styles.primaryLabel,
              { color: canSubmit ? theme.primaryForeground : theme.foregroundEyebrow },
            ]}>
            {t(isApiConfigured() ? 'auth.register.sendCode' : 'auth.register.createAccount')}
          </Text>
        )}
      </Pressable>

      <Text style={[styles.promise, { color: theme.foregroundEyebrow }]}>{t('auth.register.noCard')}</Text>
    </>
  );
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { register, loginGoogle, loginGoogleWithAuthCode, loginMicrosoft, loading, apiMode } =
    useAuthActions();
  const signInDemo = useSessionStore((s) => s.signInDemo);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const oauthConfigured = isGoogleOAuthConfigured() || isMicrosoftOAuthConfigured();
  const [emailFormExpanded, setEmailFormExpanded] = useState(!oauthConfigured);

  const canSubmit =
    EMAIL_PATTERN.test(email.trim()) &&
    displayName.trim().length >= 2 &&
    (apiMode ? password.length >= MIN_PASSWORD : true);

  const finishOAuthRegister = (account: string) => {
    signInDemo(account.trim(), { displayNameHint: displayName.trim() });
    router.replace(resolvePostAuthRoute(redirect) as Href);
  };

  const onContinue = async () => {
    if (!canSubmit || loading) return;
    const result = await register({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
    });
    if (!result.ok) {
      void alertAction(t('auth.register.errors.submit'), result.message);
      return;
    }
    if (result.requiresVerification) {
      const query = new URLSearchParams({ email: result.email });
      if (typeof redirect === 'string' && redirect.trim()) {
        query.set('redirect', redirect.trim());
      } else if (Array.isArray(redirect) && redirect[0]?.trim()) {
        query.set('redirect', redirect[0].trim());
      }
      router.replace(`/verify-email-pending?${query.toString()}` as Href);
      return;
    }
    router.replace(resolvePostAuthRoute(redirect) as Href);
  };

  const backToWelcome = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/welcome' as Href);
  };

  const emailFields = (
    <EmailRegisterFields
      theme={theme}
      email={email}
      displayName={displayName}
      password={password}
      loading={loading}
      canSubmit={canSubmit}
      onEmailChange={setEmail}
      onDisplayNameChange={setDisplayName}
      onPasswordChange={setPassword}
      onContinue={onContinue}
      t={t}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: theme.foregroundEyebrow }]}>{t('auth.register.eyebrow')}</Text>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.register.title')}</Text>
          <View style={styles.signalRow}>
            <Text style={[styles.signal, { color: '#5FD9FF' }]}>quote</Text>
            <Text style={[styles.signalDivider, { color: theme.foregroundEyebrow }]}>/</Text>
            <Text style={[styles.signal, { color: '#F086FF' }]}>rights</Text>
            <Text style={[styles.signalDivider, { color: theme.foregroundEyebrow }]}>/</Text>
            <Text style={[styles.signal, { color: '#A7F3D0' }]}>payout</Text>
          </View>
        </View>

        <SectionCard title={t('auth.register.freeWorkspaceTitle')} subtitle={t('auth.register.freeWorkspaceSubtitle')} emphasis>
          <View style={styles.promiseGrid}>
            <View style={[styles.promiseCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Badge tone="mint" label={t('auth.register.promiseQueueBadge')} />
              <Text style={[styles.promiseText, { color: theme.foreground }]}>{t('auth.register.promiseQueueText')}</Text>
            </View>
            <View style={[styles.promiseCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Badge tone="warning" label={t('auth.register.promiseControlBadge')} />
              <Text style={[styles.promiseText, { color: theme.foreground }]}>{t('auth.register.promiseControlText')}</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title={t('auth.register.socialTitle')}>
          {!oauthConfigured ? (
            <Text style={[styles.oauthHint, { color: theme.mutedForeground }]}>
              {t('auth.register.oauthSetupHint')}
            </Text>
          ) : null}
          <View style={{ gap: spacing.sm }}>
            <GoogleOAuthButton
              label={t('auth.register.googleOAuth')}
              variant="login"
              onGoogleIdToken={
                apiMode
                  ? async (idToken) => {
                      const result = await loginGoogle(idToken);
                      if (!result.ok) {
                        throw new Error(result.message);
                      }
                      router.replace(resolvePostAuthRoute(redirect) as Href);
                    }
                  : undefined
              }
              onGoogleAuthCode={
                apiMode
                  ? async (payload) => {
                      const result = await loginGoogleWithAuthCode(payload);
                      if (!result.ok) {
                        throw new Error(result.message);
                      }
                      router.replace(resolvePostAuthRoute(redirect) as Href);
                    }
                  : undefined
              }
              onSuccess={(account) => {
                if (!apiMode) finishOAuthRegister(account);
              }}
              onError={(msg) => void alertAction(t('auth.register.errors.google'), msg)}
            />
            <MicrosoftOAuthButton
              label={t('auth.register.microsoftOAuth')}
              variant="login"
              onMicrosoftAccessToken={
                apiMode
                  ? async (accessToken) => {
                      const result = await loginMicrosoft(accessToken);
                      if (!result.ok) {
                        throw new Error(result.message);
                      }
                      router.replace(resolvePostAuthRoute(redirect) as Href);
                    }
                  : undefined
              }
              onSuccess={(account) => {
                if (!apiMode) finishOAuthRegister(account);
              }}
              onError={(msg) => void alertAction(t('auth.register.errors.microsoft'), msg)}
            />
          </View>

          <AuthEmailExpandSection
            expanded={emailFormExpanded}
            onExpand={() => setEmailFormExpanded(true)}
            expandLabel={t('auth.register.useEmailRegister')}
            dividerLabel={t('auth.register.orUseEmail')}
            expandTestID="auth-register-expand-email"
            theme={theme}>
            {emailFields}
          </AuthEmailExpandSection>
        </SectionCard>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login' as Href)}
            style={styles.link}>
            <Text style={{ color: theme.mutedForeground }}>{t('auth.register.signInInstead')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={backToWelcome} style={styles.linkCompact}>
            <Text style={{ color: theme.foregroundEyebrow }}>{t('auth.register.back')}</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: spacing.xxl },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, gap: spacing.lg, paddingTop: spacing.sectionY },
  hero: { gap: spacing.sm, paddingTop: spacing.md },
  eyebrow: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.35, lineHeight: 44 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  signal: { fontSize: fontSize.lead, fontWeight: '900', letterSpacing: 0.2 },
  signalDivider: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  promiseGrid: { flexDirection: 'row', gap: spacing.sm },
  promiseCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  promiseText: { fontSize: fontSize.caption, lineHeight: 18, fontWeight: '700' },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  hint: { fontSize: fontSize.caption, marginTop: spacing.xs },
  apiHint: { fontSize: fontSize.caption, marginBottom: spacing.sm },
  oauthHint: { fontSize: fontSize.caption, lineHeight: 18, marginBottom: spacing.sm },
  footer: { marginTop: 'auto', gap: spacing.sm, paddingBottom: spacing.xxl },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '800', fontSize: fontSize.body },
  promise: { textAlign: 'center', fontSize: fontSize.caption, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: spacing.sm },
  linkCompact: { alignItems: 'center', paddingVertical: spacing.xs },
});
