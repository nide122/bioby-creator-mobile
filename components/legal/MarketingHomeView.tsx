import { type Href, Link, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegalFooter } from '@/components/legal/LegalFooter';
import { LegalLanguageToggle } from '@/components/legal/LegalLanguageToggle';
import {
  LANDING_BG,
  LANDING_BORDER,
  LANDING_CARD,
  LANDING_MUTED,
  LandingBackgroundAura,
  LandingBrandMark,
  LandingMineMap,
} from '@/components/landing/WelcomeBrandVisuals';
import { fontSize, layout, lineHeight, radii, spacing } from '@/constants/tokens';
import { clearDevSession } from '@/src/auth/clear-dev-session';
import { enterDemoWorkspace } from '@/src/auth/enter-demo-workspace';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import type { MarketingHomeContent } from '@/src/legal/types';
import { useSessionStore } from '@/src/stores/session-store';

const SUB = '#A3AAB5';

type Props = {
  content: MarketingHomeContent;
};

export function MarketingHomeView({ content }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { signOut } = useAuthActions();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const accountEmail = useSessionStore((s) => s.accountEmail);

  return (
    <SafeAreaView style={styles.safe}>
      <LandingBackgroundAura />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <View style={styles.navLeft}>
            <View style={styles.brandLockup}>
              <LandingBrandMark />
              <Text style={styles.wordmark}>BIOBY</Text>
            </View>
            <LegalLanguageToggle compact tone="landing" />
          </View>
          {__DEV__ ? (
            <View style={styles.devActions}>
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
                onPress={() => {
                  void enterDemoWorkspace().then(() => {
                    router.replace('/inbox' as Href);
                  });
                }}
                style={({ pressed }) => [styles.devSkip, pressed && styles.devPressed]}>
                <Text style={styles.devSkipLabel}>{t('welcome.devSkip')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.hero}>
          <Text style={styles.localizedTagline}>{content.heroTitle}</Text>
          <Text style={styles.campaignTitle}>
            {t('welcome.titleLine1')}
            {'\n'}
            {t('welcome.titleLine2')}
          </Text>
          <Text style={styles.heroSubtitle}>{content.heroSubtitle}</Text>
          <View style={styles.keywordRow}>
            <Text style={[styles.keyword, { color: '#5FD9FF' }]}>{t('welcome.keywordRate')}</Text>
            <Text style={styles.keywordDivider}>/</Text>
            <Text style={[styles.keyword, { color: '#F086FF' }]}>{t('welcome.keywordRights')}</Text>
            <Text style={styles.keywordDivider}>/</Text>
            <Text style={[styles.keyword, { color: '#A7F3D0' }]}>{t('welcome.keywordPayout')}</Text>
          </View>
          <LandingMineMap
            rateLabel={t('welcome.mineRateLabel')}
            rateValue={t('welcome.mineRateValue')}
            rightsLabel={t('welcome.mineRightsLabel')}
            rightsValue={t('welcome.mineRightsValue')}
            payoutLabel={t('welcome.minePayoutLabel')}
            payoutValue={t('welcome.minePayoutValue')}
          />
          <Text style={styles.heroNote}>
            {content.heroNote}
            <Link href={'/privacy' as Href} style={styles.privacyLink}>
              {t('legal.footerPrivacy')}
            </Link>
            {content.heroNoteAfterLink ?? null}
          </Text>
        </View>

        <View style={styles.actions}>
          {isAuthenticated ? (
            <>
              <View style={styles.signedInCard}>
                <Text style={styles.signedInLabel}>{t('welcome.signedInAs')}</Text>
                <Text style={styles.signedInEmail} numberOfLines={1}>
                  {accountEmail ?? t('auth.creatorFallback')}
                </Text>
              </View>
              <Pressable
                testID="welcome-enter-workspace"
                accessibilityRole="button"
                onPress={() => router.replace('/inbox' as Href)}
                style={styles.primaryBtn}>
                <Text style={styles.primaryLabel}>{t('welcome.enterWorkspace')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void signOut();
                }}
                style={styles.secondaryBtn}>
                <Text style={styles.secondaryLabel}>{t('welcome.signOutAndSwitch')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/register' as Href)}
                style={styles.primaryBtn}>
                <Text style={styles.primaryLabel}>{content.ctaPrimary}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/login' as Href)}
                style={styles.secondaryBtn}>
                <Text style={styles.secondaryLabel}>{content.ctaSecondary}</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionEyebrow}>{content.aboutTitle}</Text>
          <View style={styles.glassCard}>
            {content.aboutParagraphs.map((p, index) => (
              <Text key={`about-${index}`} style={styles.body}>
                {p}
              </Text>
            ))}
          </View>

          <Text style={styles.sectionEyebrow}>{content.featuresTitle}</Text>
          <View style={styles.featureGrid}>
            {content.features.map((feature) => (
              <View key={feature.title} style={styles.featureCard}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.body}>{feature.body}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionEyebrow}>{content.trustTitle}</Text>
          <View style={styles.glassCard}>
            {content.trustBullets.map((bullet, index) => (
              <View key={`trust-${index}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={[styles.body, styles.bulletText]}>{bullet}</Text>
              </View>
            ))}
          </View>

          <LegalFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LANDING_BG,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'web' ? spacing.sectionY : spacing.sectionY + spacing.lg,
    gap: spacing.lg,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  navLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  devActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexShrink: 0,
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
  wordmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    lineHeight: 12,
  },
  hero: { gap: spacing.md, paddingTop: spacing.lg },
  localizedTagline: {
    color: '#5FD9FF',
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  campaignTitle: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.45,
    lineHeight: 47,
  },
  heroSubtitle: {
    color: SUB,
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
  },
  keywordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  keyword: { fontSize: fontSize.lead, fontWeight: '900', letterSpacing: 0.2 },
  keywordDivider: { color: 'rgba(255,255,255,0.2)', fontSize: fontSize.bodySmall, fontWeight: '800' },
  heroNote: {
    color: LANDING_MUTED,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  privacyLink: { color: '#5FD9FF', fontWeight: '700' },
  actions: { gap: spacing.sm },
  signedInCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LANDING_BORDER,
    backgroundColor: LANDING_CARD,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  signedInLabel: {
    color: LANDING_MUTED,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  signedInEmail: { color: '#FFFFFF', fontSize: fontSize.body, fontWeight: '700' },
  primaryBtn: {
    borderRadius: 18,
    minHeight: layout.touchMin + 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryLabel: {
    color: '#080C0A',
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: '#8B939E',
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  detailsSection: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LANDING_BORDER,
  },
  sectionEyebrow: {
    color: '#FFFFFF',
    fontSize: fontSize.sectionTitle,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  glassCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: LANDING_BORDER,
    backgroundColor: LANDING_CARD,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  featureGrid: { gap: spacing.sm },
  featureCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: LANDING_BORDER,
    backgroundColor: LANDING_CARD,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  featureTitle: { color: '#FFFFFF', fontSize: fontSize.body, fontWeight: '800' },
  body: { color: SUB, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: { color: '#5FD9FF', fontSize: fontSize.body, lineHeight: lineHeight.body },
  bulletText: { flex: 1 },
});
