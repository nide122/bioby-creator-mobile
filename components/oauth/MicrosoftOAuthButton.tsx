import * as AuthSession from 'expo-auth-session';
import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { MicrosoftIcon } from '@/components/oauth/MicrosoftIcon';
import { fontSize, layout, palette, radii } from '@/constants/tokens';
import { OAuthUnconfiguredButton } from '@/components/oauth/OAuthUnconfiguredButton';
import { getMicrosoftOAuthRedirectUri } from '@/src/auth/oauth-redirect';
import { microsoftClientId, microsoftTenant, isMicrosoftOAuthConfigured } from '@/src/auth/oauth-env';
import { fetchMicrosoftPrimaryEmail } from '@/src/auth/oauth-user-profile';
import { saveMicrosoftWebState } from '@/src/auth/microsoft-oauth-web';

type Props = {
  label?: string;
  variant: 'login' | 'mailbox';
  onSuccess: (email: string) => void;
  onError: (message: string) => void;
  /** API 模式下将 access_token 提交后端（variant=login 登录 / variant=mailbox 绑定邮箱） */
  onMicrosoftAccessToken?: (accessToken: string, refreshToken?: string | null) => Promise<void>;
};

// `User.Read` makes the issued access token valid for Microsoft Graph `/me` (used for email + backend verify).
const LOGIN_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.Read'];
const MAILBOX_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.Send',
];

export function MicrosoftOAuthButton(props: Props) {
  const { t } = useTranslation();
  if (!isMicrosoftOAuthConfigured()) {
    return (
      <OAuthUnconfiguredButton
        provider="microsoft"
        label={
          props.label ??
          (props.variant === 'mailbox' ? t('auth.oauth.microsoftMailbox') : t('auth.login.microsoftOAuth'))
        }
      />
    );
  }
  return <MicrosoftOAuthButtonImpl {...props} />;
}

function MicrosoftOAuthButtonImpl({ label, variant, onSuccess, onError, onMicrosoftAccessToken }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const discoveryUrl = useMemo(
    () => `https://login.microsoftonline.com/${microsoftTenant}/v2.0`,
    [microsoftTenant],
  );

  const discovery = AuthSession.useAutoDiscovery(discoveryUrl);

  const redirectUri = useMemo(() => getMicrosoftOAuthRedirectUri(variant), [variant]);

  const scopes = useMemo(
    () => (variant === 'mailbox' ? MAILBOX_SCOPES : LOGIN_SCOPES),
    [variant],
  );

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: microsoftClientId as string,
      redirectUri,
      scopes,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { prompt: 'select_account' },
    },
    discovery,
  );

  const [busy, setBusy] = useState(false);

  /** Native: use expo-auth-session popup flow. */
  const nativeFlow = useCallback(async () => {
    const result = await promptAsync();
    if (result.type !== 'success') {
      onError(result.type === 'error' ? result.error?.message ?? 'microsoft_auth_error' : `microsoft_${result.type}`);
      return;
    }

    const code = result.params?.code;
    if (!code) {
      onError('microsoft_missing_auth_code');
      return;
    }
    if (!request?.codeVerifier) {
      onError('microsoft_missing_code_verifier');
      return;
    }
    if (!discovery) {
      onError('microsoft_missing_discovery');
      return;
    }

    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: microsoftClientId as string,
        code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      discovery,
    );

    const accessToken = tokenResponse.accessToken;
    if (!accessToken) {
      onError('microsoft_missing_access_token');
      return;
    }
    const refreshToken = tokenResponse.refreshToken ?? null;

    if (onMicrosoftAccessToken) {
      await onMicrosoftAccessToken(accessToken, refreshToken);
      if (variant === 'login') return;
    }

    const email = await fetchMicrosoftPrimaryEmail(accessToken);
    onSuccess(email);
  }, [discovery, onError, onMicrosoftAccessToken, onSuccess, promptAsync, redirectUri, request, variant]);

  /** Web: redirect the main window to Microsoft login; callback page handles the return. */
  const webFlow = useCallback(async () => {
    // Ensure the request has been prepared (URL, PKCE params).
    const authUrl = request?.url;
    if (!authUrl || !request?.codeVerifier) {
      onError('microsoft_request_not_ready');
      return;
    }

    // Save session so the callback page can pick it up.
    saveMicrosoftWebState({
      clientId: microsoftClientId as string,
      redirectUri,
      codeVerifier: request.codeVerifier,
      scopes,
      variant,
      discoveryUrl,
    });

    // Redirect the main window to Microsoft's authorize endpoint.
    window.location.href = authUrl;
  }, [discoveryUrl, onError, redirectUri, request, scopes, variant]);

  const handlePress = useCallback(async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        await webFlow();
        // webFlow does a full-page redirect, so we won't reach setBusy(false) on success.
      } else {
        await nativeFlow();
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'microsoft_unknown_error');
    } finally {
      if (Platform.OS !== 'web') {
        // On web, redirect happened — state cleanup is handled in the callback page.
        setBusy(false);
      }
    }
  }, [busy, nativeFlow, onError, request, webFlow]);

  const disabled = !request || !discovery || busy;

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
          <MicrosoftIcon size={20} />
          <Text style={[styles.label, { color: theme.foreground }]}>
            {label ??
              (variant === 'mailbox' ? t('auth.oauth.microsoftMailbox') : t('auth.login.microsoftOAuth'))}
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
