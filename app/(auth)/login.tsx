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
    router.replace('/welcome' as Href);
  };

  const emailFields = (
    <>
      {!isApiConfigured() ? (
        <Text style={[styles.apiHint, { color: theme.mutedForeground }]}>{t('auth.demoModeHint')}</Text>
      ) : null}
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

      <Pressable
        testID="auth-login-submit"
        accessibilityRole="button"
        disabled={!canSubmit || loading}
        onPress={onContinue}
        style={[
          styles.primary,
          { backgroundColor: canSubmit && !loading ? theme.primary : theme.border },
        ]}
        android_ripple={{ color: `${theme.primaryForeground}33` }}>
        {loading ? (
          <ActivityIndicator color={theme.primaryForeground} />
        ) : (
          <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>{t('auth.login.continue')}</Text>
        )}
      </Pressable>
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.login.title')}</Text>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.login.lead')}</Text>

          <SectionCard
            title={t('auth.login.readyCardTitle')}
            subtitle={t('auth.login.readyCardSubtitle')}
            emphasis>
            <View style={styles.returnRow}>
              <Badge tone="warning" label={t('auth.login.reviewQueueBadge')} />
              <Text style={[styles.returnText, { color: theme.foreground }]}>{t('auth.login.reviewQueueHint')}</Text>
            </View>
          </SectionCard>

          <SectionCard title={t('auth.login.socialTitle')}>
            {!oauthConfigured ? (
              <Text style={[styles.oauthHint, { color: theme.mutedForeground }]}>
                {t('auth.login.oauthSetupHint')}
              </Text>
            ) : null}
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

          <View style={styles.footer}>
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
  title: { fontSize: 24, fontWeight: '600' },
  lead: { fontSize: fontSize.body, lineHeight: 22 },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  apiHint: { fontSize: fontSize.caption, marginBottom: spacing.sm },
  oauthHint: { fontSize: fontSize.caption, lineHeight: 18, marginBottom: spacing.sm },
  returnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  returnText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: 20, fontWeight: '700' },
  footer: { marginTop: 'auto', gap: spacing.sm, paddingBottom: spacing.xxl },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  link: { alignItems: 'center', paddingVertical: spacing.sm },
});
