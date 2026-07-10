/**
 * Bioby Creator design tokens.
 * Corporate-clean palette: professional blue / gray / white surfaces.
 */

import { Platform, type ViewStyle } from 'react-native';

/** Corporate-clean light palette (web-first professional blue / gray / white). */
export const paletteLight = {
  background: '#f8fafc',
  foreground: '#111827',
  card: '#ffffff',
  secondary: '#f1f5f9',
  muted: '#e2e8f0',
  mutedForeground: '#64748b',
  foregroundSubtitle: '#475569',
  foregroundEyebrow: '#64748b',
  border: '#e2e8f0',
  outline: '#cbd5e1',
  input: '#94a3b8',
  inputBackground: '#ffffff',
  inputPlaceholder: 'rgba(100, 116, 139, 0.55)',
  primary: '#2563eb',
  primaryHover: '#3b82f6',
  primaryForeground: '#ffffff',
  surfaceFooter: '#f8fafc',
  accentMintSoft: '#dbeafe',
  accentMintStrong: '#1d4ed8',
  brandGlow: '#3b82f6',
} as const;

/** Corporate-clean dark palette — same family, higher contrast for dark mode. */
export const paletteDark = {
  background: '#0f172a',
  foreground: '#f8fafc',
  card: '#1e293b',
  secondary: '#334155',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  foregroundSubtitle: '#cbd5e1',
  foregroundEyebrow: '#94a3b8',
  border: 'rgba(148, 163, 184, 0.28)',
  outline: 'rgba(148, 163, 184, 0.38)',
  input: 'rgba(148, 163, 184, 0.48)',
  inputBackground: '#1e293b',
  inputPlaceholder: 'rgba(148, 163, 184, 0.58)',
  primary: '#3b82f6',
  primaryHover: '#60a5fa',
  primaryForeground: '#ffffff',
  surfaceFooter: '#0f172a',
  accentMintSoft: '#1e3a5f',
  accentMintStrong: '#93c5fd',
  brandGlow: '#60a5fa',
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
      web: { boxShadow: '0px 4px 24px rgba(30, 64, 175, 0.08)' },
      default: {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 3,
      },
    }),
  },
};

/** 布局：控制台竖向节奏与水平边距 16 → 24 → 32 */
export const spacing = {
  xxs: 2,
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
  pill: 999,
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
  bodySmall: 18,
  bodyRelaxed: 24,
  lead: 24,
  caption: 16,
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
