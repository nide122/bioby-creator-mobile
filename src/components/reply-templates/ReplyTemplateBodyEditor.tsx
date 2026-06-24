import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputSelectionChangeEvent,
  type TextStyle,
} from 'react-native';

import { getTextInputProps } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { ReplyTemplateFieldChip } from '@/src/components/reply-templates/ReplyTemplateFieldChip';
import { ReplyTemplateFieldTagPicker } from '@/src/components/reply-templates/ReplyTemplateFieldTagPicker';
import type { ReplyTemplateFieldKey } from '@/src/lib/reply-template-fields';
import {
  bodyToDisplayText,
  displayTextToBody,
  insertInlineFieldAt,
  listInlineFieldsInBody,
  removeFieldKeyFromBody,
  normalizeInlineDelete,
  type TextSelection,
} from '@/src/lib/reply-template-inline-text';

type ReplyTemplateBodyEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export function ReplyTemplateBodyEditor({ value, onChange, placeholder }: ReplyTemplateBodyEditorProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const inputProps = getTextInputProps(theme);
  const plainTextStyle: TextStyle = {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
    color: theme.foreground,
    fontFamily: Platform.select({ android: 'sans-serif', default: undefined }),
  };

  const lastEmittedRef = useRef(value);
  const [displayText, setDisplayText] = useState(() => bodyToDisplayText(value, t));
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    setDisplayText(bodyToDisplayText(value, t));
  }, [t, value]);

  const commitDisplay = (nextDisplay: string, nextSelection?: TextSelection) => {
    const body = displayTextToBody(nextDisplay, t);
    lastEmittedRef.current = body;
    setDisplayText(nextDisplay);
    if (nextSelection) {
      setSelection(nextSelection);
    }
    onChange(body);
  };

  const onChangeText = (text: string) => {
    const expandedDelete = normalizeInlineDelete(displayText, text, selection, t);
    if (expandedDelete) {
      commitDisplay(expandedDelete.text, expandedDelete.selection);
      return;
    }
    commitDisplay(text);
  };

  const onSelectionChange = (event: TextInputSelectionChangeEvent) => {
    setSelection(event.nativeEvent.selection);
  };

  const insertField = (fieldKey: ReplyTemplateFieldKey) => {
    const inserted = insertInlineFieldAt(displayText, selection, fieldKey, t);
    commitDisplay(inserted.text, inserted.selection);
  };

  const removeField = (fieldKey: ReplyTemplateFieldKey) => {
    const nextBody = removeFieldKeyFromBody(value, fieldKey);
    const nextDisplay = bodyToDisplayText(nextBody, t);
    const nextSelection = {
      start: Math.min(selection.start, nextDisplay.length),
      end: Math.min(selection.end, nextDisplay.length),
    };
    commitDisplay(nextDisplay, nextSelection);
  };

  const usedFieldKeys = useMemo(() => listInlineFieldsInBody(value), [value]);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.editor, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
        <TextInput
          multiline
          value={displayText}
          onChangeText={onChangeText}
          onSelectionChange={onSelectionChange}
          selection={selection}
          placeholder={placeholder}
          {...inputProps}
          style={[styles.input, plainTextStyle]}
          textAlignVertical="top"
        />
      </View>

      {usedFieldKeys.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.hint, { color: theme.mutedForeground }]}>
            {t('replyTemplateBodyEditor.insertedTagsTitle')}
          </Text>
          <View style={styles.usedTagRow}>
            {usedFieldKeys.map((fieldKey) => (
              <ReplyTemplateFieldChip
                key={fieldKey}
                fieldKey={fieldKey}
                compact
                onRemove={() => removeField(fieldKey)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <ReplyTemplateFieldTagPicker onInsert={insertField} />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: 220,
    padding: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 188,
    borderWidth: 0,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.bodyRelaxed,
  },
  usedTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
