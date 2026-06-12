import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * `Link` + `asChild` on web merges props onto `<a>`; RN style arrays / registered
 * styles can surface as invalid DOM style assignments. Flatten on web; optionally
 * strip `pointerEvents` if it lands in a flattened style object.
 */
export function webSafePressableStyle(style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  if (style == null) return style;
  if (Platform.OS !== 'web') return style;
  const flat = StyleSheet.flatten(style) as ViewStyle;
  if (!flat) return undefined;
  const { pointerEvents: _p, ...rest } = flat as ViewStyle & { pointerEvents?: unknown };
  return rest;
}
