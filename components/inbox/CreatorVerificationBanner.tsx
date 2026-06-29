import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { forceVerifyCreatorEmailDev, verifyCreatorEmail } from '@/src/api/account-api';
import type { CreatorVerificationResponse } from '@/src/api/account-api';
import { ApiError } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { alertAction } from '@/src/lib/app-dialog';
import { refreshAfterCreatorVerification } from '@/src/lib/creator-verification-refresh';
import {
  isCreatorVerificationDevToolsEnabled,
  type CreatorVerificationStatus,
} from '@/src/lib/creator-verification';
import { useSessionStore } from '@/src/stores/session-store';

function resolveVerifyErrorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'EMAIL_MISMATCH':
        return t('creatorVerification.errorMismatch');
      case 'HOMEPAGE_EMAIL_MISSING':
        return t('creatorVerification.errorHomepageMissing');
      case 'MAILBOX_REQUIRED':
        return t('creatorVerification.errorMailboxRequired');
      case 'PROFILE_INCOMPLETE':
      case 'PROFILE_REQUIRED':
        return t('creatorVerification.errorProfileIncomplete');
      default:
        return error.message || t('creatorVerification.verifyErrorBody');
    }
  }
  return error instanceof Error ? error.message : t('creatorVerification.verifyErrorBody');
}

async function applyVerificationResult(
  result: CreatorVerificationResponse,
  queryClient: ReturnType<typeof useQueryClient>,
  setCreatorVerificationStatus: (status: CreatorVerificationStatus) => void,
  t: ReturnType<typeof useTranslation>['t'],
) {
  setCreatorVerificationStatus(result.creatorVerified ? 'verified' : 'unverified');
  await refreshAfterCreatorVerification(queryClient);
  if (result.creatorVerified) {
    const backfillCount = result.inboxBackfillEnqueued ?? 0;
    const body =
      backfillCount > 0
        ? t('creatorVerification.verifySuccessBodyWithBackfill', { count: backfillCount })
        : t('creatorVerification.verifySuccessBody');
    await alertAction(t('creatorVerification.verifySuccessTitle'), body);
  }
}

export function CreatorVerificationBanner({
  status,
}: {
  status: CreatorVerificationStatus;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const setCreatorVerificationStatus = useSessionStore((s) => s.setCreatorVerificationStatus);
  const [submitting, setSubmitting] = useState(false);
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const showDevTools = isCreatorVerificationDevToolsEnabled() && shouldUseBackendApi();

  if (status === 'verified') return null;

  const onVerify = async () => {
    if (submitting || devSubmitting) return;
    setSubmitting(true);
    setLastError(null);
    try {
      const result = await verifyCreatorEmail();
      await applyVerificationResult(result, queryClient, setCreatorVerificationStatus, t);
    } catch (error) {
      const message = resolveVerifyErrorMessage(error, t);
      setLastError(message);
      void alertAction(t('creatorVerification.verifyErrorTitle'), message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDevForceVerify = async () => {
    if (submitting || devSubmitting) return;
    setDevSubmitting(true);
    setLastError(null);
    try {
      const result = await forceVerifyCreatorEmailDev();
      await applyVerificationResult(result, queryClient, setCreatorVerificationStatus, t);
    } catch (error) {
      const message = resolveVerifyErrorMessage(error, t);
      setLastError(message);
      void alertAction(t('creatorVerification.devForceVerifyErrorTitle'), message);
    } finally {
      setDevSubmitting(false);
    }
  };

  const accent = '#F59E0B';

  return (
    <View style={styles.stack}>
      <View
        testID="creator-verification-banner"
        style={[styles.banner, { borderColor: accent + '55', backgroundColor: '#F59E0B12' }]}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('creatorVerification.bannerTitle')}</Text>
          <Text style={[styles.body, { color: theme.mutedForeground }]}>{t('creatorVerification.bannerBody')}</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            testID="creator-verification-verify"
            accessibilityRole="button"
            disabled={submitting || devSubmitting}
            onPress={() => void onVerify()}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: submitting || devSubmitting ? 0.6 : pressed ? 0.9 : 1 },
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {submitting ? t('creatorVerification.verifying') : t('creatorVerification.verifyCta')}
            </Text>
          </Pressable>
          {showDevTools ? (
            <Pressable
              testID="creator-verification-dev-force"
              accessibilityRole="button"
              disabled={submitting || devSubmitting}
              onPress={() => void onDevForceVerify()}
              style={({ pressed }) => [
                styles.devBtn,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && !submitting && !devSubmitting && { opacity: 0.88 },
                (submitting || devSubmitting) && { opacity: 0.6 },
              ]}>
              <Text style={[styles.devLabel, { color: theme.foreground }]}>
                {devSubmitting ? t('creatorVerification.devForceVerifying') : t('creatorVerification.devForceVerifyCta')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {lastError ? (
        <Text style={[styles.errorText, { color: theme.foregroundSubtitle }]}>{lastError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xs },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  copy: { gap: spacing.xs },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  body: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryBtn: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
  devBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  devLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
  errorText: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.bodyRelaxed,
    paddingHorizontal: spacing.xs,
  },
});
