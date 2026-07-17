import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
  insertTextAtSelection,
  listInlineFieldOccurrencesInDisplay,
  removeInlineFieldSpan,
  normalizeInlineDelete,
  type InlineFieldOccurrence,
  type TextSelection,
} from '@/src/lib/reply-template-inline-text';
import { replyTemplateFieldLabel } from '@/src/lib/reply-template-fields';

type ReplyTemplateBodyEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

function resolveTextInputElement(node: TextInput | null): HTMLTextAreaElement | null {
  if (!node) return null;

  if (typeof (node as HTMLTextAreaElement).setSelectionRange === 'function') {
    return node as HTMLTextAreaElement;
  }

  return (node as { querySelector?: (selector: string) => HTMLTextAreaElement | null }).querySelector?.('textarea') ?? null;
}

function applyTextInputSelection(inputRef: RefObject<TextInput | null>, selection: TextSelection) {
  const element = resolveTextInputElement(inputRef.current);
  if (!element?.setSelectionRange) {
    const node = inputRef.current as (TextInput & { setNativeProps?: (props: { selection: TextSelection }) => void }) | null;
    if (typeof node?.setNativeProps === 'function') {
      node.setNativeProps({ selection });
    }
    return;
  }

  element.focus({ preventScroll: true });
  element.setSelectionRange(selection.start, selection.end);
}

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

  const inputRef = useRef<TextInput>(null);
  const lastEmittedRef = useRef(value);
  const selectionRef = useRef<TextSelection>({ start: 0, end: 0 });
  const hasFocusedRef = useRef(false);
  const [displayText, setDisplayText] = useState(() => bodyToDisplayText(value, t));
  const displayTextRef = useRef(displayText);

  displayTextRef.current = displayText;

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    setDisplayText(bodyToDisplayText(value, t));
  }, [t, value]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let element: HTMLTextAreaElement | null = null;
    let detach: (() => void) | null = null;

    const attach = () => {
      element = resolveTextInputElement(inputRef.current);
      if (!element) return false;

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();

        const start = element!.selectionStart ?? selectionRef.current.start;
        const end = element!.selectionEnd ?? selectionRef.current.end;
        const inserted = insertTextAtSelection(displayTextRef.current, { start, end }, '\t');
        selectionRef.current = inserted.selection;
        const body = displayTextToBody(inserted.text, t);
        lastEmittedRef.current = body;
        setDisplayText(inserted.text);
        onChange(body);
        requestAnimationFrame(() => {
          applyTextInputSelection(inputRef, inserted.selection);
        });
      };

      element.addEventListener('keydown', onKeyDown);
      detach = () => element?.removeEventListener('keydown', onKeyDown);
      return true;
    };

    if (attach()) {
      return () => detach?.();
    }

    const frameId = requestAnimationFrame(() => {
      attach();
    });
    return () => {
      cancelAnimationFrame(frameId);
      detach?.();
    };
  }, [onChange, t]);

  const applySelection = (nextSelection: TextSelection) => {
    selectionRef.current = nextSelection;
    requestAnimationFrame(() => {
      applyTextInputSelection(inputRef, nextSelection);
    });
  };

  const commitDisplay = (nextDisplay: string, nextSelection?: TextSelection) => {
    const body = displayTextToBody(nextDisplay, t);
    lastEmittedRef.current = body;
    setDisplayText(nextDisplay);
    if (nextSelection) {
      applySelection(nextSelection);
    }
    onChange(body);
  };

  const onChangeText = (text: string) => {
    const expandedDelete = normalizeInlineDelete(displayText, text, selectionRef.current, t);
    if (expandedDelete) {
      commitDisplay(expandedDelete.text, expandedDelete.selection);
      return;
    }
    commitDisplay(text);
  };

  const onSelectionChange = (event: TextInputSelectionChangeEvent) => {
    selectionRef.current = event.nativeEvent.selection;
  };

  const resolveInsertSelection = (): TextSelection => {
    if (!hasFocusedRef.current) {
      const end = displayText.length;
      return { start: end, end };
    }
    return selectionRef.current;
  };

  const insertField = (fieldKey: ReplyTemplateFieldKey) => {
    const inserted = insertInlineFieldAt(displayText, resolveInsertSelection(), fieldKey, t);
    commitDisplay(inserted.text, inserted.selection);
    hasFocusedRef.current = true;
    inputRef.current?.focus();
  };

  const removeOccurrence = (occurrence: InlineFieldOccurrence) => {
    const removed = removeInlineFieldSpan(displayText, { start: occurrence.start, end: occurrence.end });
    commitDisplay(removed.text, removed.selection);
  };

  const insertedOccurrences = useMemo(() => listInlineFieldOccurrencesInDisplay(displayText, t), [displayText, t]);
  const occurrenceTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const occurrence of insertedOccurrences) {
      totals.set(occurrence.key, (totals.get(occurrence.key) ?? 0) + 1);
    }
    return totals;
  }, [insertedOccurrences]);
  const showEmptyHint = value.trim().length === 0;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.editor, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
        <TextInput
          ref={inputRef}
          multiline
          value={displayText}
          onChangeText={onChangeText}
          onSelectionChange={onSelectionChange}
          onFocus={() => {
            hasFocusedRef.current = true;
          }}
          placeholder={placeholder}
          {...inputProps}
          style={[styles.input, plainTextStyle, Platform.OS === 'web' ? styles.inputWeb : null]}
          textAlignVertical="top"
        />
      </View>

      {showEmptyHint ? (
        <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('replyTemplateBodyEditor.emptyHint')}</Text>
      ) : null}

      {insertedOccurrences.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.hint, { color: theme.mutedForeground }]}>
            {t('replyTemplateBodyEditor.insertedTagsTitle')}
          </Text>
          <Text style={[styles.hint, { color: theme.mutedForeground }]}>
            {t('replyTemplateBodyEditor.insertedTagsHint')}
          </Text>
          <View style={styles.usedTagRow}>
            {insertedOccurrences.map((occurrence, index) => {
              const fieldLabel = replyTemplateFieldLabel(occurrence.key, t);
              const totalForKey = occurrenceTotals.get(occurrence.key) ?? 1;
              const indexForKey =
                insertedOccurrences.slice(0, index + 1).filter((item) => item.key === occurrence.key).length;
              const labelSuffix =
                totalForKey > 1 ? t('replyTemplateBodyEditor.occurrenceSuffix', { index: indexForKey }) : undefined;
              const removeA11yLabel =
                totalForKey > 1
                  ? t('replyTemplateBodyEditor.removeOccurrenceA11y', { label: fieldLabel, index: indexForKey })
                  : undefined;

              return (
                <ReplyTemplateFieldChip
                  key={`${occurrence.key}-${occurrence.start}`}
                  fieldKey={occurrence.key}
                  compact
                  labelSuffix={labelSuffix}
                  removeA11yLabel={removeA11yLabel}
                  onRemove={() => removeOccurrence(occurrence)}
                />
              );
            })}
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
  inputWeb: {
    outlineStyle: 'none',
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
