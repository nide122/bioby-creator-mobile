import * as Google from 'expo-auth-session/providers/google';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { GoogleIcon } from '@/components/oauth/GoogleIcon';
import { OAuthUnconfiguredButton } from '@/components/oauth/OAuthUnconfiguredButton';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii } from '@/constants/tokens';
import {
  getGoogleAuthRequestConfig,
  getGoogleOAuthRedirectUri,
  normalizeOAuthRedirectUri,
  type GoogleAuthCodePayload,
} from '@/src/auth/google-oauth';
import { GOOGLE_MAILBOX_SCOPES } from '@/src/auth/google-mailbox-scopes';
import {
  googleAndroidClientId,
  googleIosClientId,
  googleWebClientId,
  isGoogleOAuthConfigured,
} from '@/src/auth/oauth-env';
import { fetchGooglePrimaryEmail } from '@/src/auth/oauth-user-profile';

type Props = {
  label?: string;
  /** Login only needs OIDC; Gmail connect asks for read + compose (sync + native drafts/send). */
  variant: 'login' | 'gmail';
  onSuccess: (email: string) => void;
  onError: (message: string) => void;
  /** Native / token flow for backend OAuth login. */
  onGoogleIdToken?: (idToken: string) => Promise<void>;
  /** Web auth-code flow exchanged on the backend with GOOGLE_OAUTH_CLIENT_SECRET. */
  onGoogleAuthCode?: (payload: GoogleAuthCodePayload) => Promise<void>;
  /** Gmail mailbox token flow for backend mailbox binding. */
  onGmailOAuthTokens?: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
    clientId?: string;
  }) => Promise<void>;
};

const LOGIN_SCOPES = ['openid', 'profile', 'email'];
const MAILBOX_SCOPES = [...GOOGLE_MAILBOX_SCOPES];

function getGoogleRuntimeClientId(): string | undefined {
  if (Platform.OS === 'web') return googleWebClientId;
  if (Platform.OS === 'ios') return googleIosClientId ?? googleWebClientId;
  if (Platform.OS === 'android') return googleAndroidClientId ?? googleWebClientId;
  return googleWebClientId;
}

export function GoogleOAuthButton(props: Props) {
  const { t } = useTranslation();
  if (!isGoogleOAuthConfigured()) {
    return (
      <OAuthUnconfiguredButton
        provider="google"
        label={
          props.label ??
          (props.variant === 'gmail' ? t('auth.oauth.googleMailbox') : t('auth.login.googleOAuth'))
        }
      />
    );
  }
  return <GoogleOAuthButtonImpl {...props} />;
}

function GoogleOAuthButtonImpl({
  label,
  variant,
  onSuccess,
  onError,
  onGoogleIdToken,
  onGoogleAuthCode,
  onGmailOAuthTokens,
}: Props) {
  const { i18n, t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const scopes = useMemo(
    () => (variant === 'gmail' ? MAILBOX_SCOPES : LOGIN_SCOPES),
    [variant],
  );

  const oauthUiLanguage = i18n.language.startsWith('zh') ? 'zh-CN' : 'en';
  const redirectUri = useMemo(() => normalizeOAuthRedirectUri(getGoogleOAuthRedirectUri()), []);

  const config = useMemo(
    () =>
      getGoogleAuthRequestConfig({
        ...(googleWebClientId ? { webClientId: googleWebClientId } : {}),
        ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
        ...(googleAndroidClientId ? { androidClientId: googleAndroidClientId } : {}),
        scopes,
        language: oauthUiLanguage,
        redirectUri,
        extraParams:
          variant === 'gmail'
            ? {
                access_type: 'offline',
                prompt: 'consent',
              }
            : undefined,
        // App logout does not clear Google cookies, so always show account picker on sign-in.
        selectAccount: variant === 'login',
      }),
    [oauthUiLanguage, redirectUri, scopes, variant],
  );

  const [request, , promptAsync] = Google.useAuthRequest(config);
  const [busy, setBusy] = useState(false);

  const handlePress = useCallback(async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        onError(result.type === 'error' ? result.error?.message ?? 'google_auth_error' : `google_${result.type}`);
        return;
      }

      const clientId = getGoogleRuntimeClientId();

      if (variant === 'gmail' && Platform.OS === 'web' && result.params.code) {
        if (!onGoogleAuthCode) {
          onError('google_missing_auth_code_handler');
          return;
        }
        const codeVerifier = request.codeVerifier;
        if (!codeVerifier) {
          onError('google_missing_code_verifier');
          return;
        }
        await onGoogleAuthCode({
          code: result.params.code,
          redirectUri,
          codeVerifier,
          clientId,
        });
        return;
      }

      if (variant === 'gmail' && onGmailOAuthTokens) {
        const accessToken = result.authentication?.accessToken ?? result.params.access_token;
        const refreshToken = result.authentication?.refreshToken ?? result.params.refresh_token;
        if (!accessToken) {
          onError('google_missing_access_token');
          return;
        }
        await onGmailOAuthTokens({ accessToken, refreshToken, clientId });
        const email = await fetchGooglePrimaryEmail(accessToken);
        onSuccess(email);
        return;
      }

      if (variant === 'login' && Platform.OS === 'web' && result.params.code) {
        if (!onGoogleAuthCode) {
          onError('google_missing_auth_code_handler');
          return;
        }
        const codeVerifier = request.codeVerifier;
        if (!codeVerifier) {
          onError('google_missing_code_verifier');
          return;
        }
        await onGoogleAuthCode({
          code: result.params.code,
          redirectUri,
          codeVerifier,
          clientId,
        });
        return;
      }

      const idToken = result.authentication?.idToken ?? result.params.id_token;
      if (variant === 'login' && onGoogleIdToken && idToken) {
        await onGoogleIdToken(idToken);
        const accessToken = result.authentication?.accessToken ?? result.params.access_token;
        if (accessToken) {
          const email = await fetchGooglePrimaryEmail(accessToken);
          onSuccess(email);
        }
        return;
      }

      const accessToken = result.authentication?.accessToken ?? result.params.access_token;
      if (!accessToken) {
        onError('google_missing_access_token');
        return;
      }
      const email = await fetchGooglePrimaryEmail(accessToken);
      onSuccess(email);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'google_unknown_error');
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    onError,
    onGmailOAuthTokens,
    onGoogleAuthCode,
    onGoogleIdToken,
    onSuccess,
    promptAsync,
    redirectUri,
    request,
    variant,
  ]);

  const disabled = !request || busy;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.btn,
        {
          borderColor: theme.border,
          backgroundColor: theme.card,
          opacity: disabled ? 0.55 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <>
          <GoogleIcon size={20} />
          <Text style={[styles.label, { color: theme.foreground }]}>
            {label ??
              (variant === 'gmail' ? t('auth.oauth.googleMailbox') : t('auth.login.googleOAuth'))}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: { fontSize: fontSize.body, fontWeight: '600' },
});
