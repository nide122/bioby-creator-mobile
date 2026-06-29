import type { ThemePalette } from '@/constants/tokens';

type Props = {
  html: string;
  onImagePress?: (src: string) => void;
  theme: ThemePalette;
};

/** Web uses EmailHtmlBody's DOM renderer; this module exists only to avoid bundling react-native-webview. */
export function buildEmailHtmlPage(_html: string, _theme: ThemePalette): string {
  return '';
}

export function EmailHtmlBodyNative(_props: Props) {
  return null;
}
