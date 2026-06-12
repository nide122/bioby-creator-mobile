import { palette } from '@/constants/tokens';

/**
 * Expo 模板兼容层：供 `Themed`、`Tabs` 与少量页面使用。
 * 语义色以 `constants/tokens.ts` 的 `palette` 为权威来源。
 */
const tintColorLight = palette.light.primary;
const tintColorDark = palette.dark.primary;

export default {
  light: {
    text: palette.light.foreground,
    background: palette.light.background,
    tint: tintColorLight,
    tabIconDefault: palette.light.foregroundEyebrow,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: palette.dark.foreground,
    background: palette.dark.background,
    tint: tintColorDark,
    tabIconDefault: palette.dark.foregroundEyebrow,
    tabIconSelected: tintColorDark,
  },
};
