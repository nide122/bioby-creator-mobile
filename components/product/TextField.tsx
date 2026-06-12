import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';

import { getTextInputProps, getTextInputStyle } from './text-input-style';

type TextFieldProps = TextInputProps;

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { style, placeholderTextColor, multiline, ...props },
  ref
) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const sharedProps = getTextInputProps(theme);

  return (
    <TextInput
      ref={ref}
      multiline={multiline}
      {...sharedProps}
      placeholderTextColor={placeholderTextColor ?? sharedProps.placeholderTextColor}
      style={[getTextInputStyle(theme, { multiline: !!multiline }), style]}
      {...props}
    />
  );
});
