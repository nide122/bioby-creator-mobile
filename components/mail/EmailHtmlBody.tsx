import { createElement, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fontSize, lineHeight, spacing, type ThemePalette } from '@/constants/tokens';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import {
  defaultInlineImageUrlMode,
  extractCidReferences,
  resolveInlineImagesInHtml,
} from '@/src/lib/email-inline-images';
import { emailHtmlBaseCss, emailHtmlImageCss } from '@/src/lib/email-html-images';
import { attachmentMailboxReconnectMessage } from '@/src/lib/email-attachment-errors';
import { EmailHtmlBodyNative } from '@/components/mail/EmailHtmlBodyNative';
import { EmailInlineImageViewer } from '@/components/mail/EmailInlineImageViewer';

const UNSAFE_BLOCK_TAG_RE = /<\s*(script|style|head|title|iframe|object|embed|form|textarea|select|option|noscript)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const UNSAFE_VOID_TAG_RE = /<\s*(script|style|iframe|object|embed|form|input|button|meta|link|base)\b[^>]*\/?\s*>/gi;
const DOCUMENT_SHELL_TAG_RE = /<\/?(?:!doctype|html|head|body)\b[^>]*>/gi;
const EVENT_HANDLER_ATTR_RE = /\s+on[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const STYLE_ATTR_RE = /\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL_ATTR_RE = /\s+(href|src|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi;
const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};
const ALLOWED_EMAIL_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'caption',
  'center',
  'code',
  'div',
  'em',
  'font',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);
const BLOCKED_EMAIL_TAGS = new Set([
  'base',
  'button',
  'embed',
  'form',
  'head',
  'iframe',
  'input',
  'link',
  'math',
  'meta',
  'noscript',
  'object',
  'option',
  'script',
  'select',
  'style',
  'svg',
  'textarea',
  'title',
]);
const GLOBAL_EMAIL_ATTRS = new Set(['aria-label', 'title']);
const EMAIL_TAG_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  table: new Set(['align', 'border', 'cellpadding', 'cellspacing', 'width']),
  td: new Set(['align', 'colspan', 'rowspan', 'valign', 'width']),
  th: new Set(['align', 'colspan', 'rowspan', 'valign', 'width']),
};

function bodyContentFromHtml(rawHtml: string): string {
  const bodyMatch = rawHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1] ?? rawHtml;
}

function sanitizeEmailHtmlFallback(rawHtml: string): string {
  return bodyContentFromHtml(rawHtml)
    .replace(UNSAFE_BLOCK_TAG_RE, '')
    .replace(UNSAFE_VOID_TAG_RE, '')
    .replace(DOCUMENT_SHELL_TAG_RE, '')
    .replace(EVENT_HANDLER_ATTR_RE, '')
    .replace(STYLE_ATTR_RE, '')
    .replace(JAVASCRIPT_URL_ATTR_RE, ' $1="#"')
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (key.startsWith('#')) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return HTML_ENTITY_MAP[key] ?? match;
  });
}

function isSafeEmailUrl(value: string, attrName: string): boolean {
  const normalized = decodeHtmlEntities(value)
    .trim()
    .replace(/[\u0000-\u001F\u007F\s]+/g, '')
    .toLowerCase();
  if (!normalized) return false;
  if (attrName === 'href' && normalized.startsWith('#')) return true;
  if (attrName === 'src' && normalized.startsWith('cid:')) return true;
  if (attrName === 'src' && normalized.startsWith('blob:')) return true;
  if (attrName === 'src' && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(normalized)) return true;

  const colonIndex = normalized.indexOf(':');
  const firstPathIndex = normalized.search(/[/?#]/);
  if (colonIndex === -1 || (firstPathIndex !== -1 && colonIndex > firstPathIndex)) {
    return attrName === 'href';
  }

  if (attrName === 'src') return normalized.startsWith('http:') || normalized.startsWith('https:');
  return (
    normalized.startsWith('http:') ||
    normalized.startsWith('https:') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:')
  );
}

function unwrapElement(element: Element): void {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function sanitizeEmailElement(element: Element): void {
  const tagName = element.tagName.toLowerCase();
  if (BLOCKED_EMAIL_TAGS.has(tagName)) {
    element.remove();
    return;
  }
  if (!ALLOWED_EMAIL_TAGS.has(tagName)) {
    unwrapElement(element);
    return;
  }

  for (const attr of Array.from(element.attributes)) {
    const attrName = attr.name.toLowerCase();
    const allowedForTag = EMAIL_TAG_ATTRS[tagName];
    const isAllowedAttr = GLOBAL_EMAIL_ATTRS.has(attrName) || allowedForTag?.has(attrName);
    const isUrlAttr = attrName === 'href' || attrName === 'src';
    if (
      attrName.startsWith('on') ||
      attrName === 'style' ||
      !isAllowedAttr ||
      (isUrlAttr && !isSafeEmailUrl(attr.value, attrName))
    ) {
      element.removeAttribute(attr.name);
    }
  }

  if (tagName === 'a' && element.getAttribute('href')) {
    element.setAttribute('target', '_blank');
    element.setAttribute('rel', 'noopener noreferrer');
  }
  if (tagName === 'img' && !element.getAttribute('src')) {
    element.remove();
  }
}

export function sanitizeEmailHtml(rawHtml: string): string {
  const bodyHtml = bodyContentFromHtml(rawHtml).trim();
  if (!bodyHtml) return '';
  if (typeof DOMParser === 'undefined') return sanitizeEmailHtmlFallback(bodyHtml);

  const document = new DOMParser().parseFromString(bodyHtml, 'text/html');
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    sanitizeEmailElement(element);
  }
  return document.body.innerHTML.trim();
}

export function htmlToText(rawHtml: string | null | undefined): string {
  if (!rawHtml?.trim()) return '';
  const sanitizedHtml = sanitizeEmailHtml(rawHtml);
  if (!sanitizedHtml) return '';
  return decodeHtmlEntities(
    sanitizedHtml
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|section|article)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function buildEmailHtmlDocument(html: string, theme: ThemePalette): string {
  return `
    <style>
      ${emailHtmlBaseCss(theme)}
      ${emailHtmlImageCss()}
    </style>
    <div class="bioby-email-html">${html}</div>
  `;
}

type EmailHtmlBodyProps = {
  attachments?: EmailAttachment[];
  fallbackText: string;
  html: string;
  messageId?: string;
  mailboxEmailAddress?: string | null;
  theme: ThemePalette;
};

function isUnresolvedCidSrc(src: string): boolean {
  return /^cid:/i.test(src.trim());
}

export function EmailHtmlBody({
  attachments = [],
  fallbackText,
  html,
  messageId,
  mailboxEmailAddress,
  theme,
}: EmailHtmlBodyProps) {
  const { t } = useTranslation();
  const sanitizedHtml = useMemo(() => sanitizeEmailHtml(html), [html]);
  const [resolvedHtml, setResolvedHtml] = useState(sanitizedHtml);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [inlineMailboxConnectionFailed, setInlineMailboxConnectionFailed] = useState(false);
  const webBodyRef = useRef<HTMLDivElement | null>(null);

  const closePreview = useCallback(() => {
    setPreviewSrc(null);
    setPreviewError(null);
  }, []);

  const handleImagePress = useCallback(
    (src: string) => {
      if (isUnresolvedCidSrc(src) && inlineMailboxConnectionFailed) {
        setPreviewSrc(null);
        setPreviewError(attachmentMailboxReconnectMessage(t, 'preview', mailboxEmailAddress));
        return;
      }
      if (isUnresolvedCidSrc(src)) {
        return;
      }
      setPreviewError(null);
      setPreviewSrc(src);
    },
    [inlineMailboxConnectionFailed, mailboxEmailAddress, t],
  );

  useEffect(() => {
    closePreview();
  }, [closePreview, sanitizedHtml]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = webBodyRef.current;
    if (!container) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      const src = target.currentSrc || target.src;
      if (!src) return;
      event.preventDefault();
      handleImagePress(src);
    };

    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [handleImagePress, resolvedHtml]);

  useEffect(() => {
    setResolvedHtml(sanitizedHtml);
    setInlineMailboxConnectionFailed(false);
    if (!sanitizedHtml || !messageId) {
      return;
    }
    if (extractCidReferences(sanitizedHtml).length === 0) {
      return;
    }

    let cancelled = false;
    let objectUrls: string[] = [];
    const urlMode = defaultInlineImageUrlMode();

    void resolveInlineImagesInHtml(sanitizedHtml, messageId, attachments, urlMode).then((result) => {
      if (cancelled) {
        for (const url of result.objectUrls) {
          URL.revokeObjectURL(url);
        }
        return;
      }
      objectUrls = result.objectUrls;
      setInlineMailboxConnectionFailed(result.mailboxConnectionFailed);
      setResolvedHtml(result.html);
    });

    return () => {
      cancelled = true;
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [attachments, messageId, sanitizedHtml]);

  if (!resolvedHtml) {
    return <Text style={[styles.body, { color: theme.foreground }]}>{fallbackText}</Text>;
  }

  const bodyContent =
    Platform.OS !== 'web' ? (
      <EmailHtmlBodyNative html={resolvedHtml} onImagePress={handleImagePress} theme={theme} />
    ) : (
      createElement('div', {
        ref: (node: HTMLDivElement | null) => {
          webBodyRef.current = node;
        },
        style: {
          color: theme.foreground,
          fontSize: fontSize.body,
          lineHeight: `${lineHeight.bodyRelaxed}px`,
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        } satisfies CSSProperties,
        dangerouslySetInnerHTML: {
          __html: buildEmailHtmlDocument(resolvedHtml, theme),
        },
      })
    );

  return (
    <View style={styles.wrap}>
      {bodyContent}
      <EmailInlineImageViewer
        src={previewSrc}
        error={previewError}
        onClose={closePreview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  wrap: { gap: spacing.sm, width: '100%' },
});
