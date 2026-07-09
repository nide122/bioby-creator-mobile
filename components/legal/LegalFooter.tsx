import { type Href, Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';
import { legalConfig } from '@/src/legal/config';

type Props = {
  /** Only render privacy · terms links (for landing bottom chrome). */
  linksOnly?: boolean;
  /** Hide the link row; show support / entity meta only. */
  metaOnly?: boolean;
};

export function LegalFooter({ linksOnly = false, metaOnly = false }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (linksOnly) {
    return (
      <View style={styles.linksOnly}>
        <Link href={'/privacy' as Href} style={[styles.linkCompact, { color: theme.primary }]}>
          {t('legal.footerPrivacy')}
        </Link>
        <Text style={[styles.linkDot, { color: theme.mutedForeground }]}>·</Text>
        <Link href={'/terms' as Href} style={[styles.linkCompact, { color: theme.primary }]}>
          {t('legal.footerTerms')}
        </Link>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.footer,
        { borderTopColor: theme.border },
        metaOnly && styles.footerMetaOnly,
      ]}>
      {metaOnly ? null : (
        <View style={styles.links}>
          <Link href={'/home' as Href} style={[styles.link, { color: theme.primary }]}>
            {t('legal.footerHome')}
          </Link>
          <Text style={{ color: theme.mutedForeground }}>·</Text>
          <Link href={'/privacy' as Href} style={[styles.link, { color: theme.primary }]}>
            {t('legal.footerPrivacy')}
          </Link>
          <Text style={{ color: theme.mutedForeground }}>·</Text>
          <Link href={'/terms' as Href} style={[styles.link, { color: theme.primary }]}>
            {t('legal.footerTerms')}
          </Link>
        </View>
      )}
      <Text style={[styles.support, { color: theme.mutedForeground }]}>
        {t('legal.footerSupport', { email: legalConfig.supportEmail })}
      </Text>
      <Text style={[styles.entity, { color: theme.mutedForeground }]}>
        {legalConfig.companyLegalNameEn}
      </Text>
      <Text style={[styles.address, { color: theme.mutedForeground }]}>
        {legalConfig.registeredAddress}
      </Text>
      <Text style={[styles.copy, { color: theme.mutedForeground }]}>
        © {new Date().getFullYear()} {legalConfig.companyLegalNameEn}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linksOnly: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footer: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  footerMetaOnly: {
    marginTop: spacing.md,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  link: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  linkCompact: { fontSize: fontSize.caption, fontWeight: '600' },
  linkDot: { fontSize: fontSize.caption },
  support: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  entity: { fontSize: fontSize.caption, lineHeight: lineHeight.body, fontWeight: '600' },
  address: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  copy: { fontSize: fontSize.caption },
});
