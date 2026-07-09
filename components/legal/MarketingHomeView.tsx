import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthAppIcon } from '@/components/auth/AuthAppIcon';
import { LandingHeroBackground } from '@/components/landing/LandingHeroBackground';
import { LandingProductPreview } from '@/components/landing/LandingProductPreview';
import { LegalFooter } from '@/components/legal/LegalFooter';
import { LegalLanguageToggle } from '@/components/legal/LegalLanguageToggle';
import { GoogleIcon } from '@/components/oauth/GoogleIcon';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';
import { DEFAULT_APP_HOME_ROUTE } from '@/src/auth/post-auth-navigation';
import { clearDevSession } from '@/src/auth/clear-dev-session';
import { enterDemoWorkspace } from '@/src/auth/enter-demo-workspace';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import type { MarketingHomeContent } from '@/src/legal/types';
import { useSessionStore } from '@/src/stores/session-store';

type Props = {
  content: MarketingHomeContent;
};

function LandingInfoDetails({
  content,
  theme,
  onClose,
}: {
  content: MarketingHomeContent;
  theme: ThemePalette;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.sheetRoot}>
      <Pressable style={styles.sheetBackdrop} accessibilityRole="button" onPress={onClose} />
      <View
        style={[
          styles.sheetPanel,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}>
        <View style={[styles.sheetHandle, { backgroundColor: theme.muted }]} />
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionEyebrow, { color: theme.foreground }]}>{content.aboutTitle}</Text>
          <View
            className={webClassName(corporateCleanClass.card)}
            style={[styles.glassCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            {content.aboutParagraphs.map((p, index) => (
              <Text key={`about-${index}`} style={[styles.body, { color: theme.mutedForeground }]}>
                {p}
              </Text>
            ))}
          </View>

          <Text style={[styles.sectionEyebrow, { color: theme.foreground }]}>{content.featuresTitle}</Text>
          <View style={styles.featureGrid}>
            {content.features.map((feature) => (
              <View
                key={feature.title}
                className={webClassName(corporateCleanClass.card)}
                style={[styles.featureCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                <Text style={[styles.featureTitle, { color: theme.foreground }]}>{feature.title}</Text>
                <Text style={[styles.body, { color: theme.mutedForeground }]}>{feature.body}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionEyebrow, { color: theme.foreground }]}>{content.trustTitle}</Text>
          <View
            className={webClassName(corporateCleanClass.card)}
            style={[styles.glassCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            {content.trustBullets.map((bullet, index) => (
              <View key={`trust-${index}`} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: theme.primary }]}>•</Text>
                <Text style={[styles.body, styles.bulletText, { color: theme.mutedForeground }]}>{bullet}</Text>
              </View>
            ))}
          </View>

          <LegalFooter metaOnly />
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('welcome.landingInfoCloseA11y')}
          onPress={onClose}
          hitSlop={12}
          style={[styles.sheetClose, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
          <Ionicons name="close" size={18} color={theme.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

function LandingDevMenu({
  theme,
  open,
  onClose,
  bottomOffset,
}: {
  theme: ThemePalette;
  open: boolean;
  onClose: () => void;
  bottomOffset: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();

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

const BOTTOM_SLOT_WIDTH = 44;
const BOTTOM_CTA_GAP = spacing.md;

export function MarketingHomeView({ content }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { signOut } = useAuthActions();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const accountEmail = useSessionStore((s) => s.accountEmail);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const [infoOpen, setInfoOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const devMenuBottom = 40 + Math.max(insets.bottom, spacing.xs) + spacing.xs;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      className={webClassName(corporateCleanClass.landingScreen, corporateCleanClass.landingHeroGradient)}
      edges={['top', 'left', 'right']}>
      <LandingHeroBackground />

      <View
        pointerEvents="box-none"
        style={[styles.topChrome, { top: spacing.xs, right: spacing.xxl }]}>
        <LegalLanguageToggle compact tone="app" />
      </View>

      <View
        className={webClassName(corporateCleanClass.landingHeroViewport)}
        style={styles.heroViewport}>
        <View style={styles.heroTopBlock}>
          <AuthAppIcon size={64} />
          <View style={styles.heroHeadline} className={webClassName(corporateCleanClass.landingHeroHeadline)}>
            <Text
              className={webClassName(corporateCleanClass.landingHeroTitle)}
              style={[styles.campaignTitle, { color: theme.foreground }]}>
              {t('welcome.titleLine1')}
              {'\n'}
              {t('welcome.titleLine2')}
            </Text>
            {!isAuthenticated ? (
              <Text
                className={webClassName(corporateCleanClass.landingHeroSubtitle)}
                style={[styles.heroSubtitle, { color: theme.mutedForeground }]}>
                {content.heroSubtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.heroCardsWrap} className={webClassName(corporateCleanClass.landingPreviewWrap)}>
          <LandingProductPreview />
        </View>
      </View>

      <View
        className={webClassName(corporateCleanClass.landingBottomDock)}
        style={[
          styles.bottomDock,
          {
            gap: BOTTOM_CTA_GAP,
            paddingBottom: Math.max(insets.bottom, spacing.xs),
          },
        ]}>
        <View style={[styles.heroActions, { gap: BOTTOM_CTA_GAP }]}>
          {isAuthenticated ? (
            <>
              <View
                style={styles.accountBar}
                accessibilityRole="text"
                accessibilityLabel={`${t('welcome.signedInAs')} ${accountEmail ?? t('auth.creatorFallback')}`}>
                <Text style={[styles.accountBarLabel, { color: theme.mutedForeground }]}>
                  {t('welcome.signedInAs')}
                </Text>
                <Text
                  style={[styles.accountBarEmail, { color: theme.foreground }]}
                  numberOfLines={1}
                  ellipsizeMode="middle">
                  {accountEmail ?? t('auth.creatorFallback')}
                </Text>
              </View>
              <Pressable
                testID="welcome-enter-workspace"
                accessibilityRole="button"
                onPress={() => router.replace(DEFAULT_APP_HOME_ROUTE as Href)}
                className={webClassName(corporateCleanClass.btnPrimary, corporateCleanClass.gradient)}
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                  {t('welcome.enterWorkspace')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void signOut();
                }}
                style={styles.signInLink}>
                <Text style={[styles.signInLinkLabel, { color: theme.mutedForeground }]}>
                  {t('welcome.signOutAndSwitch')}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/register' as Href)}
                className={webClassName(
                  corporateCleanClass.btnPrimary,
                  corporateCleanClass.gradient,
                  'landing-connect-gmail',
                )}
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                <GoogleIcon size={20} />
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>{content.ctaPrimary}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/login' as Href)}
                style={styles.signInLink}>
                <Text style={[styles.signInLinkLabel, { color: theme.mutedForeground }]}>{content.ctaSecondary}</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.bottomChrome}>
          <View style={styles.bottomLeft}>
          <Pressable
            testID="welcome-landing-info"
            accessibilityRole="button"
            accessibilityLabel={t('welcome.landingInfoA11y')}
            onPress={() => setInfoOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.chromeIconButton,
              { borderColor: theme.border, backgroundColor: theme.card },
              pressed && { opacity: 0.82 },
            ]}>
            <Ionicons name="information-circle-outline" size={22} color={theme.mutedForeground} />
          </Pressable>
        </View>

        <View
          className={webClassName(corporateCleanClass.landingBottomLegalRow)}
          style={styles.bottomLegal}>
          <LegalFooter linksOnly />
        </View>

        {__DEV__ ? (
          <View style={styles.bottomRight}>
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
        ) : (
          <View style={styles.bottomSpacer} />
        )}
        </View>
      </View>

      {__DEV__ ? (
        <LandingDevMenu theme={theme} open={devOpen} onClose={() => setDevOpen(false)} bottomOffset={devMenuBottom} />
      ) : null}

      <Modal visible={infoOpen} transparent animationType="slide" onRequestClose={() => setInfoOpen(false)}>
        <LandingInfoDetails content={content} theme={theme} onClose={() => setInfoOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    overflow: 'hidden',
  },
  topChrome: {
    position: 'absolute',
    zIndex: 20,
  },
  heroViewport: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xs,
    paddingBottom: 0,
  },
  heroTopBlock: {
    flexShrink: 0,
    gap: spacing.xs,
    paddingBottom: 0,
  },
  heroCardsWrap: {
    flexGrow: 1,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: 280,
  },
  heroHeadline: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  campaignTitle: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 46,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
    textAlign: 'center',
    maxWidth: 320,
  },
  heroActions: {
    flexShrink: 0,
    paddingHorizontal: spacing.xxl,
  },
  accountBar: {
    minHeight: 36,
    maxHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    alignSelf: 'stretch',
  },
  accountBarLabel: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    flexShrink: 0,
  },
  accountBarEmail: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '72%',
  },
  primaryBtn: {
    borderRadius: radii.lg,
    minHeight: layout.touchMin + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryLabel: {
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  signInLink: {
    minHeight: 28,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLinkLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    lineHeight: 18,
  },
  bottomDock: {
    flexShrink: 0,
  },
  bottomChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    minHeight: 40,
    gap: spacing.sm,
  },
  bottomLeft: {
    width: BOTTOM_SLOT_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  bottomRight: {
    width: BOTTOM_SLOT_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chromeIconButton: {
    width: BOTTOM_SLOT_WIDTH,
    height: BOTTOM_SLOT_WIDTH,
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
  bottomLegal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    width: BOTTOM_SLOT_WIDTH,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheetPanel: {
    maxHeight: '82%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  sheetScroll: {
    maxHeight: Platform.OS === 'web' ? '72vh' : undefined,
  },
  sheetScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEyebrow: {
    fontSize: fontSize.sectionTitle,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  glassCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  featureGrid: { gap: spacing.sm },
  featureCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  featureTitle: { fontSize: fontSize.body, fontWeight: '800' },
  body: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: { fontSize: fontSize.body, lineHeight: lineHeight.body },
  bulletText: { flex: 1 },
});
