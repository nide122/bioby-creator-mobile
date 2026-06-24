import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { ReplyTemplateFieldChip } from '@/src/components/reply-templates/ReplyTemplateFieldChip';
import {
  REPLY_TEMPLATE_FIELD_KEYS,
  replyTemplateFieldLabel,
  type ReplyTemplateFieldKey,
} from '@/src/lib/reply-template-fields';
import { alertAction } from '@/src/lib/app-dialog';

type ReplyTemplateFieldTagPickerProps = {
  onInsert: (fieldKey: ReplyTemplateFieldKey) => void;
};

export function ReplyTemplateFieldTagPicker({ onInsert }: ReplyTemplateFieldTagPickerProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const showHelp = () => {
    void alertAction(
      t('replyTemplateBodyEditor.helpTitle'),
      t('replyTemplateBodyEditor.helpBody', {
        example: replyTemplateFieldLabel('brandName', t),
      }),
    );
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.foreground }]}>{t('replyTemplateBodyEditor.tagsLead')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('replyTemplateBodyEditor.helpA11y')}
          onPress={showHelp}
          hitSlop={8}
          style={[styles.infoButton, { borderColor: theme.border, backgroundColor: theme.muted }]}>
          <Ionicons name="alert-circle-outline" size={14} color={theme.mutedForeground} />
        </Pressable>
      </View>
      <View style={styles.tagRow}>
        {REPLY_TEMPLATE_FIELD_KEYS.map((fieldKey) => (
          <Pressable key={fieldKey} accessibilityRole="button" onPress={() => onInsert(fieldKey)}>
            <View style={[styles.tagOption, { borderColor: theme.border }]}>
              <ReplyTemplateFieldChip fieldKey={fieldKey} compact />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    fontWeight: '600',
  },
  infoButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagOption: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
