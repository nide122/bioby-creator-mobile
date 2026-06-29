import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette } from '@/constants/tokens';
import {
  replyTemplateFieldChipColors,
  replyTemplateFieldLabel,
} from '@/src/lib/reply-template-fields';
import { parseReplyTemplateBody } from '@/src/lib/reply-template-render';

type ReplyTemplateBodyPreviewProps = {
  body: string;
  numberOfLines?: number;
};

export function ReplyTemplateBodyPreview({ body, numberOfLines }: ReplyTemplateBodyPreviewProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const segments = useMemo(() => parseReplyTemplateBody(body), [body]);
  const hasVisibleText = segments.some((segment) => segment.kind === 'text' && segment.value);

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles.paragraph, { color: theme.foreground }]}>
      {segments.map((segment, index) => {
        if (segment.kind === 'field') {
          const colors = replyTemplateFieldChipColors(segment.key, colorScheme);
          const label = replyTemplateFieldLabel(segment.key, t);
          return (
            <Text
              key={`field-${index}`}
              style={[
                styles.inlineField,
                {
                  backgroundColor: colors.backgroundColor,
                  color: colors.color,
                },
              ]}>
              {label}
            </Text>
          );
        }
        if (!segment.value) return null;
        return <Text key={`text-${index}`}>{segment.value}</Text>;
      })}
      {!hasVisibleText && segments.every((segment) => segment.kind === 'field' || !segment.value) ? (
        <Text style={{ color: theme.mutedForeground }}>{t('replyTemplateBodyPreview.empty')}</Text>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  inlineField: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    fontWeight: '600',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
});
