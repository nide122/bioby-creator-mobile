import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LegalFooter } from '@/components/legal/LegalFooter';
import { LegalLanguageToggle } from '@/components/legal/LegalLanguageToggle';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { LegalDocument } from '@/src/legal/types';

type Props = {
  document: LegalDocument;
};

export function LegalDocumentView({ document }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}>
      <LegalLanguageToggle />
      <Text style={[styles.title, { color: theme.foreground }]}>{document.title}</Text>
      <Text style={[styles.lastUpdated, { color: theme.mutedForeground }]}>
        {t('legal.lastUpdated', { date: document.lastUpdated })}
      </Text>
      {document.intro?.map((paragraph, index) => (
        <Text key={`intro-${index}`} style={[styles.paragraph, { color: theme.foregroundSubtitle }]}>
          {paragraph}
        </Text>
      ))}
      {document.sections.map((section, sectionIndex) => (
        <View
          key={`section-${sectionIndex}`}
          style={[styles.section, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>{section.title}</Text>
          {section.paragraphs?.map((p, index) => (
            <Text key={`p-${sectionIndex}-${index}`} style={[styles.paragraph, { color: theme.foregroundSubtitle }]}>
              {p}
            </Text>
          ))}
          {section.bullets?.map((bullet, index) => (
            <View key={`b-${sectionIndex}-${index}`} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme.primary }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.foregroundSubtitle }]}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}
      <LegalFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sectionY,
    gap: spacing.md,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 38,
    marginTop: spacing.sm,
  },
  lastUpdated: { fontSize: fontSize.caption },
  section: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.body, fontWeight: '800' },
  paragraph: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: { fontSize: fontSize.body, lineHeight: lineHeight.body, marginTop: 1 },
  bulletText: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
});
