import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { alertAction } from '@/src/lib/app-dialog';

import { AuthEmailExpandSection } from '@/components/auth/AuthEmailExpandSection';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { GoogleOAuthButton } from '@/components/oauth/GoogleOAuthButton';
import { MicrosoftOAuthButton } from '@/components/oauth/MicrosoftOAuthButton';
import { getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';
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
  theme: ThemePalette;
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

      <AuthPrimaryButton
        testID="auth-register-submit"
        disabled={!canSubmit}
        loading={loading}
        onPress={onContinue}
        label={t(isApiConfigured() ? 'auth.register.sendCode' : 'auth.register.createAccount')}
      />

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
    router.replace('/home' as Href);
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
    <AuthScreenShell
      testID="screen-auth-register"
      header={
        <View style={styles.hero} className={webClassName(corporateCleanClass.animateIn)}>
          <Text
            className={webClassName(corporateCleanClass.gradientText)}
            style={[styles.title, { color: theme.foreground }]}>
            {t('auth.register.title')}
          </Text>
        </View>
      }
      footer={
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login' as Href)}
            style={styles.link}>
            <Text style={{ color: theme.mutedForeground }}>{t('auth.register.signInInstead')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={backToWelcome} style={styles.linkCompact}>
            <Text style={{ color: theme.foregroundEyebrow }}>{t('auth.register.back')}</Text>
          </Pressable>
        </>
      }>
        <SectionCard
          title={t('auth.register.freeWorkspaceTitle')}
          subtitle={t('auth.register.freeWorkspaceSubtitle')}
          emphasis
          accentBar={false}>
          <View style={styles.promiseGrid}>
            <View style={[styles.promiseCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.promiseTitle, { color: theme.primary }]}>{t('auth.register.promiseQueueBadge')}</Text>
              <Text style={[styles.promiseText, { color: theme.foreground }]}>{t('auth.register.promiseQueueText')}</Text>
            </View>
            <View style={[styles.promiseCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.promiseTitle, { color: theme.foregroundEyebrow }]}>
                {t('auth.register.promiseControlBadge')}
              </Text>
              <Text style={[styles.promiseText, { color: theme.foreground }]}>{t('auth.register.promiseControlText')}</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title={t('auth.register.socialTitle')}>
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
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  promiseGrid: { gap: spacing.sm },
  promiseCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  promiseTitle: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  promiseText: { fontSize: fontSize.caption, lineHeight: 18, fontWeight: '600' },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  hint: { fontSize: fontSize.caption, marginTop: spacing.xs },
  promise: { textAlign: 'center', fontSize: fontSize.caption, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: spacing.sm },
  linkCompact: { alignItems: 'center', paddingVertical: spacing.xs },
});
