import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, spacing } from '@/constants/tokens';
import { handleMicrosoftWebCallback, loadMicrosoftWebState, clearMicrosoftWebState } from '@/src/auth/microsoft-oauth-web';
import { useSessionStore } from '@/src/stores/session-store';
import { getPostAuthRoute } from '@/src/auth/post-auth-navigation';

/** Minimal landing route for OAuth popups on web (see complete-oauth-session.ts). */
export default function OAuthCallbackScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    // For popup-based flows (Google, native Microsoft).
    WebBrowser.maybeCompleteAuthSession();

    // For web redirect-based Microsoft OAuth flow.
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      clearMicrosoftWebState();
      router.replace('/login');
      return;
    }

    if (!code) {
      // No auth code — regular page load or popup callback; nothing to do.
      return;
    }

    // Check if this is a Microsoft OAuth callback.
    const savedState = loadMicrosoftWebState();
    if (!savedState) {
      // Code without saved state — probably Google or another provider's callback.
      return;
    }

    (async () => {
      try {
        const result = await handleMicrosoftWebCallback(code);
        if (!result.ok) {
          clearMicrosoftWebState();
          router.replace('/login');
          return;
        }

        // For demo / mailbox mode, sign in locally.
        if (result.email) {
          useSessionStore.getState().signInDemo(result.email);
        }

        clearMicrosoftWebState();
        router.replace(getPostAuthRoute() as any);
      } catch {
        clearMicrosoftWebState();
        router.replace('/login');
      }
    })();
  }, [router]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} />
      <Text style={[styles.text, { color: theme.mutedForeground }]}>Signing in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  text: { fontSize: fontSize.body },
});
