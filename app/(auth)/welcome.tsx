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
    <Svg width={22} height={26} viewBox="0 0 379 458" fill="none">
      <Path
        d="M1.5 0H221.5L240.5 3L257.5 8L273.5 16L287.5 26L302.5 41L309.5 51L317.5 65L322.5 75L336.5 84L351.5 92L366.5 101L369 102.5L366.5 104L339.5 120L328.5 126L326.5 127L323.5 142L318.5 157L310.5 173L300.5 187L297.5 190V192L313.5 198L328.5 206L341.5 216L352.5 227L362.5 241L370.5 257L375.5 272L378.5 290V316L375.5 334L370.5 351L362.5 369L354.5 382L345.5 394L336.5 404L323.5 417L306.5 430L290.5 439L275.5 446L249.5 454L231.5 457L219.5 458H24.5V277L310.5 276L308.5 270L306.5 265.5L303.5 261L299 256L289.5 249L279.5 244L267.5 241L260.5 240L24.5 239L28.5 236.5L50.5 225L99.5 199L138.5 180L147.5 175L148.5 174L149 173L149.5 172V171V169.5V168L149 166L148.5 164.5L147.5 163L127.5 159L104.5 153L84.5 145L66.5 135L52.5 124L41.5 114L34.5 106L23.5 91L13.5 73L5.5 52L2.5 40L0.5 24V1V0H1.5ZM240.5 65L236 66L232.5 68L229 71.5L226.5 75L225.5 78.5L225 82.5L225.5 86L226.5 89L228.5 92L230.5 94.5L233 96.5L238.5 99L243 99.5L247.5 99L252 97L255.5 94L257.5 91.5L259.5 88L260.5 84V80L259.5 76.5L257.5 73L255.5 70.5L252.5 68L249 66L245.5 65H240.5Z"
        fill="url(#lg)"
      />
      <Defs>
        <LinearGradient id="lg" x1="115.5" y1="37.5" x2="224.5" y2="389" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#5FD9FF" />
          <Stop offset="1" stopColor="#F086FF" />
        </LinearGradient>
      </Defs>
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
