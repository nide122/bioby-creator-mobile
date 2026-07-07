import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { LANDING_BORDER, LANDING_CARD, LANDING_MUTED } from '@/components/landing/WelcomeBrandVisuals';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';
import type { AppLocale } from '@/src/i18n';
import { resolveLanguagePreference, useLocaleStore } from '@/src/stores/locale-store';

const OPTIONS: AppLocale[] = ['en', 'zh'];

type Props = {
  /** Hide the "Language" label — used on the marketing landing header. */
  compact?: boolean;
  /** Match the dark landing page chrome instead of app shell tokens. */
  tone?: 'app' | 'landing';
};

export function LegalLanguageToggle({ compact = false, tone = 'app' }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const languagePreference = useLocaleStore((s) => s.languagePreference);
  const setLanguagePreference = useLocaleStore((s) => s.setLanguagePreference);

  const active: AppLocale = resolveLanguagePreference(languagePreference);
  const landing = tone === 'landing';

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('legal.languageToggleA11y')}>
      {compact ? null : (
        <Text style={[styles.label, { color: landing ? LANDING_MUTED : theme.mutedForeground }]}>
          {t('legal.languageToggle')}
        </Text>
      )}
      {OPTIONS.map((code) => {
        const selected = active === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setLanguagePreference(code)}
            style={[
              styles.chip,
              landing
                ? {
                    borderColor: selected ? '#5FD9FF' : LANDING_BORDER,
                    backgroundColor: selected ? 'rgba(95,217,255,0.12)' : LANDING_CARD,
                  }
                : {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.accentMintSoft : theme.card,
                  },
            ]}>
            <Text
              style={[
                styles.chipLabel,
                { color: selected ? (landing ? '#5FD9FF' : theme.primary) : landing ? '#D7DCE2' : theme.foreground },
              ]}>
              {t(`legal.language.${code}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: { fontSize: fontSize.caption, fontWeight: '600' },
  chip: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipLabel: { fontSize: fontSize.caption, fontWeight: '700' },
});
