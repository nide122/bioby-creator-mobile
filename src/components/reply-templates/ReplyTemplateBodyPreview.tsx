import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette } from '@/constants/tokens';
import { ReplyTemplateFieldChip } from '@/src/components/reply-templates/ReplyTemplateFieldChip';
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

  return (
    <View style={styles.row}>
      {segments.map((segment, index) => {
        if (segment.kind === 'field') {
          return <ReplyTemplateFieldChip key={`field-${index}`} fieldKey={segment.key} compact />;
        }
        if (!segment.value) return null;
        return (
          <Text
            key={`text-${index}`}
            numberOfLines={numberOfLines}
            style={[styles.text, { color: theme.foreground }]}>
            {segment.value}
          </Text>
        );
      })}
      {segments.every((segment) => segment.kind === 'field' || !segment.value) ? (
        <Text style={[styles.text, { color: theme.mutedForeground }]}>{t('replyTemplateBodyPreview.empty')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
});
