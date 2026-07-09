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
import { AuthUtilityFooter } from '@/components/auth/AuthUtilityFooter';
import { GoogleOAuthButton } from '@/components/oauth/GoogleOAuthButton';
import { MicrosoftOAuthButton } from '@/components/oauth/MicrosoftOAuthButton';
import { getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, spacing } from '@/constants/tokens';
import { resolvePostAuthRoute } from '@/src/auth/post-auth-navigation';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { isGoogleOAuthConfigured, isMicrosoftOAuthConfigured } from '@/src/auth/oauth-env';
import { useSessionStore } from '@/src/stores/session-store';
import { useTranslation } from 'react-i18next';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { login, loginGoogle, loginGoogleWithAuthCode, loginMicrosoft, loading, apiMode } = useAuthActions();
  const signInDemo = useSessionStore((s) => s.signInDemo);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const oauthConfigured = isGoogleOAuthConfigured() || isMicrosoftOAuthConfigured();
  const [emailFormExpanded, setEmailFormExpanded] = useState(!oauthConfigured);

  const canSubmit = EMAIL_PATTERN.test(email.trim()) && (apiMode ? password.length >= 8 : true);

  const onContinue = async () => {
    if (!canSubmit || loading) return;
    const result = await login({ email: email.trim(), password });
    if (!result.ok) {
      void alertAction(t('auth.login.errors.submit'), result.message);
      return;
    }
    router.replace(resolvePostAuthRoute(redirect) as Href);
  };

  const finishOAuthLogin = (account: string) => {
    signInDemo(account);
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
    <>
      <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.login.emailLabel')}</Text>
      <TextInput
        testID="auth-login-email"
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.login.emailPlaceholder')}
        {...getTextInputProps(theme)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        style={getTextInputStyle(theme)}
      />
      {apiMode ? (
        <>
          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.passwordLabel')}</Text>
          <TextInput
            testID="auth-login-password"
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            {...getTextInputProps(theme)}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            style={getTextInputStyle(theme)}
          />
        </>
      ) : null}

      <AuthPrimaryButton
        testID="auth-login-submit"
        disabled={!canSubmit}
        loading={loading}
        onPress={onContinue}
        label={t('auth.login.continue')}
      />
    </>
  );

  return (
    <AuthScreenShell
      testID="screen-auth-login"
      title={t('auth.login.title')}
      lead={t('auth.login.lead')}
      footer={
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/forgot-password' as Href)}
            style={styles.link}>
            <Text style={{ color: theme.mutedForeground }}>{t('auth.login.forgotPassword')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/register' as Href)}
            style={styles.link}>
            <Text style={{ color: theme.mutedForeground }}>{t('auth.login.createAccount')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={backToWelcome} style={styles.link}>
            <Text style={{ color: theme.mutedForeground }}>{t('auth.login.back')}</Text>
          </Pressable>
          <AuthUtilityFooter />
        </>
      }>
      <SectionCard title={t('auth.login.socialTitle')}>
        <View style={{ gap: spacing.sm }}>
          <GoogleOAuthButton
            label={t('auth.login.googleOAuth')}
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
              if (!apiMode) finishOAuthLogin(account);
            }}
            onError={(msg) => void alertAction(t('auth.login.errors.google'), msg)}
          />
          <MicrosoftOAuthButton
            label={t('auth.login.microsoftOAuth')}
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
              if (!apiMode) finishOAuthLogin(account);
            }}
            onError={(msg) => void alertAction(t('auth.login.errors.microsoft'), msg)}
          />
        </View>

        <AuthEmailExpandSection
          expanded={emailFormExpanded}
          onExpand={() => setEmailFormExpanded(true)}
          expandLabel={t('auth.login.useEmailLogin')}
          dividerLabel={t('auth.login.orUseEmail')}
          expandTestID="auth-login-expand-email"
          theme={theme}>
          {emailFields}
        </AuthEmailExpandSection>
      </SectionCard>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  link: { alignItems: 'center', paddingVertical: spacing.sm },
});
