import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LegalLanguageToggle } from '@/components/legal/LegalLanguageToggle';
import { fontSize, radii, spacing } from '@/constants/tokens';
import { clearDevSession } from '@/src/auth/clear-dev-session';
import { enterDemoWorkspace } from '@/src/auth/enter-demo-workspace';
import { DEFAULT_APP_HOME_ROUTE } from '@/src/auth/post-auth-navigation';

type Props = {
  /** After dev skip — defaults to Today. */
  onDevSkip?: () => void;
  /** Show EN / 中文 toggle (landing page pins this to the top-right). */
  showLanguageToggle?: boolean;
  /** Tighter layout for floating dev shortcuts on the landing page. */
  compact?: boolean;
};

/** Language toggle + dev shortcuts pinned to the bottom of auth / landing screens. */
export function AuthUtilityFooter({ onDevSkip, showLanguageToggle = true, compact = false }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleSkip = () => {
    if (onDevSkip) {
      onDevSkip();
      return;
    }
    void enterDemoWorkspace().then(() => {
      router.replace(DEFAULT_APP_HOME_ROUTE as Href);
    });
  };

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      {showLanguageToggle ? <LegalLanguageToggle compact tone="app" /> : null}
      {__DEV__ ? (
        <View style={styles.devRow}>
          <Pressable
            testID="welcome-clear-session"
            accessibilityRole="button"
            accessibilityLabel={t('welcome.clearSessionA11y')}
            hitSlop={12}
            onPress={() => {
              void clearDevSession();
            }}
            style={({ pressed }) => [styles.devClear, pressed && styles.devPressed]}>
            <Text style={styles.devClearLabel}>{t('welcome.clearSession')}</Text>
          </Pressable>
          <Pressable
            testID="welcome-dev-skip"
            accessibilityRole="button"
            accessibilityLabel={t('welcome.devSkipA11y')}
            hitSlop={12}
            onPress={handleSkip}
            style={({ pressed }) => [styles.devSkip, pressed && styles.devPressed]}>
            <Text style={styles.devSkipLabel}>{t('welcome.devSkip')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  rootCompact: {
    paddingTop: 0,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  devRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  devClear: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.45)',
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  devClearLabel: {
    color: '#FF8A8A',
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  devSkip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.45)',
    backgroundColor: 'rgba(255,179,71,0.08)',
  },
  devPressed: { opacity: 0.85 },
  devSkipLabel: {
    color: '#FFB347',
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
});
