import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { getTextInputProps, getTextInputStyle } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';

type Props = {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  testID?: string;
  maxTags?: number;
  placeholder?: string;
  placeholderMore?: string;
  hint?: string;
  removeA11yLabel?: string;
  addLabel?: string;
};

function normalizeTag(value: string): string {
  return value.trim();
}

function mergeUniqueTags(existing: string[], incoming: string[]): string[] {
  const next = [...existing];
  for (const raw of incoming) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    if (next.some((item) => item.toLowerCase() === tag.toLowerCase())) continue;
    next.push(tag);
  }
  return next;
}

export function TagInput({
  tags,
  onChangeTags,
  testID,
  maxTags,
  placeholder,
  placeholderMore,
  hint,
  removeA11yLabel,
  addLabel,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [draft, setDraft] = useState('');

  const canAddMore = maxTags == null || tags.length < maxTags;
  const canCommit = draft.trim().length > 0;
  const addButtonLabel = addLabel ?? t('tagInput.add');

  const commitDraft = useCallback(() => {
    const parts = draft
      .split(/[，,\n]/)
      .map(normalizeTag)
      .filter(Boolean);
    if (!parts.length) return;

    const next = mergeUniqueTags(tags, parts);
    onChangeTags(maxTags != null ? next.slice(0, maxTags) : next);
    setDraft('');
  }, [draft, maxTags, onChangeTags, tags]);

  const removeTagAt = useCallback(
    (index: number) => {
      onChangeTags(tags.filter((_, itemIndex) => itemIndex !== index));
    },
    [onChangeTags, tags],
  );

  const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key !== 'Backspace' || draft.length > 0 || tags.length === 0) return;
    onChangeTags(tags.slice(0, -1));
  };

  return (
    <View style={styles.wrap} testID={testID}>
      {tags.length ? (
        <View style={styles.chipRow}>
          {tags.map((tag, index) => (
            <View
              key={`${index}:${tag}`}
              style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Text style={[styles.chipLabel, { color: theme.foreground }]}>{tag}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(removeA11yLabel ?? 'tagInput.removeA11y', { tag })}
                hitSlop={8}
                onPress={() => removeTagAt(index)}
                style={({ pressed }) => [styles.chipRemove, pressed && { opacity: 0.7 }]}>
                <Text style={[styles.chipRemoveLabel, { color: theme.mutedForeground }]}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {canAddMore ? (
        <View style={[styles.inputRow, getTextInputStyle(theme), { borderColor: theme.input }]}>
          <TextInput
            testID={testID ? `${testID}-input` : undefined}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commitDraft}
            onKeyPress={handleKeyPress}
            placeholder={
              tags.length
                ? (placeholderMore ?? t('tagInput.placeholderMore'))
                : (placeholder ?? t('tagInput.placeholder'))
            }
            returnKeyType="done"
            blurOnSubmit={false}
            {...getTextInputProps(theme)}
            style={[styles.input, { color: theme.foreground }]}
          />
          <Pressable
            testID={testID ? `${testID}-add` : undefined}
            accessibilityRole="button"
            accessibilityLabel={addButtonLabel}
            disabled={!canCommit}
            onPress={commitDraft}
            style={({ pressed }) => [
              styles.addButton,
              {
                borderColor: canCommit ? theme.primary : theme.border,
                backgroundColor: canCommit ? theme.accentMintSoft : theme.secondary,
              },
              pressed && canCommit && { opacity: 0.88 },
              !canCommit && { opacity: 0.55 },
            ]}>
            <Text style={[styles.addButtonLabel, { color: canCommit ? theme.primary : theme.mutedForeground }]}>
              {addButtonLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.hint, { color: theme.mutedForeground }]}>
        {hint ?? t('tagInput.hint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    maxWidth: '100%',
  },
  chipLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipRemove: {
    minWidth: layout.touchMin - 24,
    minHeight: layout.touchMin - 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRemoveLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
    lineHeight: fontSize.body,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minHeight: layout.touchMin - 12,
  },
  addButton: {
    minHeight: layout.touchMin - 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
  hint: {
    fontSize: fontSize.caption,
    lineHeight: 18,
  },
});
