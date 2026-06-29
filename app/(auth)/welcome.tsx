import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { fontSize, layout, lineHeight, radii, spacing } from '@/constants/tokens';
import { clearDevSession } from '@/src/auth/clear-dev-session';
import { enterDemoWorkspace } from '@/src/auth/enter-demo-workspace';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { runAfterLocaleHydration, useLocaleStore } from '@/src/stores/locale-store';
import { useSessionStore } from '@/src/stores/session-store';

const BG = '#050706';
const CARD = '#0A100D';
const BORDER = 'rgba(255,255,255,0.16)';
const MUTED = '#737A84';
const SUB = '#A3AAB5';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const accountEmail = useSessionStore((s) => s.accountEmail);
  useEffect(() => {
    return runAfterLocaleHydration(() => {
      void useLocaleStore.getState().applyWelcomeSystemLanguage();
    });
  }, []);

  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    const flag = qs.get('testWorkspace');
    if (flag !== '1' && flag !== 'true') return;
    void enterDemoWorkspace().then(() => {
      requestAnimationFrame(() => {
        router.replace('/inbox' as Href);
      });
    });
  }, [router]);

  return (
    <SafeAreaView style={styles.safe}>
      <BackgroundAura />

      <View style={styles.nav}>
        <View style={styles.brandLockup}>
          <BrandMark />
          <Text style={styles.wordmark}>BIOBY</Text>
        </View>
        {__DEV__ ? (
          <View style={styles.devActions}>
            <Pressable
              testID="welcome-clear-session"
              accessibilityRole="button"
              accessibilityLabel={t('welcome.clearSessionA11y')}
              hitSlop={12}
              onPress={async () => {
                await clearDevSession();
              }}
              style={({ pressed }) => [styles.devClear, pressed && styles.devSkipPressed]}>
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
              style={({ pressed }) => [styles.devSkip, pressed && styles.devSkipPressed]}>
              <Text style={styles.devSkipLabel}>{t('welcome.devSkip')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>
          {t('welcome.titleLine1')}
          {'\n'}
          {t('welcome.titleLine2')}
        </Text>
        <View style={styles.subWrap}>
          <Text style={styles.sub}>{t('welcome.sub')}</Text>
          <View style={styles.keywordRow}>
            <Text style={[styles.keyword, { color: '#5FD9FF' }]}>{t('welcome.keywordRate')}</Text>
            <Text style={styles.keywordDivider}>/</Text>
            <Text style={[styles.keyword, { color: '#F086FF' }]}>{t('welcome.keywordRights')}</Text>
            <Text style={styles.keywordDivider}>/</Text>
            <Text style={[styles.keyword, { color: '#A7F3D0' }]}>{t('welcome.keywordPayout')}</Text>
          </View>
          {t('welcome.boundary') ? (
            <Text style={styles.boundary}>{t('welcome.boundary')}</Text>
          ) : null}
        </View>
        <MineMap t={t} />
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
              style={styles.primary}>
              <Text style={styles.primaryLabel}>{t('welcome.enterWorkspace')}</Text>
            </Pressable>
            <Pressable
              testID="welcome-sign-out-switch"
              accessibilityRole="button"
              onPress={async () => {
                await signOut();
              }}
              style={styles.secondary}>
              <Text style={styles.secondaryLabel}>{t('welcome.signOutAndSwitch')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/register' as Href)}
              style={styles.primary}>
              <Text style={styles.primaryLabel}>{t('welcome.getStarted')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/login' as Href)}
              style={styles.secondary}>
              <Text style={styles.secondaryLabel}>{t('welcome.signIn')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function BackgroundAura() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 390 844" fill="none">
      <Circle cx="352" cy="128" r="220" fill="url(#topAura)" />
      <Circle cx="34" cy="598" r="250" fill="url(#bottomAura)" />
      <Path
        d="M-26 328C48 286 112 292 168 334C230 380 292 358 416 258"
        stroke="url(#auraVein)"
        strokeWidth="1.2"
        strokeOpacity="0.16"
        strokeLinecap="round"
      />
      <Defs>
        <RadialGradient id="topAura" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(352 128) rotate(90) scale(220)">
          <Stop stopColor="#5FD9FF" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#5FD9FF" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bottomAura" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(34 598) rotate(90) scale(250)">
          <Stop stopColor="#F086FF" stopOpacity="0.16" />
          <Stop offset="1" stopColor="#F086FF" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="auraVein" x1="-26" y1="328" x2="416" y2="258" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#5FD9FF" />
          <Stop offset="0.56" stopColor="#F086FF" />
          <Stop offset="1" stopColor="#A7F3D0" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

function MineMap({ t }: { t: (k: string) => string }) {
  return (
    <View style={styles.mapCard}>
      {/* Vein + glow dots */}
      <Svg style={styles.mapSvg} viewBox="0 0 330 130" fill="none">
        <Path
          d="M18 108C56 72 94 62 132 78C172 96 208 88 306 26"
          stroke="url(#vein)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <Path
          d="M20 30C60 48 102 47 140 32C188 14 228 30 306 74"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Rate dot */}
        <Circle cx="76" cy="86" r="14" fill="#5FD9FF" fillOpacity="0.12" />
        <Circle cx="76" cy="86" r="6" fill="#5FD9FF" />
        {/* Rights dot */}
        <Circle cx="186" cy="74" r="14" fill="#F086FF" fillOpacity="0.12" />
        <Circle cx="186" cy="74" r="6" fill="#F086FF" />
        {/* Payout dot */}
        <Circle cx="272" cy="42" r="14" fill="#A7F3D0" fillOpacity="0.12" />
        <Circle cx="272" cy="42" r="6" fill="#A7F3D0" />
        <Defs>
          <LinearGradient id="vein" x1="18" y1="108" x2="306" y2="26" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#5FD9FF" />
            <Stop offset="0.52" stopColor="#F086FF" />
            <Stop offset="1" stopColor="#A7F3D0" />
          </LinearGradient>
        </Defs>
      </Svg>

      {/* Bottom chip row — clean, not overlapping */}
      <View style={styles.chipRow}>
        <SignalChip label={t('welcome.mineRateLabel')} value={t('welcome.mineRateValue')} accent="#5FD9FF" />
        <SignalChip label={t('welcome.mineRightsLabel')} value={t('welcome.mineRightsValue')} accent="#F086FF" />
        <SignalChip label={t('welcome.minePayoutLabel')} value={t('welcome.minePayoutValue')} accent="#A7F3D0" />
      </View>
    </View>
  );
}

function SignalChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function BrandMark() {
  return (
    <Svg
      width={38}
      height={25}
      viewBox="0 0 264 175.67"
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="BioBy logo">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0.5" x2="1" y2="0.5" gradientUnits="objectBoundingBox">
          <Stop stopColor="#5FD9FF" />
          <Stop offset="0.5" stopColor="#A78BFA" />
          <Stop offset="1" stopColor="#F086FF" />
        </LinearGradient>
      </Defs>
      <Path
        transform="matrix(0.773,0,0,-0.773,176.1758,111.7357)"
        fill="url(#lg)"
        d="M0 0C-5.705-5.706-14.614-6.305-20.992-1.799-21.743-1.272-22.458-.672-23.13 0L-38.902 15.771-38.732 15.941 2.308 56.987C12.247 66.92 28.412 66.92 38.351 56.987L47.667 47.672ZM104.236 47.739 66.672 85.302C42.221 109.753 3.095 110.807-22.622 88.458-23.778 87.458-24.911 86.404-26.013 85.302L-67.053 44.262-67.223 44.092-67.532 44.401-137.583 114.453-137.801 114.671-138.062 114.411-165.995 86.471-166.116 86.35-95.538 15.771-95.847 15.469-105.786 5.53C-106.894 4.421-108.081 3.446-109.335 2.604-117.269-2.744-127.729-2.804-135.718 2.422-137.075 3.307-138.358 4.342-139.545 5.53L-193.135 59.119-193.202 59.052-221.45 30.798-167.86-22.792C-162.016-28.636-155.311-33.106-148.152-36.213-147.952-36.298-147.752-36.383-147.546-36.467-131.66-43.16-113.593-43.154-97.712-36.437-97.512-36.358-97.313-36.273-97.112-36.183-89.972-33.082-83.291-28.618-77.465-22.792L-67.526-12.853-67.223-12.543-51.451-28.321C-50.397-29.375-49.313-30.375-48.199-31.325-37.685-40.319-24.626-44.813-11.568-44.813-2.531-44.813 6.511-42.657 14.706-38.357 14.894-38.254 15.075-38.157 15.263-38.054 19.03-36.025 22.604-33.53 25.917-30.581 26.734-29.86 27.534-29.103 28.315-28.321L104.302 47.672Z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sectionY + spacing.sm,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  devActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
    letterSpacing: 0.2,
  },
  devSkip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.45)',
    backgroundColor: 'rgba(255,179,71,0.08)',
  },
  devSkipPressed: { opacity: 0.85 },
  devSkipLabel: {
    color: '#FFB347',
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.6,
  },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  title: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.45,
    lineHeight: 47,
  },
  subWrap: { gap: spacing.xs },
  sub: { color: SUB, fontSize: fontSize.body, lineHeight: lineHeight.body },
  boundary: { color: MUTED, fontSize: fontSize.caption, lineHeight: lineHeight.body, marginTop: spacing.xs },
  keywordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  keyword: { fontSize: fontSize.lead, fontWeight: '900', letterSpacing: 0.2 },
  keywordDivider: { color: 'rgba(255,255,255,0.2)', fontSize: fontSize.bodySmall, fontWeight: '800' },

  mapCard: {
    borderRadius: 28,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginTop: spacing.sm,
    shadowColor: '#5FD9FF',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
    elevation: 5,
  },
  mapSvg: {
    width: '100%',
    height: 146,
  },
  chipRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  chipValue: {
    color: '#FFFFFF',
    fontSize: fontSize.bodySmall,
    fontWeight: '800',
  },

  actions: { gap: spacing.sm },
  signedInCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  signedInLabel: {
    color: MUTED,
    fontSize: fontSize.caption,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signedInEmail: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  primary: {
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
    letterSpacing: 0.2,
  },
  secondary: {
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
});
