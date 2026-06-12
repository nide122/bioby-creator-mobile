import { type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, HubLinkGroup, HubScreen, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';

const links: { label: string; href: Href; hint?: string }[] = [
  {
    label: 'Trust passport',
    href: '/trust-passport',
    hint: 'Public reliability signals you control.',
  },
  {
    label: 'Battle reports',
    href: '/battle-reports',
    hint: 'Finished work turned into reusable proof.',
  },
  {
    label: 'Dispute progress',
    href: '/disputes',
    hint: 'Private issues, evidence, and next steps.',
  },
];

export default function TrustScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <HubScreen
      eyebrow={t('tabs.assets')}
      title="Public proof, private issues"
      lead="Share proof that helps close. Keep remediation and dispute evidence private.">
      <SectionCard title="Public proof" subtitle="Safe to reuse in media kit and proposals." emphasis>
        <View style={styles.grid}>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.value, { color: theme.primary }]}>96%</Text>
            <Text style={[styles.label, { color: theme.foreground }]}>On-time publish</Text>
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>Last 90 days</Text>
          </View>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.value, { color: theme.primary }]}>2</Text>
            <Text style={[styles.label, { color: theme.foreground }]}>Reusable wins</Text>
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>Ready for proposals</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Private issue queue" subtitle="Operational status, not public reputation.">
        <View style={styles.grid}>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={{ gap: spacing.xs }}>
              <Badge tone="warning" label="Needs follow-up" />
              <Text style={[styles.label, { color: theme.foreground }]}>1 dispute proof item</Text>
            </View>
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>Add evidence before SLA</Text>
          </View>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={{ gap: spacing.xs }}>
              <Badge tone="mint" label="Creator controlled" />
              <Text style={[styles.label, { color: theme.foreground }]}>No credit score</Text>
            </View>
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>Mock signals only</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Ready to reuse">
        <Text style={[styles.copy, { color: theme.foreground }]}>
          Spring skincare collab: +18% rate lift, disclosure passed first check.
        </Text>
      </SectionCard>

      <HubLinkGroup links={links} />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  value: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  hint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  copy: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
