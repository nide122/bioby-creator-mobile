import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  getTextInputProps,
  getTextInputStyle,
  HubLinkGroup,
  HubScreen,
  QueryRetryCard,
  SectionCard,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { DraftOpportunityBrief } from '@/components/drafts/DraftOpportunityBrief';
import { CollapsibleThread } from '@/components/inbox/CollapsibleThread';
import { InboundMessagePreview, pickLatestInboundMessage } from '@/components/inbox/InboundMessagePreview';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { getMockInboxThreadBrandHint } from '@/src/api/mock-inbox';
import {
  sendNativeMailboxDraft,
  syncDraftToNativeMailbox,
  type GeneratedReplyDraft,
  type RemoteDraftSyncResult,
} from '@/src/api/drafts-api';
import { syncMailbox } from '@/src/api/mailbox-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { alertAction } from '@/src/lib/app-dialog';
import { useDraftDetail } from '@/src/hooks/use-drafts';
import { useOpenProposal } from '@/src/hooks/use-open-proposal';
import { useMailboxConnection } from '@/src/hooks/use-mailbox-connection';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useRateCardPackages } from '@/src/hooks/use-growth';
import { buildReplyTemplateContext } from '@/src/lib/reply-template-context';
import { inboxMessageHref, inboxThreadHref } from '@/src/lib/open-brand-detail';
import { cooperationLeadLine, resolveOpportunityBrandLabel } from '@/src/lib/cooperation-display-name';
import {
  mailboxDraftFlowReady,
  mailboxSendFlowReady,
  normalizeMailboxDraftProviderError,
  resolveMailboxDraftError,
} from '@/src/lib/mailbox-draft-i18n';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { invalidateDecisionQueueQueries } from '@/src/lib/invalidate-deal-queries';
import { ReplyDraftGeneratorSheet } from '@/components/drafts/ReplyDraftGeneratorSheet';
import { ReplyTemplatePicker } from '@/src/components/reply-templates/ReplyTemplatePicker';
import { renderReplyTemplateForSend } from '@/src/lib/reply-template-render';
import type { RenderReplyTemplateInput } from '@/src/types/reply-template';
import type { InboxMessage } from '@/src/types/domain';
import { useSessionStore } from '@/src/stores/session-store';

export default function DraftDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[]; threadId?: string | string[] }>();
  const rawId = params.id;
  const rawThread = params.threadId;
  const draftId = Array.isArray(rawId) ? rawId[0] : rawId;
  const threadIdParam = Array.isArray(rawThread) ? rawThread[0] : rawThread;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const query = useDraftDetail(draftId);
  const { openProposalDraftById } = useOpenProposal();
  const effectiveThreadId = threadIdParam ?? query.data?.sourceThreadId;
  const threadQuery = useInboxThreadDetail(effectiveThreadId);
  const dateLocale = calendarLocaleTagForLanguage(i18n.language);
  const rateCardQuery = useRateCardPackages();
  const mailbox = useMailboxConnection();
  const mailboxCapabilities = mailbox.data?.capabilities;
  const mailboxDraftReady = mailboxDraftFlowReady(mailboxCapabilities, mailbox.data?.reconsentRequired);
  const mailboxSendReady = mailboxSendFlowReady(mailboxCapabilities, mailbox.data?.reconsentRequired);

  const [body, setBody] = useState('');
  const [remoteDraftLoading, setRemoteDraftLoading] = useState(false);
  const [remoteDraftSending, setRemoteDraftSending] = useState(false);
  const [remoteDraftResult, setRemoteDraftResult] = useState<RemoteDraftSyncResult | null>(null);
  const [remoteDraftError, setRemoteDraftError] = useState<string | null>(null);
  const [draftSyncFlash, setDraftSyncFlash] = useState<'saved' | 'updated' | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const proposalRedirectStartedRef = useRef(false);

  useEffect(() => {
    if (query.data?.body) {
      setBody(query.data.body);
    }
  }, [query.data?.body]);

  useEffect(() => {
    if (!draftId || query.data?.kind !== 'proposal' || proposalRedirectStartedRef.current) return;
    proposalRedirectStartedRef.current = true;
    void alertAction(
      t('draftDetail.proposalDraftRedirectTitle'),
      t('draftDetail.proposalDraftRedirectBody'),
    );
    void openProposalDraftById(draftId);
  }, [draftId, openProposalDraftById, query.data?.kind, t]);

  useEffect(() => {
    setDraftSyncFlash(null);
  }, [body]);

  useFocusEffect(
    useCallback(() => {
      if (shouldUseBackendApi()) {
        void mailbox.refetch();
      }
    }, [mailbox.refetch]),
  );

  const profileBasics = useSessionStore((s) => s.profileBasics);

  const brandDisplayName = useMemo(() => {
    const resolved = resolveOpportunityBrandLabel(
      threadQuery.data?.brandName,
      threadQuery.data?.subject,
      threadQuery.data?.claimedBrandName,
    );
    if (resolved) return resolved;
    const hint = query.data?.sourceBrandHint?.trim();
    if (hint && resolveOpportunityBrandLabel(hint, threadQuery.data?.subject)) return hint;
    if (effectiveThreadId) return getMockInboxThreadBrandHint(effectiveThreadId);
    return undefined;
  }, [effectiveThreadId, query.data?.sourceBrandHint, threadQuery.data?.brandName, threadQuery.data?.subject, threadQuery.data?.claimedBrandName]);

  const cooperationTitle = useMemo(() => {
    return (
      threadQuery.data?.subject?.trim() ||
      query.data?.emailSubject?.trim() ||
      query.data?.title?.trim() ||
      ''
    );
  }, [query.data?.emailSubject, query.data?.title, threadQuery.data?.subject]);

  const headerLead = cooperationLeadLine(brandDisplayName, cooperationTitle);

  const templateRenderContext = useMemo((): RenderReplyTemplateInput => {
    return buildReplyTemplateContext({
      opportunityId: effectiveThreadId,
      thread: threadQuery.data,
      displayBrandName: brandDisplayName,
      displayCooperationTitle: cooperationTitle,
      creatorName: profileBasics?.displayName?.trim() || t('auth.creatorFallback'),
      rateCardPackages: rateCardQuery.data,
    });
  }, [
    brandDisplayName,
    cooperationTitle,
    profileBasics?.displayName,
    rateCardQuery.data,
    effectiveThreadId,
    threadQuery.data,
    t,
  ]);

  const resolveBodyForSend = useCallback(
    (draftBody: string) => renderReplyTemplateForSend(draftBody, templateRenderContext),
    [templateRenderContext],
  );

  const onInsertTemplate = useCallback((rendered: string) => {
    setBody(rendered);
  }, []);

  const onAiGenerated = useCallback(
    (result: GeneratedReplyDraft) => {
      if (!result.draft) return;
      if (result.draft.id !== draftId) {
        router.replace(`/drafts/${result.draft.id}?threadId=${encodeURIComponent(effectiveThreadId ?? '')}` as Href);
        return;
      }
      setBody(result.draft.body);
      void queryClient.invalidateQueries({ queryKey: ['drafts'] });
      void queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
    },
    [draftId, queryClient, router, effectiveThreadId],
  );

  const openMessage = useCallback(
    (message: InboxMessage) => {
      if (!draftId || !effectiveThreadId) return;
      const returnTo = `/drafts/${encodeURIComponent(draftId)}?threadId=${encodeURIComponent(effectiveThreadId)}`;
      router.push(
        inboxMessageHref(message.id, effectiveThreadId, {
          returnTo,
          directReturn: true,
        }),
      );
    },
    [draftId, effectiveThreadId, router],
  );

  const generationSource = query.data?.generationSource;
  const emailSubject = query.data?.emailSubject;

  if (!draftId) {
    return (
      <PlaceholderScreen title={t('draftDetail.missingTitle')} description={t('draftDetail.missingSubtitle')} />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('draftDetail.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    const msg = query.error?.message ?? t('draftDetail.loadErrorUnknown');
    return (
      <PlaceholderScreen title={t('draftDetail.errorTitle')} description={t('draftDetail.errorSubtitle')}>
        <QueryRetryCard
          message={msg}
          onRetry={() =>
            draftId
              ? queryClient.invalidateQueries({ queryKey: ['draft', draftId] })
              : queryClient.invalidateQueries({ queryKey: ['drafts'] })
          }
        />
      </PlaceholderScreen>
    );
  }

  const detail = query.data;
  const isProposalDraft = detail.kind === 'proposal';
  const linkedDealId = shouldUseBackendApi() ? detail.linkedDealId : 'mock-deal-alpha';
  const threadDetail = threadQuery.data;
  const latestInboundMessage = threadDetail?.messages?.length
    ? pickLatestInboundMessage(threadDetail.messages)
    : undefined;
  const showSubjectLine =
    !!emailSubject &&
    emailSubject.trim() !== cooperationTitle &&
    emailSubject.trim() !== threadDetail?.subject?.trim();

  const syncRemoteDraft = async (): Promise<RemoteDraftSyncResult | null> => {
    if (!draftId) return null;
    const result = await syncDraftToNativeMailbox(draftId, {
      bodyText: resolveBodyForSend(body),
      subject: emailSubject ?? undefined,
    });
    setRemoteDraftResult(result);
    if (result?.errorMessage) {
      setRemoteDraftError(normalizeMailboxDraftProviderError(result.errorMessage, t));
    } else if (result?.remoteDraftId) {
      void invalidateTenantScopedQueries(queryClient);
    }
    return result;
  };

  const onSyncRemoteDraft = async () => {
    if (!draftId || remoteDraftLoading || remoteDraftSending) return;
    if (!shouldUseBackendApi()) {
      void alertAction(t('draftDetail.nativeDraftUnavailableTitle'), t('draftDetail.nativeDraftUnavailableBody'));
      return;
    }
    if (!mailboxDraftReady) {
      setRemoteDraftError(t('draftDetail.nativeDraftScopeMissingBody'));
      return;
    }
    const wasUpdate = !!remoteDraftResult?.remoteDraftId;
    setRemoteDraftLoading(true);
    setRemoteDraftError(null);
    try {
      const result = await syncRemoteDraft();
      if (result?.errorMessage) {
        const message = normalizeMailboxDraftProviderError(result.errorMessage, t);
        setRemoteDraftError(message);
        void alertAction(t('draftDetail.nativeDraftErrorTitle'), message);
        return;
      }
      if (result?.remoteDraftId) {
        setDraftSyncFlash(wasUpdate ? 'updated' : 'saved');
        void alertAction(
          wasUpdate ? t('draftDetail.nativeDraftUpdatedTitle') : t('draftDetail.nativeDraftSyncedTitle'),
          wasUpdate ? t('draftDetail.nativeDraftUpdatedBody') : t('draftDetail.nativeDraftSyncedBody'),
        );
      }
    } catch (error) {
      const message = resolveMailboxDraftError(error, t);
      setRemoteDraftError(message);
      void alertAction(t('draftDetail.nativeDraftErrorTitle'), message);
    } finally {
      setRemoteDraftLoading(false);
    }
  };

  const onSendRemoteDraft = async () => {
    if (!draftId || remoteDraftLoading || remoteDraftSending) return;
    if (!mailboxSendReady) {
      setRemoteDraftError(t('draftDetail.nativeDraftScopeMissingBody'));
      return;
    }
    setRemoteDraftSending(true);
    setRemoteDraftError(null);
    try {
      let latestRemoteDraft = remoteDraftResult;
      const needsSyncBeforeSend =
        !latestRemoteDraft?.remoteDraftId || latestRemoteDraft.status === 'SENT';
      if (needsSyncBeforeSend) {
        setRemoteDraftLoading(true);
        try {
          latestRemoteDraft = await syncRemoteDraft();
        } finally {
          setRemoteDraftLoading(false);
        }
        if (latestRemoteDraft?.errorMessage) {
          const message = normalizeMailboxDraftProviderError(latestRemoteDraft.errorMessage, t);
          setRemoteDraftError(message);
          void alertAction(t('draftDetail.nativeDraftErrorTitle'), message);
          return;
        }
        if (!latestRemoteDraft?.remoteDraftId) {
          void alertAction(t('draftDetail.nativeDraftSendMissingTitle'), t('draftDetail.nativeDraftSendMissingBody'));
          return;
        }
        setDraftSyncFlash(latestRemoteDraft.status === 'SENT' ? 'updated' : 'saved');
      }
      const result = await sendNativeMailboxDraft(draftId);
      setRemoteDraftResult(result);
      if (result?.errorMessage) {
        const message = normalizeMailboxDraftProviderError(result.errorMessage, t);
        setRemoteDraftError(message);
        void alertAction(t('draftDetail.nativeDraftSendErrorTitle'), message);
      } else if (result?.status === 'SENT') {
        void invalidateTenantScopedQueries(queryClient);
        void syncMailbox({ lookback: 'INCREMENTAL' }).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['inbox'] });
          void queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] });
          void invalidateDecisionQueueQueries(queryClient);
        });
        await alertAction(t('draftDetail.sentReplyNextTitle'), t('draftDetail.sentReplyNextBody'));
        if (effectiveThreadId) {
          router.replace(inboxThreadHref(effectiveThreadId));
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/drafts' as Href);
        }
      }
    } catch (error) {
      const message = resolveMailboxDraftError(error, t);
      setRemoteDraftError(message);
      void alertAction(t('draftDetail.nativeDraftSendErrorTitle'), message);
    } finally {
      setRemoteDraftSending(false);
    }
  };

  const onReconnectMailbox = () => {
    router.push('/onboarding/email?source=draft-send' as Href);
  };

  const onDemoMailboxAction = (action: 'draft' | 'send') => {
    void alertAction(
      t('draftDetail.demoMailboxActionTitle'),
      t(action === 'draft' ? 'draftDetail.demoMailboxDraftBody' : 'draftDetail.demoMailboxSendBody'),
    );
  };

  const canSyncRemoteDraft =
    !isProposalDraft &&
    shouldUseBackendApi() &&
    mailboxDraftReady &&
    !remoteDraftLoading &&
    !remoteDraftSending;
  const canSendRemoteDraft =
    !isProposalDraft &&
    shouldUseBackendApi() &&
    mailboxSendReady &&
    !remoteDraftLoading &&
    !remoteDraftSending;
  const nativeDraftSyncCta = remoteDraftLoading
    ? null
    : draftSyncFlash === 'updated'
      ? t('draftDetail.nativeDraftUpdatedCta')
      : remoteDraftResult?.remoteDraftId
        ? t('draftDetail.nativeDraftUpdateCta')
        : t('draftDetail.nativeDraftCreateCta');

  return (
    <>
      <HubScreen title={t('draftDetail.screenTitle')} lead={headerLead || undefined}>
        {effectiveThreadId ? (
          <DraftOpportunityBrief detail={threadDetail} loading={threadQuery.isPending && !threadDetail} />
        ) : null}

        {effectiveThreadId && latestInboundMessage ? (
          <InboundMessagePreview
            message={latestInboundMessage}
            dateLocale={dateLocale}
            counterpartyLabel={brandDisplayName}
            onPress={() => openMessage(latestInboundMessage)}
          />
        ) : null}

        {effectiveThreadId && threadDetail?.messages && threadDetail.messages.length > 1 ? (
          <CollapsibleThread
            messages={threadDetail.messages}
            messageStats={threadDetail.messageStats}
            initiallyOpen={false}
            dateLocale={dateLocale}
            counterpartyLabel={brandDisplayName}
            onOpenMessage={openMessage}
          />
        ) : null}

        <SectionCard title={t('draftDetail.composeSectionTitle')} subtitle={t('draftDetail.composeSectionSubtitle')}>
          {generationSource ? (
            <Text style={[styles.generationSource, { color: theme.mutedForeground }]}>
              {generationSource === 'llm'
                ? t('replyDraftGenerator.sourceLlm')
                : t('replyDraftGenerator.sourceRules')}
            </Text>
          ) : null}

          {showSubjectLine ? (
            <View style={[styles.subjectCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
              <Text style={[styles.subjectLabel, { color: theme.foregroundSubtitle }]}>
                {t('replyDraftGenerator.subjectLabel')}
              </Text>
              <Text style={[styles.subjectValue, { color: theme.foreground }]}>{emailSubject}</Text>
            </View>
          ) : null}

          <TextInput
            multiline
            value={body}
            onChangeText={setBody}
            placeholder={t('draftDetail.bodyPlaceholder')}
            {...getTextInputProps(theme)}
            style={[
              getTextInputStyle(theme, {
                borderColor: theme.border,
                minHeight: 240,
                multiline: true,
              }),
              styles.composeInput,
            ]}
            textAlignVertical="top"
          />

          <View style={styles.composeActionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowTemplatePicker(true)}
              style={[styles.composeActionButton, styles.actionSecondary, { borderColor: theme.border, flex: 1 }]}>
              <Ionicons name="document-text-outline" size={15} color={theme.mutedForeground} />
              <Text style={[styles.actionLabel, styles.composeActionLabel, { color: theme.foreground }]}>{t('draftDetail.insertTemplateCta')}</Text>
            </Pressable>
            {effectiveThreadId ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAiGenerator(true)}
                style={[
                  styles.composeActionButton,
                  styles.actionSecondary,
                  { borderColor: theme.border, backgroundColor: theme.background, flex: 1 },
                ]}>
                <Ionicons name="sparkles-outline" size={15} color={theme.mutedForeground} />
                <Text style={[styles.actionLabel, styles.composeActionLabel, { color: theme.foreground }]}>{t('replyDraftGenerator.openCta')}</Text>
              </Pressable>
            ) : null}
          </View>

          {!shouldUseBackendApi() && !isProposalDraft ? (
            <View style={[styles.mailboxActionRow, { borderTopColor: theme.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('draftDetail.nativeDraftCtaA11y')}
                onPress={() => onDemoMailboxAction('draft')}
                style={[
                  styles.mailboxActionButton,
                  styles.actionSecondary,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}>
                <Text style={[styles.actionLabel, { color: theme.foreground }]}>
                  {t('draftDetail.nativeDraftCreateCta')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('draftDetail.nativeDraftSendCtaA11y')}
                onPress={() => onDemoMailboxAction('send')}
                style={[
                  styles.mailboxActionButton,
                  styles.actionPrimary,
                  { backgroundColor: theme.primary },
                ]}>
                <Text style={[styles.actionLabel, { color: theme.primaryForeground }]}>
                  {t('draftDetail.nativeDraftSendCta')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {shouldUseBackendApi() && !isProposalDraft ? (
            mailbox.isPending ? (
              <View style={[styles.mailboxStatePanel, { borderTopColor: theme.border }]}>
                <View style={styles.mailboxStateStatus}>
                  <ActivityIndicator color={theme.primary} />
                  <View style={styles.mailboxStateCopy}>
                    <Text style={[styles.mailboxStateTitle, { color: theme.foreground }]}>
                      {t('draftDetail.nativeDraftLoadingTitle')}
                    </Text>
                    <Text style={[styles.mailboxStateBody, { color: theme.mutedForeground }]}>
                      {t('draftDetail.nativeDraftLoadingBody')}
                    </Text>
                  </View>
                </View>
              </View>
            ) : mailbox.isError ? (
              <View style={[styles.mailboxStatePanel, { borderTopColor: theme.border }]}>
                <View style={styles.mailboxStateStatus}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.foreground} />
                  <View style={styles.mailboxStateCopy}>
                    <Text style={[styles.mailboxStateTitle, { color: theme.foreground }]}>
                      {t('draftDetail.nativeDraftLoadFailedTitle')}
                    </Text>
                    <Text style={[styles.mailboxStateBody, { color: theme.mutedForeground }]}>
                      {t('draftDetail.nativeDraftLoadFailedBody')}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void mailbox.refetch()}
                  style={[styles.actionButton, styles.actionSecondary, { borderColor: theme.border }]}>
                  <Ionicons name="refresh-outline" size={17} color={theme.primary} />
                  <Text style={[styles.actionLabel, { color: theme.primary }]}>
                    {t('draftDetail.nativeDraftRetryCta')}
                  </Text>
                </Pressable>
              </View>
            ) : !mailbox.data ? (
              <View style={[styles.mailboxStatePanel, { borderTopColor: theme.border }]}>
                <View style={styles.mailboxStateStatus}>
                  <Ionicons name="mail-outline" size={18} color={theme.foreground} />
                  <View style={styles.mailboxStateCopy}>
                    <Text style={[styles.mailboxStateTitle, { color: theme.foreground }]}>
                      {t('draftDetail.nativeDraftConnectTitle')}
                    </Text>
                    <Text style={[styles.mailboxStateBody, { color: theme.mutedForeground }]}>
                      {t('draftDetail.nativeDraftConnectBody')}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={onReconnectMailbox}
                  style={[styles.actionButton, styles.actionPrimary, { backgroundColor: theme.primary }]}>
                  <Ionicons name="link-outline" size={17} color={theme.primaryForeground} />
                  <Text style={[styles.actionLabel, { color: theme.primaryForeground }]}>
                    {t('draftDetail.nativeDraftConnectCta')}
                  </Text>
                </Pressable>
              </View>
            ) : mailboxSendReady ? (
              <View style={[styles.mailboxActionRow, { borderTopColor: theme.border }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('draftDetail.nativeDraftCtaA11y')}
                  disabled={!canSyncRemoteDraft}
                  onPress={onSyncRemoteDraft}
                  style={[
                    styles.mailboxActionButton,
                    styles.actionSecondary,
                    {
                      borderColor: theme.border,
                      backgroundColor: canSyncRemoteDraft ? theme.background : theme.secondary,
                      opacity: remoteDraftLoading || remoteDraftSending ? 0.85 : 1,
                    },
                  ]}>
                  {remoteDraftLoading ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Text style={[styles.actionLabel, { color: theme.foreground }]}>{nativeDraftSyncCta}</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('draftDetail.nativeDraftSendCtaA11y')}
                  disabled={!canSendRemoteDraft}
                  onPress={onSendRemoteDraft}
                  style={[
                    styles.mailboxActionButton,
                    styles.actionPrimary,
                    {
                      backgroundColor: canSendRemoteDraft ? theme.primary : theme.border,
                      opacity: remoteDraftLoading || remoteDraftSending ? 0.85 : 1,
                    },
                  ]}>
                  {remoteDraftSending ? (
                    <ActivityIndicator color={theme.primaryForeground} />
                  ) : (
                    <Text style={[styles.actionLabel, { color: theme.primaryForeground }]}>
                      {t('draftDetail.nativeDraftSendCta')}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={[styles.mailboxStatePanel, { borderTopColor: theme.border }]}>
                <View style={styles.mailboxStateStatus}>
                  <Ionicons name="key-outline" size={18} color={theme.foreground} />
                  <View style={styles.mailboxStateCopy}>
                    <Text style={[styles.mailboxStateTitle, { color: theme.foreground }]}>
                      {t('draftDetail.nativeDraftReconnectTitle')}
                    </Text>
                    <Text style={[styles.mailboxStateBody, { color: theme.mutedForeground }]}>
                      {t('draftDetail.nativeDraftReconnectBody')}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={onReconnectMailbox}
                  style={[styles.actionButton, styles.actionPrimary, { backgroundColor: theme.primary }]}>
                  <Ionicons name="refresh-outline" size={17} color={theme.primaryForeground} />
                  <Text style={[styles.actionLabel, { color: theme.primaryForeground }]}>
                    {t('draftDetail.nativeDraftReconnectCta')}
                  </Text>
                </Pressable>
              </View>
            )
          ) : null}

          {remoteDraftError ? (
            <Text style={[styles.inlineError, { color: '#DC2626' }]}>{remoteDraftError}</Text>
          ) : null}
        </SectionCard>

        {linkedDealId ? (
          <HubLinkGroup
            title={t('draftDetail.nextStepsTitle')}
            links={[
              {
                label: t('draftDetail.viewPacket'),
                href: `/deal/${linkedDealId}/packet`,
                icon: 'document-text-outline',
              },
            ]}
          />
        ) : null}
      </HubScreen>

      <ReplyTemplatePicker
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onInsert={onInsertTemplate}
        renderContext={templateRenderContext}
      />
      <ReplyDraftGeneratorSheet
        visible={showAiGenerator}
        opportunityId={effectiveThreadId}
        rateCardPackages={rateCardQuery.data}
        locale={i18n.language}
        overwriteDraftId={draftId}
        hasExistingBody={!!body.trim()}
        onClose={() => setShowAiGenerator(false)}
        onGenerated={onAiGenerated}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  generationSource: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  subjectCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  subjectLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subjectValue: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  composeInput: {
    marginHorizontal: -spacing.xs,
    width: '100%',
    alignSelf: 'stretch',
  },
  composeActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mailboxActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  mailboxActionButton: {
    flex: 1,
    borderRadius: radii.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  mailboxStatePanel: {
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  mailboxStateStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  mailboxStateCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  mailboxStateTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  mailboxStateBody: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  composeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.sm,
    minHeight: layout.touchMin,
    paddingHorizontal: spacing.sm,
  },
  composeActionLabel: { fontSize: fontSize.bodySmall },
  actionButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionPrimary: {},
  actionSecondary: { borderWidth: 1 },
  actionLabel: { fontWeight: '700', fontSize: fontSize.body },
  inlineError: { fontSize: fontSize.bodySmall, marginTop: spacing.xs },
});
