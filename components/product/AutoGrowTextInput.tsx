import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
  type TextInputProps,
} from 'react-native';

import { lineHeight } from '@/constants/tokens';

type Props = TextInputProps & {
  minLines?: number;
};

function lineCount(text: string | undefined): number {
  if (!text?.length) return 1;
  return text.split('\n').length;
}

export function AutoGrowTextInput({
  value,
  style,
  minLines,
  onContentSizeChange,
  onChangeText,
  ...rest
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const resolvedMinLines = minLines ?? lineCount(typeof value === 'string' ? value : undefined);
  const minHeight = resolvedMinLines * lineHeight.body;
  const [height, setHeight] = useState(minHeight);

  const syncWebHeight = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const node = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!node) return;
    node.style.overflow = 'hidden';
    node.style.resize = 'none';
    node.style.height = '0px';
    node.style.height = `${Math.max(minHeight, node.scrollHeight)}px`;
  }, [minHeight]);

  useEffect(() => {
    syncWebHeight();
  }, [value, minHeight, syncWebHeight]);

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      if (Platform.OS !== 'web') {
        setHeight(Math.max(minHeight, event.nativeEvent.contentSize.height));
      }
      onContentSizeChange?.(event);
    },
    [minHeight, onContentSizeChange],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText?.(text);
      if (Platform.OS === 'web') {
        requestAnimationFrame(syncWebHeight);
      }
    },
    [onChangeText, syncWebHeight],
  );

  return (
    <TextInput
      ref={inputRef}
      multiline
      scrollEnabled={false}
      value={value}
      onChangeText={handleChangeText}
      onContentSizeChange={handleContentSizeChange}
      style={[
        style,
        Platform.OS === 'web'
          ? ({
              overflow: 'hidden',
              resize: 'none',
              minHeight,
              width: '100%',
            } as const)
          : { height: Math.max(minHeight, height) },
      ]}
      {...rest}
    />
  );
}
