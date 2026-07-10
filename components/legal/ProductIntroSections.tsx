import { StyleSheet, Text, View } from 'react-native';

import { LegalFooter } from '@/components/legal/LegalFooter';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';
import type { MarketingHomeContent } from '@/src/legal/types';

type Props = {
  content: MarketingHomeContent;
  theme?: ThemePalette;
  showFooter?: boolean;
  /** `meta` = support/entity only (modal); `full` = links + legal meta (intro page). */
  footerVariant?: 'meta' | 'full';
};

export function ProductIntroSections({
  content,
  theme: themeOverride,
  showFooter = true,
  footerVariant = 'meta',
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = themeOverride ?? palette[colorScheme];

  return (
    <View style={styles.stack}>
      <Text style={[styles.sectionEyebrow, { color: theme.foreground }]}>{content.aboutTitle}</Text>
      <View
        className={webClassName(corporateCleanClass.card)}
        style={[styles.glassCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
        {content.aboutParagraphs.map((paragraph, index) => (
          <Text key={`about-${index}`} style={[styles.body, { color: theme.mutedForeground }]}>
            {paragraph}
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

      {showFooter ? (
        footerVariant === 'full' ? <LegalFooter /> : <LegalFooter metaOnly />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
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
