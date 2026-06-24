import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, radii, spacing } from '@/constants/tokens';
import {
  replyTemplateFieldChipColors,
  replyTemplateFieldLabel,
  type ReplyTemplateFieldKey,
} from '@/src/lib/reply-template-fields';

type ReplyTemplateFieldChipProps = {
  fieldKey: ReplyTemplateFieldKey;
  onPress?: () => void;
  compact?: boolean;
  /** Shows a small delete button in the top-right corner. */
  onRemove?: () => void;
};

export function ReplyTemplateFieldChip({
  fieldKey,
  onPress,
  compact = false,
  onRemove,
}: ReplyTemplateFieldChipProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = replyTemplateFieldChipColors(fieldKey, colorScheme);
  const label = replyTemplateFieldLabel(fieldKey, t);

  const chipBody = (
    <View
      style={[
        styles.chip,
        onRemove ? styles.chipWithRemove : null,
        compact ? styles.chipCompact : null,
        { backgroundColor: colors.backgroundColor },
      ]}>
      <Text style={[styles.chipLabel, compact ? styles.chipLabelCompact : null, { color: colors.color }]}>
        {label}
      </Text>
    </View>
  );

  const chip = onRemove ? (
    <View style={styles.inlineWrap}>
      {chipBody}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('replyTemplateBodyEditor.removeTagA11y', { label })}
        onPress={onRemove}
        hitSlop={6}
        style={[styles.removeButton, { backgroundColor: colorScheme === 'dark' ? '#475569' : '#64748B' }]}>
        <Ionicons name="close" size={10} color="#FFFFFF" />
      </Pressable>
    </View>
  ) : onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {chipBody}
    </Pressable>
  ) : (
    chipBody
  );

  return chip;
}

const styles = StyleSheet.create({
  inlineWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginHorizontal: 5,
    marginVertical: 2,
  },
  chip: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
  },
  chipWithRemove: {
    paddingRight: spacing.sm + 2,
  },
  chipCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minHeight: 24,
  },
  chipLabel: {
    fontSize: fontSize.bodySmall,
    lineHeight: fontSize.bodySmall + 2,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : null),
  },
  chipLabelCompact: {
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption + 2,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
