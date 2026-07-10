import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { QueryRetryCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchEmailMessage } from '@/src/api/mailbox-api';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import { fetchOpportunityThreadDetail } from '@/src/api/opportunities-api';
import { ApiError } from '@/src/api/api-client';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import { isBriefConfirmed } from '@/src/lib/brief-confirm-eligibility';
import { resolveAttachmentParseErrorMessage } from '@/src/lib/email-attachment-errors';
import { contractSummaryErrorMessage } from '@/src/lib/contract-summary-error';
import { useContractSummaryEditor } from '@/src/hooks/use-contract-summary-editor';
import { EmailAttachmentsList } from '@/components/mail/EmailAttachmentsList';
import { dedupeVisibleAttachments } from '@/components/mail/email-attachment-utils';
import { EmailHtmlBody, htmlToText } from '@/components/mail/EmailHtmlBody';
import { invalidateTenantScopedQueries, useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { stripQuotedEmailContent, stripQuotedPlainText } from '@/src/lib/email-body';
import { useReturnToBackNavigation } from '@/src/lib/use-return-to-back-navigation';

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

  const remoteQuery = useQuery({
    queryKey: mailboxMessageKey,
    queryFn: () => fetchEmailMessage(messageId as string),
    enabled: canFetchRemote && tenantQueryEnabled,
    staleTime: 0,
  });

  const resolvedThreadId = threadId ?? remoteQuery.data?.opportunityId ?? undefined;
  const inboxThreadKey = useTenantQueryKey('inbox', 'thread', resolvedThreadId, { api: apiMode });

  const syncedReadRef = useRef<string | null>(null);

  const threadDetailQuery = useQuery({
    queryKey: inboxThreadKey,
    queryFn: () => fetchOpportunityThreadDetail(resolvedThreadId as string),
    enabled: canFetchRemote && !!resolvedThreadId && tenantQueryEnabled,
  });

  const contractForMessage =
    threadDetailQuery.data?.contractSummary?.emailMessageId === messageId
      ? (threadDetailQuery.data?.contractSummary ?? null)
      : null;
  const contractSaveAllowed = threadDetailQuery.data
    ? isBriefConfirmed(threadDetailQuery.data)
    : false;
  const alertContractSaveBlocked = () => {
    void alertAction(t('contractSummary.title'), t('contractSummary.saveContractBlockedHint'));
  };

  const contractEditor = useContractSummaryEditor({
    opportunityId: resolvedThreadId,
    saved: contractForMessage,
    emailMessageId: messageId,
    emailQueryKey: mailboxMessageKey,
    queryClient,
    threadQueryKey: inboxThreadKey,
  });

  const summarizePdfAttachment = async (attachment: EmailAttachment) => {
    if (!resolvedThreadId || !messageId) {
      void alertAction(t('contractSummary.title'), t('contractSummary.missingThread'));
      return;
    }
    try {
      await contractEditor.parseFromAttachment(messageId, attachment.id);
    } catch (error) {
      void alertAction(
        t('contractSummary.title'),
        resolveAttachmentParseErrorMessage(t, remoteQuery.data?.mailboxEmailAddress, error),
      );
    }
  };

  const saveContractSummary = async (attachmentId: string) => {
    if (!contractSaveAllowed) {
      alertContractSaveBlocked();
      return;
    }
    try {
      await contractEditor.saveDraft(attachmentId);
    } catch (error) {
      void alertAction(t('contractSummary.title'), contractSummaryErrorMessage(error, t));
    }
  };
  const saveDocumentSummary = async (attachmentId: string) => {
    if (!messageId) return;
    try {
      await contractEditor.saveDocumentDraft(messageId, attachmentId);
    } catch (error) {
      void alertAction(t('contractSummary.title'), contractSummaryErrorMessage(error, t));
    }
  };
  const deleteDocumentSummary = async (attachmentId: string) => {
    if (!messageId || !attachmentId) return;
    const ok = await confirmAction({
      title: t('contractSummary.deleteConfirmTitle'),
      message: t('contractSummary.deleteDocumentConfirmMessage'),
      confirmLabel: t('contractSummary.deleteConfirmAction'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await contractEditor.deleteSavedDocument(messageId, attachmentId);
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
  const deleteContractSummary = async () => {
    const ok = await confirmAction({
      title: t('contractSummary.deleteConfirmTitle'),
      message: t('contractSummary.deleteContractConfirmMessage'),
      confirmLabel: t('contractSummary.deleteConfirmAction'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await contractEditor.deleteSavedContract();
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
    const visibleAttachments = dedupeVisibleAttachments(email.attachments ?? []);
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
          {visibleAttachments.length > 0 ? (
            <EmailAttachmentsList
              messageId={email.id}
              attachments={visibleAttachments}
              mailboxEmailAddress={email.mailboxEmailAddress}
              onSummarizePdf={resolvedThreadId ? summarizePdfAttachment : undefined}
              summaryHandlers={
                resolvedThreadId
                  ? {
                      documentSummaries: email.documentSummaries ?? [],
                      contractSummary: contractSaveAllowed ? contractForMessage : null,
                      contractSaveAllowed,
                      onContractSaveBlocked: alertContractSaveBlocked,
                      attachmentDrafts: contractEditor.attachmentDrafts,
                      isAttachmentParsing: contractEditor.isAttachmentParsing,
                      deleting: contractEditor.deleting,
                      saving: contractEditor.saving,
                      savingTarget: contractEditor.savingTarget,
                      isAttachmentDraftUnsaved: contractEditor.isAttachmentDraftUnsaved,
                      onDraftChange: contractEditor.patchAttachmentDraft,
                      onSaveDocument: (attachmentId) => void saveDocumentSummary(attachmentId),
                      onSaveContract: (attachmentId) => void saveContractSummary(attachmentId),
                      onCancelDraft: (attachmentId) => contractEditor.cancelDraft(attachmentId),
                      onDeleteDocument: (attachmentId) => void deleteDocumentSummary(attachmentId),
                      onDeleteContract: () => void deleteContractSummary(),
                    }
                  : undefined
              }
            />
          ) : null}
          {htmlBody ? (
            <EmailHtmlBody
              attachments={email.attachments ?? []}
              fallbackText={body}
              html={htmlBody}
              messageId={email.id}
              mailboxEmailAddress={email.mailboxEmailAddress}
              theme={theme}
            />
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
