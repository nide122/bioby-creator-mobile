import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { HubScreen } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useAcceptTenantInviteByToken } from '@/src/hooks/use-account-settings';
import { alertAction } from '@/src/lib/app-dialog';
import { useSessionStore } from '@/src/stores/session-store';

function readTokenParam(raw: string | string[] | undefined): string | null {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]?.trim()) return raw[0].trim();
  return null;
}

export default function TeamAcceptInviteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => readTokenParam(params.token), [params.token]);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const acceptMutation = useAcceptTenantInviteByToken();

  useEffect(() => {
    if (!shouldUseBackendApi() || !isAuthenticated || !token || acceptMutation.isPending) return;
    if (acceptMutation.isSuccess || acceptMutation.isError) return;

    acceptMutation.mutate(token, {
      onSuccess: () => {
        void alertAction(
          t('teamAcceptScreen.successTitle'),
          t('teamAcceptScreen.successBody'),
        ).then(() => {
          router.replace('/settings/workspace' as Href);
        });
      },
      onError: (err) => {
        void alertAction(
          t('teamAcceptScreen.failedTitle'),
          err instanceof Error ? err.message : t('teamAcceptScreen.failedFallback'),
        );
      },
    });
  }, [acceptMutation, isAuthenticated, router, t, token]);

  if (!token) {
    return (
      <HubScreen title={t('teamAcceptScreen.title')} lead={t('teamAcceptScreen.invalidLink')}>
        <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('teamAcceptScreen.invalidLinkBody')}</Text>
      </HubScreen>
    );
  }

  if (!shouldUseBackendApi()) {
    return (
      <HubScreen title={t('teamAcceptScreen.title')} lead={t('teamAcceptScreen.apiRequired')}>
        <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('teamAcceptScreen.apiRequiredBody')}</Text>
      </HubScreen>
    );
  }

  if (!isAuthenticated) {
    const returnPath = `/team/accept?token=${encodeURIComponent(token)}`;
    return (
      <HubScreen title={t('teamAcceptScreen.title')} lead={t('teamAcceptScreen.signInLead')}>
        <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('teamAcceptScreen.signInBody')}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(auth)/login?redirect=${encodeURIComponent(returnPath)}` as Href)}
            style={[styles.primary, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>{t('teamAcceptScreen.signIn')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(auth)/register?redirect=${encodeURIComponent(returnPath)}` as Href)}
            style={[styles.secondary, { borderColor: theme.border }]}>
            <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>{t('teamAcceptScreen.register')}</Text>
          </Pressable>
        </View>
      </HubScreen>
    );
  }

  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator accessibilityLabel={t('teamAcceptScreen.acceptingA11y')} color={theme.primary} />
      <Text style={[styles.lead, { color: theme.mutedForeground, marginTop: spacing.md }]}>
        {t('teamAcceptScreen.accepting')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  primary: {
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryLabel: { fontSize: fontSize.body, fontWeight: '600' },
});
