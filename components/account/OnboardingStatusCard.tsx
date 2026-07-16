import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { SettingsGroup } from '@/components/product';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  ONBOARDING_DASHBOARD_STEP_ORDER,
  onboardingDashboardRouteForStep,
  type OnboardingDashboardStatus,
  type OnboardingDashboardStepKey,
} from '@/src/lib/onboarding-status';
import { runOnboardingVerificationPress } from '@/src/lib/onboarding-verification-press';
import { useSessionStore } from '@/src/stores/session-store';

type Props = {
  status: OnboardingDashboardStatus;
};

export function OnboardingStatusCard({ status }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const profile = useSessionStore((s) => s.profileBasics);
  const mailboxConnection = useSessionStore((s) => s.mailboxConnection);
  const creatorVerificationStatus = useSessionStore((s) => s.creatorVerificationStatus);

  const onStepPress = (key: OnboardingDashboardStepKey) => {
    if (key === 'verification') {
      void runOnboardingVerificationPress(router, t, {
        profile,
        mailboxConnected: Boolean(mailboxConnection),
        creatorVerificationStatus,
        mailboxEmail: mailboxConnection?.email,
      });
      return;
    }
    router.push(onboardingDashboardRouteForStep(key) as Href);
  };

  if (status.allComplete) {
    return null;
  }

  const completedCount = status.steps.filter((step) => step.completed).length;
  const totalCount = status.steps.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const stepByKey = new Map(status.steps.map((step) => [step.key, step]));

  return (
    <SettingsGroup title={t('account.onboardingDashboard.title')}>
      <View style={styles.headerBlock}>
        <Text style={[styles.summary, { color: theme.mutedForeground }]}>
          {t('account.onboardingDashboard.summary', { completed: completedCount, total: totalCount })}
        </Text>
        <View style={[styles.track, { backgroundColor: theme.secondary }]}>
          <View
            style={[styles.fill, { backgroundColor: theme.primary, width: `${progressPercent}%` }]}
          />
        </View>
      </View>
      {ONBOARDING_DASHBOARD_STEP_ORDER.map((key, index) => {
        const step = stepByKey.get(key);
        if (!step) return null;
        const label = t(`account.onboardingDashboard.steps.${key}.title`);
        const detail = step.completed
          ? t('account.onboardingDashboard.completed')
          : t(`account.onboardingDashboard.steps.${key}.action`);
        const iconName = step.completed ? 'checkmark-circle' : 'ellipse-outline';
        const iconColor = step.completed ? theme.primary : theme.mutedForeground;

        const row = (
          <View style={styles.row}>
            <Ionicons name={iconName} size={20} color={iconColor} />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: theme.foreground }]}>{label}</Text>
              <Text
                style={[
                  styles.rowDetail,
                  { color: step.completed ? theme.mutedForeground : theme.primary },
                ]}>
                {detail}
              </Text>
            </View>
            {!step.completed ? (
              <Ionicons name="chevron-forward" size={18} color={theme.foregroundEyebrow} />
            ) : null}
          </View>
        );

        if (step.completed) {
          return (
            <View key={key} testID={`onboarding-step-${key}-done`}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
              {row}
            </View>
          );
        }

        return (
          <Pressable
            key={key}
            testID={`onboarding-step-${key}-pending`}
            accessibilityRole="button"
            onPress={() => onStepPress(key)}
            android_ripple={{ color: `${theme.primary}18`, borderless: false }}
            style={({ pressed }) => [pressed && styles.rowPressed]}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
            {row}
          </Pressable>
        );
      })}
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  summary: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  track: {
    height: 4,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 20 + spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: layout.touchMin,
    paddingVertical: spacing.sm,
  },
  rowPressed: { opacity: 0.72 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: fontSize.body, fontWeight: '600', lineHeight: lineHeight.body },
  rowDetail: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
