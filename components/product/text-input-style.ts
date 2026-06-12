import { Platform, type TextInputProps, type TextStyle } from 'react-native';

import { fontSize, layout, lineHeight, radii, spacing, type ThemePalette } from '@/constants/tokens';

type TextInputStyleOptions = {
  borderColor?: string;
  minHeight?: number;
  multiline?: boolean;
};

export function getTextInputStyle(
  theme: ThemePalette,
  { borderColor = theme.input, minHeight, multiline = false }: TextInputStyleOptions = {},
): TextStyle {
  /** 与 `TextField` 一致：避免与 `SectionCard`（`theme.card`）糊成一片；Android 上 hairline 边框常过细。 */
  const baseStyle: TextStyle = {
    borderWidth: 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    borderColor,
    color: theme.foreground,
    backgroundColor: theme.inputBackground,
    fontFamily: Platform.select({ android: 'sans-serif', default: undefined }),
    fontWeight: '400',
    includeFontPadding: false,
  };

  if (multiline) {
    return {
      ...baseStyle,
      minHeight: minHeight ?? 96,
      lineHeight: lineHeight.body,
      textAlignVertical: 'top',
    };
  }

  return {
    ...baseStyle,
    minHeight: minHeight ?? layout.touchMin - 4,
    textAlignVertical: 'center',
  };
}

export function getTextInputProps(theme: ThemePalette): Pick<
  TextInputProps,
  'cursorColor' | 'maxFontSizeMultiplier' | 'placeholderTextColor' | 'selectionColor' | 'underlineColorAndroid'
> {
  return {
    cursorColor: theme.primary,
    maxFontSizeMultiplier: 1.2,
    placeholderTextColor: theme.inputPlaceholder,
    selectionColor: `${theme.primary}55`,
    underlineColorAndroid: 'transparent',
  };
}
