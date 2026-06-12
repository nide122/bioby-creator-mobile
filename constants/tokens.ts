/**
 * Bioby Creator design tokens.
 * The app shell follows the welcome campaign language: graphite surfaces,
 * creator-economy signal colors, and quiet premium contrast.
 */

import { Platform, type ViewStyle } from 'react-native';

/** Creator app default: graphite UI, even when the OS is in light mode. */
export const paletteLight = {
  background: '#050706',
  foreground: '#FFFFFF',
  card: '#0A100D',
  secondary: '#101713',
  muted: '#111816',
  mutedForeground: '#A3AAB5',
  foregroundSubtitle: '#D7DCE2',
  foregroundEyebrow: '#737A84',
  /** 通用框线：低亮度屏幕下仍需能看清卡片边界。 */
  border: 'rgba(255,255,255,0.24)',
  /** 重点卡片外框：用于首页等需要明确分区的容器。 */
  outline: 'rgba(255,255,255,0.34)',
  /** 输入框描边：需明显高于卡片与 `inputBackground`，避免「糊成一片」。 */
  input: 'rgba(255,255,255,0.42)',
  /** 输入区内底：介于 `card` 与正文之间，和卡片背景拉开层次。 */
  inputBackground: '#17231E',
  /** 占位符：比 `foregroundEyebrow` 略亮，深色底上更易扫读。 */
  inputPlaceholder: 'rgba(215,220,226,0.55)',
  primary: '#5FD9FF',
  primaryHover: '#89E4FF',
  primaryForeground: '#050706',
  surfaceFooter: '#080C0A',
  accentMintSoft: '#10251D',
  accentMintStrong: '#A7F3D0',
  brandGlow: '#F086FF',
} as const;

/** Dark mode keeps the same premium shell with slightly stronger contrast. */
export const paletteDark = {
  background: '#050706',
  foreground: '#FAFAF9',
  card: '#0A100D',
  secondary: '#111816',
  muted: '#121A17',
  mutedForeground: '#A3AAB5',
  foregroundSubtitle: '#D7DCE2',
  foregroundEyebrow: '#737A84',
  border: 'rgba(255,255,255,0.28)',
  outline: 'rgba(255,255,255,0.38)',
  input: 'rgba(255,255,255,0.48)',
  inputBackground: '#1A2822',
  inputPlaceholder: 'rgba(215,220,226,0.58)',
  primary: '#5FD9FF',
  primaryHover: '#89E4FF',
  primaryForeground: '#050706',
  surfaceFooter: '#080C0A',
  accentMintSoft: '#10251D',
  accentMintStrong: '#A7F3D0',
  brandGlow: '#F086FF',
} as const;

export const palette = {
  light: paletteLight,
  dark: paletteDark,
} as const;

export type ThemePalette = typeof paletteLight | typeof paletteDark;

/** Quiet glow for cards; enough separation without looking gamified. */
export const elevation: { surface: ViewStyle } = {
  surface: {
    ...Platform.select<ViewStyle>({
      web: { boxShadow: '0px 18px 42px rgba(95, 217, 255, 0.07)' },
      default: {
        shadowColor: '#5FD9FF',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.06,
        shadowRadius: 34,
        elevation: 4,
      },
    }),
  },
};

/** 布局：控制台竖向节奏与水平边距 16 → 24 → 32 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** `--section-y` 默认 32 */
  sectionY: 32,
  /** 按钮组 horizontal / vertical gap */
  buttonGroup: 12,
} as const;

/** Larger radii make the mobile product feel closer to consumer creator tools. */
export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
} as const;

/** 字号：基准 14px；眉题极小全大写场景用 `eyebrow` */
export const fontSize = {
  eyebrow: 11,
  caption: 12,
  bodySmall: 13,
  body: 14,
  lead: 15,
  cardTitle: 18,
  sectionTitle: 21,
  screenTitle: 32,
} as const;

export const lineHeight = {
  body: 22,
  bodyRelaxed: 24,
  lead: 24,
  tight: 1.25,
} as const;

/** 触控与动效（产品体验：可预期、跟手） */
export const layout = {
  touchMin: 44,
  /** Bottom tabs on web need an explicit height; RN Web clips icons when padding stacks on the default bar. */
  tabBarHeight: Platform.OS === 'web' ? 72 : 49,
  /** Extra scroll padding so primary actions clear the fixed tab bar on web. */
  tabBarScrollInset: Platform.OS === 'web' ? 88 : 56,
  /** Shared horizontal inset for main tab screens */
  tabScreenPaddingX: 24,
  tabScreenPaddingTop: 24,
  tabScreenSectionGap: 16,
  /** `--duration-product` 量级 */
  durationFast: 120,
  durationNormal: 180,
} as const;
