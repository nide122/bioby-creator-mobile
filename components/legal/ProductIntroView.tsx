import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthAppIcon } from '@/components/auth/AuthAppIcon';
import { ProductIntroSections } from '@/components/legal/ProductIntroSections';
import { LegalLanguageToggle } from '@/components/legal/LegalLanguageToggle';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';
import { DEFAULT_APP_HOME_ROUTE } from '@/src/auth/post-auth-navigation';
import { clearDevSession } from '@/src/auth/clear-dev-session';
import { enterDemoWorkspace } from '@/src/auth/enter-demo-workspace';
import type { MarketingHomeContent } from '@/src/legal/types';

type Props = {
  content: MarketingHomeContent;
};

function IntroDevMenu({
  open,
  onClose,
  bottomOffset,
}: {
  open: boolean;
  onClose: () => void;
  bottomOffset: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (!open) return null;

  const handleSkip = () => {
    onClose();
    void enterDemoWorkspace().then(() => {
      router.replace(DEFAULT_APP_HOME_ROUTE as Href);
    });
  };

  return (
    <>
      <Pressable
        style={styles.devMenuBackdrop}
        accessibilityRole="button"
        accessibilityLabel={t('welcome.devMenuCloseA11y')}
        onPress={onClose}
      />
      <View
        style={[
          styles.devMenuPanel,
          {
            borderColor: theme.border,
            backgroundColor: theme.card,
            bottom: bottomOffset,
            right: spacing.xxl,
          },
        ]}>
        <Pressable
          testID="welcome-clear-session"
          accessibilityRole="button"
          accessibilityLabel={t('welcome.clearSessionA11y')}
          onPress={() => {
            onClose();
            void clearDevSession();
          }}
          style={({ pressed }) => [styles.devMenuItem, styles.devMenuClear, pressed && styles.devMenuPressed]}>
          <Text style={styles.devMenuClearLabel}>{t('welcome.clearSession')}</Text>
        </Pressable>
        <Pressable
          testID="welcome-dev-skip"
          accessibilityRole="button"
          accessibilityLabel={t('welcome.devSkipA11y')}
          onPress={handleSkip}
          style={({ pressed }) => [styles.devMenuItem, styles.devMenuSkip, pressed && styles.devMenuPressed]}>
          <Text style={styles.devMenuSkipLabel}>{t('welcome.devSkip')}</Text>
        </Pressable>
      </View>
    </>
  );
}

export function ProductIntroView({ content }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const [devOpen, setDevOpen] = useState(false);

  const devMenuBottom = Math.max(insets.bottom, spacing.md) + spacing.md;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View pointerEvents="box-none" style={[styles.topChrome, { top: spacing.xs, right: spacing.xxl }]}>
        <LegalLanguageToggle compact tone="app" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          <AuthAppIcon size={64} />
          <Text style={[styles.campaignTitle, { color: theme.foreground }]}>
            {t('welcome.titleLine1')}
            {'\n'}
            {t('welcome.titleLine2')}
          </Text>
        </View>

        <ProductIntroSections content={content} theme={theme} footerVariant="full" />

        <Pressable
          testID="welcome-intro-continue"
          accessibilityRole="button"
          accessibilityLabel={t('welcome.introContinueA11y')}
          onPress={() => router.push('/home' as Href)}
          className={webClassName(corporateCleanClass.btnPrimary, corporateCleanClass.gradient)}
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
          <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
            {t('welcome.introContinue')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={theme.primaryForeground} />
        </Pressable>
      </ScrollView>

      {__DEV__ ? (
        <View style={[styles.devChrome, { bottom: Math.max(insets.bottom, spacing.xs) }]}>
          <Pressable
            testID="welcome-dev-menu"
            accessibilityRole="button"
            accessibilityLabel={t('welcome.devMenuA11y')}
            onPress={() => setDevOpen((open) => !open)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.chromeIconButton,
              { borderColor: theme.border, backgroundColor: theme.card },
              pressed && { opacity: 0.82 },
            ]}>
            <Ionicons name="construct-outline" size={22} color={theme.mutedForeground} />
          </Pressable>
        </View>
      ) : null}

      {__DEV__ ? (
        <IntroDevMenu open={devOpen} onClose={() => setDevOpen(false)} bottomOffset={devMenuBottom} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topChrome: {
    position: 'absolute',
    zIndex: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  heroBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  campaignTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
    lineHeight: 42,
    textAlign: 'center',
  },
  primaryBtn: {
    borderRadius: radii.lg,
    minHeight: layout.touchMin + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryLabel: {
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  devChrome: {
    position: 'absolute',
    right: spacing.xxl,
    zIndex: 18,
  },
  chromeIconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 28,
  },
  devMenuPanel: {
    position: 'absolute',
    zIndex: 30,
    minWidth: 168,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xs,
    gap: spacing.xs,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  devMenuItem: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  devMenuPressed: { opacity: 0.86 },
  devMenuClear: {
    borderColor: 'rgba(255,107,107,0.45)',
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  devMenuSkip: {
    borderColor: 'rgba(255,179,71,0.45)',
    backgroundColor: 'rgba(255,179,71,0.08)',
  },
  devMenuClearLabel: {
    color: '#FF8A8A',
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  devMenuSkipLabel: {
    color: '#FFB347',
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
});
