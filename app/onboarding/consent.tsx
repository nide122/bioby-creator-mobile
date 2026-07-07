import { type Href, Link, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { AgentSendModePicker } from '@/components/product/AgentSendModePicker';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import { updateTenantSettings } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { syncAgentSendModeToBackend } from '@/src/auth/sync-onboarding';
import { useOnboardingRouteGuard } from '@/src/hooks/use-onboarding-route-guard';
import { alertAction } from '@/src/lib/app-dialog';
import { type AgentSendMode, useSessionStore } from '@/src/stores/session-store';

export default function OnboardingConsentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const authReady = useOnboardingRouteGuard('consent');
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const acceptCompliance = useSessionStore((s) => s.acceptCompliance);
  const completeInboxFilterStep = useSessionStore((s) => s.completeInboxFilterStep);
  const profileBasics = useSessionStore((s) => s.profileBasics);
  const complianceAcceptedAt = useSessionStore((s) => s.complianceAcceptedAt);
  const agentSendMode = useSessionStore((s) => s.agentSendMode);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const [privacy, setPrivacy] = useState(() => Boolean(complianceAcceptedAt));
  const [sendMode, setSendMode] = useState<AgentSendMode>(() => agentSendMode ?? 'agent_assist');

  const canContinue = privacy;

  useEffect(() => {
    if (complianceAcceptedAt) setPrivacy(true);
    if (agentSendMode) setSendMode(agentSendMode);
  }, [complianceAcceptedAt, agentSendMode]);

  const onContinue = () => {
    if (!isAuthenticated) {
      router.replace('/home' as Href);
      return;
    }
    if (!canContinue) return;
    if (!profileBasics) {
      router.replace('/onboarding/profile' as Href);
      return;
    }
    acceptCompliance(sendMode);
    completeInboxFilterStep('standard');
    void (async () => {
      const result = await syncAgentSendModeToBackend(sendMode);
      if (!result.ok) {
        void alertAction(t('onboardingSync.consentTitle'), result.error);
      }
    })();
    if (shouldUseBackendApi()) {
      void updateTenantSettings({ classificationStrictness: 'standard' }).catch(() => {});
    }
    router.push('/onboarding/email' as Href);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      {!authReady ? (
        <ActivityIndicator color={theme.primary} accessibilityLabel="Loading setup step" />
      ) : (
        <>
      <Text style={[styles.kicker, { color: theme.foregroundEyebrow }]}>{t('onboardingConsentScreen.stepLabel')}</Text>
      <Text style={[styles.title, { color: theme.foreground }]}>{t('onboardingConsentScreen.title')}</Text>

      <OnboardingProgress current="consent" />

      <ConsentRow
        testID="onboarding-consent-privacy"
        theme={theme}
        checked={privacy}
        onToggle={() => setPrivacy((v) => !v)}
        title={t('onboardingConsentScreen.privacyTitle')}
        subtitle={t('onboardingConsentScreen.privacySubtitle')}
      />

      <View style={styles.legalLinks}>
        <Text style={[styles.legalLead, { color: theme.mutedForeground }]}>
          {t('onboardingConsentScreen.legalLead')}{' '}
          <Link href={'/privacy' as Href} style={{ color: theme.primary, fontWeight: '700' }}>
            {t('legal.footerPrivacy')}
          </Link>
          {' · '}
          <Link href={'/terms' as Href} style={{ color: theme.primary, fontWeight: '700' }}>
            {t('legal.footerTerms')}
          </Link>
        </Text>
      </View>

      <View style={styles.modeStack}>
        <Text style={[styles.sectionLabel, { color: theme.foregroundEyebrow }]}>
          {t('onboardingConsentScreen.sendModeSectionLabel')}
        </Text>
        <AgentSendModePicker
          value={sendMode}
          onChange={setSendMode}
          copy={{
            assistTitle: t('onboardingConsentScreen.modeAssistTitle'),
            assistSubtitle: t('onboardingConsentScreen.modeAssistSubtitle'),
            reviewTitle: t('onboardingConsentScreen.modeReviewTitle'),
            reviewSubtitle: t('onboardingConsentScreen.modeReviewSubtitle'),
          }}
          boundaryTitle={t('onboardingConsentScreen.boundaryTitle')}
          boundaryBody={t('onboardingConsentScreen.boundaryBody')}
        />
      </View>

      <Pressable
        testID="onboarding-consent-continue"
        accessibilityRole="button"
        disabled={!canContinue}
        onPress={onContinue}
        style={[
          styles.primary,
          { backgroundColor: canContinue ? theme.primary : theme.secondary },
        ]}>
        <Text
          style={[
            styles.primaryLabel,
            { color: canContinue ? theme.primaryForeground : theme.foregroundEyebrow },
          ]}>
          {t('onboardingConsentScreen.continueEmail')}
        </Text>
      </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function ConsentRow({
  testID,
  theme,
  checked,
  onToggle,
  title,
  subtitle,
}: {
  testID?: string;
  theme: ThemePalette;
  checked: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={[
        styles.row,
        {
          borderColor: checked ? theme.primary : theme.border,
          backgroundColor: checked ? theme.accentMintSoft : theme.card,
        },
      ]}>
      <View style={[styles.checkbox, { borderColor: theme.primary }]}>
        {checked ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={[styles.rowTitle, { color: theme.foreground }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
      </View>
    </Pressable>
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
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1.2, lineHeight: 40 },
  modeStack: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: { width: 12, height: 12, borderRadius: radii.sm },
  rowTitle: { fontSize: fontSize.body, fontWeight: '800' },
  rowSubtitle: { fontSize: fontSize.bodySmall, lineHeight: 20 },
  legalLinks: { marginTop: -spacing.sm },
  legalLead: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
});
