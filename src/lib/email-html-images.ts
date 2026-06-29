import { fontSize, lineHeight, radii, spacing, type ThemePalette } from '@/constants/tokens';

const IMG_TAG_RE = /<img\b/gi;

export function countEmailHtmlImages(html: string): number {
  if (!html.trim()) return 0;
  return html.match(IMG_TAG_RE)?.length ?? 0;
}

export function emailHtmlImageCss(): string {
  return `
    .bioby-email-html img {
      border-radius: ${radii.sm}px;
      cursor: zoom-in;
      display: block;
      height: auto;
      margin: ${spacing.sm}px 0;
      max-height: 240px;
      max-width: 100%;
      object-fit: contain;
      width: auto;
    }
  `;
}

export function emailHtmlBaseCss(theme: ThemePalette): string {
  return `
    .bioby-email-html {
      box-sizing: border-box;
      color: ${theme.foreground};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: ${fontSize.body}px;
      line-height: ${lineHeight.bodyRelaxed}px;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .bioby-email-html * {
      box-sizing: border-box;
      max-width: 100%;
    }
    .bioby-email-html p,
    .bioby-email-html ul,
    .bioby-email-html ol,
    .bioby-email-html blockquote {
      margin: 0 0 ${spacing.md}px;
    }
    .bioby-email-html h1,
    .bioby-email-html h2,
    .bioby-email-html h3 {
      color: ${theme.foreground};
      line-height: 1.28;
      margin: ${spacing.md}px 0 ${spacing.sm}px;
    }
    .bioby-email-html a {
      color: ${theme.primary};
      font-weight: 700;
      text-decoration: underline;
    }
    .bioby-email-html table {
      border-collapse: collapse;
      color: ${theme.foreground};
      max-width: 100%;
      table-layout: auto;
      width: auto !important;
    }
    .bioby-email-html td,
    .bioby-email-html th {
      border-color: ${theme.border};
      color: ${theme.foreground};
      padding: ${spacing.xs}px ${spacing.sm}px;
      vertical-align: top;
    }
    .bioby-email-html pre,
    .bioby-email-html code {
      background: ${theme.secondary};
      border-radius: ${radii.sm}px;
      color: ${theme.foreground};
      white-space: pre-wrap;
    }
    .bioby-email-html blockquote {
      border-left: 3px solid ${theme.primary};
      color: ${theme.foregroundSubtitle};
      padding-left: ${spacing.md}px;
    }
  `;
}
