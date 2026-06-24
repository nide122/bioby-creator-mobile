import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createElement, type CSSProperties, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { QueryRetryCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchEmailMessage } from '@/src/api/mailbox-api';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import { fetchOpportunityThreadDetail } from '@/src/api/opportunities-api';
import { ApiError } from '@/src/api/api-client';
import { alertAction } from '@/src/lib/app-dialog';
import { ContractSummaryCard } from '@/components/deals/ContractSummaryCard';
import { useContractSummaryEditor } from '@/src/hooks/use-contract-summary-editor';
import { EmailAttachmentsList } from '@/components/mail/EmailAttachmentsList';
import { invalidateTenantScopedQueries, useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { stripQuotedEmailContent, stripQuotedPlainText } from '@/src/lib/email-body';
import { useReturnToBackNavigation } from '@/src/lib/use-return-to-back-navigation';

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

function isSafeEmailUrl(value: string, attrName: string): boolean {
  const normalized = decodeHtmlEntities(value)
    .trim()
    .replace(/[\u0000-\u001F\u007F\s]+/g, '')
    .toLowerCase();
  if (!normalized) return false;
  if (attrName === 'href' && normalized.startsWith('#')) return true;
  if (attrName === 'src' && normalized.startsWith('cid:')) return true;
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

function sanitizeEmailHtml(rawHtml: string): string {
  const bodyHtml = bodyContentFromHtml(rawHtml).trim();
  if (!bodyHtml) return '';
  if (typeof DOMParser === 'undefined') return sanitizeEmailHtmlFallback(bodyHtml);

  const document = new DOMParser().parseFromString(bodyHtml, 'text/html');
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    sanitizeEmailElement(element);
  }
  return document.body.innerHTML.trim();
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

function htmlToText(rawHtml: string | null | undefined): string {
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
      .bioby-email-html {
        box-sizing: border-box;
        color: ${theme.foreground};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: ${fontSize.body}px;
        line-height: ${lineHeight.bodyRelaxed}px;
        max-width: 100%;
        overflow-x: auto;
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
      .bioby-email-html img {
        border-radius: ${radii.sm}px;
        display: block;
        height: auto;
        margin: ${spacing.sm}px 0;
        max-width: 100%;
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
    </style>
    <div class="bioby-email-html">${html}</div>
  `;
}

function EmailHtmlBody({
  fallbackText,
  html,
  theme,
}: {
  fallbackText: string;
  html: string;
  theme: ThemePalette;
}) {
  const sanitizedHtml = sanitizeEmailHtml(html);

  if (Platform.OS !== 'web' || !sanitizedHtml) {
    return <Text style={[styles.body, { color: theme.foreground }]}>{fallbackText}</Text>;
  }

  const webHtmlBodyStyle: CSSProperties = {
    color: theme.foreground,
    fontSize: fontSize.body,
    lineHeight: `${lineHeight.bodyRelaxed}px`,
    maxWidth: '100%',
    overflowWrap: 'anywhere',
  };

  return createElement('div', {
    style: webHtmlBodyStyle,
    dangerouslySetInnerHTML: { __html: buildEmailHtmlDocument(sanitizedHtml, theme) },
  });
}

function formatWhen(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InboxMessageDetailScreen() {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const dateLocale = calendarLocaleTagForLanguage(i18n.language);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    messageId?: string | string[];
    threadId?: string | string[];
    returnTo?: string | string[];
    parentReturnTo?: string | string[];
    directReturn?: string | string[];
  }>();
  const messageId = Array.isArray(params.messageId) ? params.messageId[0] : params.messageId;
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const parentReturnTo = Array.isArray(params.parentReturnTo) ? params.parentReturnTo[0] : params.parentReturnTo;
  const directReturn = (Array.isArray(params.directReturn) ? params.directReturn[0] : params.directReturn) === '1';
  useReturnToBackNavigation(directReturn ? returnTo : null, directReturn ? parentReturnTo : null);
  const apiMode = shouldUseBackendApi();
  const canFetchRemote = apiMode && !!messageId && /^\d+$/.test(messageId);
  const tenantQueryEnabled = useTenantScopedQueryEnabled();
  const mailboxMessageKey = useTenantQueryKey('mailbox', 'message', messageId);
  const inboxThreadKey = useTenantQueryKey('inbox', 'thread', threadId, { api: apiMode });

  const remoteQuery = useQuery({
    queryKey: mailboxMessageKey,
    queryFn: () => fetchEmailMessage(messageId as string),
    enabled: canFetchRemote && tenantQueryEnabled,
    staleTime: 0,
  });

  const syncedReadRef = useRef<string | null>(null);
  const [summarizingAttachmentId, setSummarizingAttachmentId] = useState<string | null>(null);

  const threadDetailQuery = useQuery({
    queryKey: inboxThreadKey,
    queryFn: () => fetchOpportunityThreadDetail(threadId as string),
    enabled: canFetchRemote && !!threadId && tenantQueryEnabled,
  });

  const contractForMessage =
    threadDetailQuery.data?.contractSummary?.emailMessageId === messageId
      ? threadDetailQuery.data.contractSummary
      : null;

  const contractEditor = useContractSummaryEditor({
    opportunityId: threadId,
    saved: contractForMessage,
    emailMessageId: messageId,
    emailQueryKey: mailboxMessageKey,
    queryClient,
    threadQueryKey: inboxThreadKey,
  });

  const summarizePdfAttachment = async (attachment: EmailAttachment) => {
    if (!threadId || !messageId) {
      void alertAction(t('contractSummary.title'), t('contractSummary.missingThread'));
      return;
    }
    setSummarizingAttachmentId(attachment.id);
    try {
      await contractEditor.parseFromAttachment(messageId, attachment.id);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('contractSummary.failed');
      void alertAction(t('contractSummary.title'), message);
    } finally {
      setSummarizingAttachmentId(null);
    }
  };

  const saveContractSummary = async () => {
    try {
      await contractEditor.saveDraft();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('contractSummary.failed');
      void alertAction(t('contractSummary.title'), message);
    }
  };
  const saveDocumentSummary = async () => {
    if (!messageId) return;
    try {
      await contractEditor.saveDocumentDraft(messageId);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('contractSummary.failed');
      void alertAction(t('contractSummary.title'), message);
    }
  };
  useEffect(() => {
    if (!canFetchRemote || !remoteQuery.isSuccess || !remoteQuery.data || !messageId) return;
    if (remoteQuery.data.direction === 'outbound') return;
    if (syncedReadRef.current === messageId) return;
    syncedReadRef.current = messageId;
    void invalidateTenantScopedQueries(queryClient);
  }, [canFetchRemote, messageId, queryClient, remoteQuery.data, remoteQuery.isSuccess]);

  const threadQuery = useQuery({
    queryKey: inboxThreadKey,
    queryFn: () => fetchOpportunityThreadDetail(threadId as string),
    enabled: !canFetchRemote && !!threadId && tenantQueryEnabled,
  });

  if (!messageId) {
    return (
      <PlaceholderScreen
        title={t('inboxMessageDetail.missingTitle')}
        description={t('inboxMessageDetail.missingDesc')}
      />
    );
  }

  if (canFetchRemote) {
    if (remoteQuery.isPending) {
      return (
        <View style={[styles.centered, { backgroundColor: theme.background }]}>
          <ActivityIndicator accessibilityLabel={t('inboxMessageDetail.loadingA11y')} color={theme.primary} />
        </View>
      );
    }
    if (remoteQuery.error || !remoteQuery.data) {
      return (
        <PlaceholderScreen title={t('inboxMessageDetail.errorTitle')} description={t('inboxMessageDetail.errorDesc')}>
          <QueryRetryCard
            message={remoteQuery.error?.message ?? t('inboxMessageDetail.noData')}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['mailbox', 'message', messageId] })}
          />
        </PlaceholderScreen>
      );
    }
    const email = remoteQuery.data;
    const savedDocument = email.documentSummary ?? null;
    const showDraftCard =
      !!contractEditor.draft ||
      contractEditor.parsing ||
      !!summarizingAttachmentId ||
      contractEditor.unsaved;
    const rawHtml = email.bodyHtml?.trim();
    const stripped = stripQuotedEmailContent(email.bodyText, rawHtml);
    const htmlBody = stripped.html ?? undefined;
    const body =
      stripped.text ||
      htmlToText(htmlBody) ||
      email.snippet?.trim() ||
      t('inboxMessageDetail.emptyBody');
    const when = formatWhen(email.receivedAtISO ?? email.sentAtISO, dateLocale);
    const senderLabel =
      email.fromLabel ??
      (email.direction === 'outbound' ? t('inboxThreadDetail.youLabel') : email.fromAddress);
    return (
      <ScrollView
        testID="screen-inbox-message-detail"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.subject, { color: theme.foreground }]}>{email.subject || t('inboxMessageDetail.noSubject')}</Text>
          <Text style={[styles.meta, { color: theme.foregroundEyebrow }]}>
            {senderLabel}
            {when ? ` · ${when}` : ''}
          </Text>
          {email.attachments && email.attachments.length > 0 ? (
            <EmailAttachmentsList
              messageId={email.id}
              attachments={email.attachments}
              onSummarizePdf={threadId ? summarizePdfAttachment : undefined}
              summarizingAttachmentId={summarizingAttachmentId}
            />
          ) : null}
          {savedDocument && !showDraftCard ? (
            <View style={{ marginTop: spacing.sm }}>
              <ContractSummaryCard summary={savedDocument} editable={false} headerStyle="attachmentFilename" />
            </View>
          ) : null}
          {contractForMessage && !showDraftCard ? (
            <View style={{ marginTop: spacing.sm }}>
              <ContractSummaryCard summary={contractForMessage} editable={false} headerStyle="attachmentFilename" />
            </View>
          ) : null}
          {showDraftCard ? (
            <View style={{ marginTop: spacing.sm }}>
              <ContractSummaryCard
                summary={contractEditor.displayed}
                loading={contractEditor.parsing || !!summarizingAttachmentId}
                saving={contractEditor.saving}
                savingTarget={contractEditor.savingTarget}
                unsaved={contractEditor.unsaved}
                editable={!!contractEditor.displayed && contractEditor.displayed.status !== 'FAILED'}
                saveLayout="email"
                headerStyle="attachmentFilename"
                onChange={contractEditor.patchDraft}
                onSaveDocument={() => void saveDocumentSummary()}
                onSaveContract={() => void saveContractSummary()}
                onCancel={contractEditor.cancelDraft}
              />
            </View>
          ) : null}
          {htmlBody ? (
            <EmailHtmlBody fallbackText={body} html={htmlBody} theme={theme} />
          ) : (
            <Text style={[styles.body, { color: theme.foreground }]}>{body}</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  if (threadQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('inboxMessageDetail.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  const fallback = threadQuery.data?.messages.find((m) => m.id === messageId);
  if (!fallback) {
    return (
      <PlaceholderScreen title={t('inboxMessageDetail.errorTitle')} description={t('inboxMessageDetail.errorDesc')} />
    );
  }

  return (
    <ScrollView
      testID="screen-inbox-message-detail"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.subject, { color: theme.foreground }]}>
          {fallback.subject || threadQuery.data?.subject || t('inboxMessageDetail.noSubject')}
        </Text>
        <Text style={[styles.meta, { color: theme.foregroundEyebrow }]}>
          {(fallback.direction === 'outbound' ? t('inboxThreadDetail.youLabel') : fallback.fromLabel)} · {formatWhen(fallback.sentAtISO, dateLocale)}
        </Text>
        <Text style={[styles.body, { color: theme.foreground }]}>
          {stripQuotedPlainText(fallback.snippet) || fallback.snippet}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.md,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  subject: { fontSize: fontSize.sectionTitle, fontWeight: '800', lineHeight: 28 },
  meta: { fontSize: fontSize.caption, fontWeight: '600' },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
});
