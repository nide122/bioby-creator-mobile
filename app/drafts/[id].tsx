import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';

import {
  Badge,
  getTextInputProps,
  getTextInputStyle,
  HubLinkGroup,
  HubListRow,
  HubScreen,
  QueryRetryCard,
  SectionCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { getMockInboxThreadBrandHint } from '@/src/api/mock-inbox';
import { approveDraftOnServer, sendNativeMailboxDraft, syncDraftToNativeMailbox, type GeneratedReplyDraft, type RemoteDraftSyncResult } from '@/src/api/drafts-api';
import { syncMailbox } from '@/src/api/mailbox-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { alertAction } from '@/src/lib/app-dialog';
import { useDraftDetail } from '@/src/hooks/use-drafts';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { useMailboxConnection } from '@/src/hooks/use-mailbox-connection';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useRateCardPackages } from '@/src/hooks/use-growth';
import { buildReplyTemplateContext } from '@/src/lib/reply-template-context';
import {
  mailboxSendFlowReady,
  normalizeMailboxDraftProviderError,
  resolveMailboxDraftError,
} from '@/src/lib/mailbox-draft-i18n';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { ReplyDraftGeneratorSheet } from '@/components/drafts/ReplyDraftGeneratorSheet';
import { ReplyTemplatePicker } from '@/src/components/reply-templates/ReplyTemplatePicker';
import { renderReplyTemplateForSend } from '@/src/lib/reply-template-render';
import type { RenderReplyTemplateInput } from '@/src/types/reply-template';
import { useDraftApprovalStore } from '@/src/stores/draft-approval-store';
import { useSessionStore } from '@/src/stores/session-store';

export default function DraftDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { draftKindLabel } = useDomainLabels();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[]; threadId?: string | string[] }>();
  const rawId = params.id;
  const rawThread = params.threadId;
  const draftId = Array.isArray(rawId) ? rawId[0] : rawId;
  const threadId = Array.isArray(rawThread) ? rawThread[0] : rawThread;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const approveDraftLocal = useDraftApprovalStore((s) => s.approveDraft);
  const isApprovedLocal = useDraftApprovalStore((s) => (draftId ? s.isDraftApproved(draftId) : false));
  const approvedAtLocal = useDraftApprovalStore((s) => (draftId ? s.approvedAtById[draftId] : undefined));

  const query = useDraftDetail(draftId);
  const threadQuery = useInboxThreadDetail(threadId);
  const rateCardQuery = useRateCardPackages();
  const mailbox = useMailboxConnection();
  const mailboxCapabilities = mailbox.data?.capabilities;
  const mailboxSendReady = mailboxSendFlowReady(
    mailboxCapabilities,
    mailbox.data?.reconsentRequired,
  );
  const [body, setBody] = useState('');
  const [boundarySkipped, setBoundarySkipped] = useState(false);
  const [remoteDraftLoading, setRemoteDraftLoading] = useState(false);
  const [remoteDraftSending, setRemoteDraftSending] = useState(false);
  const [remoteDraftResult, setRemoteDraftResult] = useState<RemoteDraftSyncResult | null>(null);
  const [remoteDraftError, setRemoteDraftError] = useState<string | null>(null);
  const [draftSyncFlash, setDraftSyncFlash] = useState<'saved' | 'updated' | null>(null);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  useEffect(() => {
    if (query.data?.body) {
      setBody(query.data.body);
    }
  }, [query.data?.body]);

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

  const brandHint = useMemo(() => {
    if (shouldUseBackendApi()) return query.data?.sourceBrandHint;
    if (threadId) return getMockInboxThreadBrandHint(threadId);
    return query.data?.sourceBrandHint;
  }, [threadId, query.data?.sourceBrandHint]);

  const templateRenderContext = useMemo((): RenderReplyTemplateInput => {
    const thread = threadQuery.data;
    const base = buildReplyTemplateContext({
      opportunityId: threadId,
      thread: thread ?? (brandHint ? { brandName: brandHint, subject: query.data?.title } : undefined),
      creatorName: profileBasics?.displayName?.trim() || t('auth.creatorFallback'),
      rateCardPackages: rateCardQuery.data,
    });
    if (!base.brandName && brandHint) {
      return { ...base, brandName: brandHint };
    }
    if (!base.cooperationTitle && query.data?.title) {
      return { ...base, cooperationTitle: query.data.title };
    }
    return base;
  }, [
    brandHint,
    profileBasics?.displayName,
    query.data?.title,
    rateCardQuery.data,
    threadId,
    threadQuery.data,
    t,
  ]);

  const resolveBodyForSend = useCallback(
    (draftBody: string) => renderReplyTemplateForSend(draftBody, templateRenderContext),
    [templateRenderContext],
  );

  const onInsertTemplate = useCallback((rendered: string) => {
    setBody((current) => {
      const trimmed = current.trim();
      if (!trimmed) return rendered;
      return `${trimmed}\n\n${rendered}`;
    });
  }, []);

  const onAiGenerated = useCallback(
    (result: GeneratedReplyDraft) => {
      if (!result.draft) return;
      if (result.draft.id !== draftId) {
        router.replace(`/drafts/${result.draft.id}?threadId=${encodeURIComponent(threadId ?? '')}` as Href);
        return;
      }
      setBody(result.draft.body);
      void queryClient.invalidateQueries({ queryKey: ['drafts'] });
      void queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
    },
    [draftId, queryClient, router, threadId],
  );

  const generationSource = query.data?.generationSource;
  const emailSubject = query.data?.emailSubject;

  if (!draftId) {
    return (
      <PlaceholderScreen
        title={t('draftDetail.missingTitle')}
        description={t('draftDetail.missingSubtitle')}
      />
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
      <PlaceholderScreen
        title={t('draftDetail.errorTitle')}
        description={t('draftDetail.errorSubtitle')}>
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
  const serverApproved = detail.approvalState === 'approved';
  const isApproved = serverApproved || isApprovedLocal;
  const approvedAtISO = detail.approvedAtISO ?? approvedAtLocal;
  const linkedDealId = shouldUseBackendApi()
    ? detail.linkedDealId
    : 'mock-deal-alpha';
  const decisionTitle = detail.requiresApproval
    ? detail.kind === 'quote'
      ? t('draftDetail.titleQuote')
      : t('draftDetail.titleReply')
    : t('draftDetail.titleLowRisk');

  const headerSubtitle = brandHint ? `${brandHint} · ${detail.title}` : detail.title;

  const onShareCopy = async () => {
    try {
      await Share.share({ message: body });
    } catch {
      void alertAction(t('draftDetail.shareErrorTitle'), t('draftDetail.shareErrorMsg'));
    }
  };

  const invalidateAfterApprove = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['drafts'] }),
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] }),
      queryClient.invalidateQueries({ queryKey: ['decisions'] }),
      invalidateTenantScopedQueries(queryClient),
    ]);

  const onApproveDraft = async () => {
    if (!draftId || approveLoading) return;
    approveDraftLocal(draftId);
    setShowApprovalConfirm(false);
    if (!shouldUseBackendApi()) return;
    setApproveLoading(true);
    try {
      await approveDraftOnServer(draftId);
      await invalidateAfterApprove();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('draftDetail.loadErrorUnknown');
      void alertAction(t('draftDetail.errorTitle'), message);
    } finally {
      setApproveLoading(false);
    }
  };

  const onSyncRemoteDraft = async () => {
    if (!draftId || remoteDraftLoading || remoteDraftSending) return;
    if (!shouldUseBackendApi()) {
      void alertAction(t('draftDetail.nativeDraftUnavailableTitle'), t('draftDetail.nativeDraftUnavailableBody'));
      return;
    }
    if (!mailboxSendReady) {
      setRemoteDraftError(t('draftDetail.nativeDraftScopeMissingBody'));
      return;
    }
    const wasUpdate = !!remoteDraftResult?.remoteDraftId;
    setRemoteDraftLoading(true);
    setRemoteDraftError(null);
    try {
      const result = await syncDraftToNativeMailbox(draftId, {
        bodyText: resolveBodyForSend(body),
        subject: emailSubject ?? undefined,
      });
      setRemoteDraftResult(result);
      if (result?.errorMessage) {
        setRemoteDraftError(normalizeMailboxDraftProviderError(result.errorMessage, t));
      } else if (result?.remoteDraftId) {
        const flash = wasUpdate ? 'updated' : 'saved';
        setDraftSyncFlash(flash);
        if (wasUpdate) {
          void alertAction(t('draftDetail.nativeDraftUpdatedTitle'), t('draftDetail.nativeDraftUpdatedBody'));
        }
        void invalidateTenantScopedQueries(queryClient);
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
    if (!remoteDraftResult?.remoteDraftId) {
      void alertAction(t('draftDetail.nativeDraftSendMissingTitle'), t('draftDetail.nativeDraftSendMissingBody'));
      return;
    }
    if (!mailboxSendReady) {
      setRemoteDraftError(t('draftDetail.nativeDraftScopeMissingBody'));
      return;
    }
    setRemoteDraftSending(true);
    setRemoteDraftError(null);
    try {
      const result = await sendNativeMailboxDraft(draftId);
      setRemoteDraftResult(result);
      if (result?.errorMessage) {
        setRemoteDraftError(normalizeMailboxDraftProviderError(result.errorMessage, t));
      } else if (result?.status === 'SENT') {
        if (detail.kind === 'quote') {
          void alertAction(t('draftDetail.sentQuoteNextTitle'), t('draftDetail.sentQuoteNextBody'));
        } else if (threadId) {
          void alertAction(t('draftDetail.sentReplyNextTitle'), t('draftDetail.sentReplyNextBody'));
        }
        void invalidateTenantScopedQueries(queryClient);
        void syncMailbox({ lookback: 'INCREMENTAL' }).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['inbox'] });
          void queryClient.invalidateQueries({ queryKey: ['mailbox', 'sync-status'] });
          void queryClient.invalidateQueries({ queryKey: ['decisions'] });
        });
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

  const clearedAtLabel = approvedAtISO
    ? new Date(approvedAtISO).toLocaleString(i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('draftDetail.approvalJustNow');
  const remoteDraftSent = remoteDraftResult?.status === 'SENT';
  const remoteDraftSentAtLabel = remoteDraftResult?.sentAtISO
    ? new Date(remoteDraftResult.sentAtISO).toLocaleString(i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const canSyncRemoteDraft =
    shouldUseBackendApi() &&
    mailboxSendReady &&
    !remoteDraftLoading &&
    !remoteDraftSending &&
    !remoteDraftSent &&
    (!detail.requiresApproval || isApproved);
  const saveDisabledReason = remoteDraftSent
    ? t('draftDetail.nativeDraftSentCta')
    : detail.requiresApproval && !isApproved && shouldUseBackendApi()
      ? t('draftDetail.nativeDraftApprovalRequired')
      : !mailboxSendReady && shouldUseBackendApi()
        ? t('draftDetail.nativeDraftScopeMissingBody')
        : null;
  const nativeDraftStatusBadge = remoteDraftSent
    ? t('draftDetail.nativeDraftSentBadge')
    : draftSyncFlash === 'updated'
      ? t('draftDetail.nativeDraftUpdatedBadge')
      : remoteDraftResult?.remoteDraftId
        ? t('draftDetail.nativeDraftSyncedBadge')
        : t('draftDetail.nativeDraftReadyBadge');
  const nativeDraftStatusBody = remoteDraftSent
    ? t('draftDetail.nativeDraftSentBody', {
        time: remoteDraftSentAtLabel ?? t('draftDetail.approvalJustNow'),
      })
    : draftSyncFlash === 'updated'
      ? t('draftDetail.nativeDraftUpdatedBody')
      : remoteDraftResult?.remoteDraftId
        ? t('draftDetail.nativeDraftSyncedBody')
        : t('draftDetail.nativeDraftBody');
  const nativeDraftSyncCta = remoteDraftLoading
    ? null
    : draftSyncFlash === 'updated'
      ? t('draftDetail.nativeDraftUpdatedCta')
      : remoteDraftResult?.remoteDraftId
        ? t('draftDetail.nativeDraftUpdateCta')
        : t('draftDetail.nativeDraftCreateCta');

  return (
    <>
    <HubScreen eyebrow={t('tabs.assets')} title={decisionTitle} lead={headerSubtitle}>
      <View style={styles.row}>
        <Badge tone="mint" label={draftKindLabel[detail.kind]} />
        {detail.requiresApproval ? (
          <Badge tone="warning" label={t('draftDetail.badgeNeedsReview')} />
        ) : (
          <Badge tone="mint" label={t('draftDetail.badgeLowRisk')} />
        )}
      </View>

      <SectionCard title={t('draftDetail.checkSectionTitle')}>
        <View style={[styles.commentCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
          <View style={styles.row}>
            <Badge
              tone={detail.requiresApproval ? 'warning' : 'mint'}
              label={detail.requiresApproval ? t('draftDetail.checkLabelQuote') : t('draftDetail.checkLabelFollow')}
            />
            <Text style={[styles.commentMeta, { color: theme.foregroundSubtitle }]}>
              {t('draftDetail.checkMetaBeforeSend')}
            </Text>
          </View>
          <Text style={[styles.commentBody, { color: theme.foreground }]}>
            {detail.requiresApproval ? t('draftDetail.checkQuoteBody') : t('draftDetail.checkFollowBody')}
          </Text>
        </View>
        {detail.requiresApproval ? (
          <View style={{ gap: spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBody((current) => `${current.trim()}${t('draftDetail.boundarySnippet')}`)}
              style={[styles.secondary, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>{t('draftDetail.addBoundaryCta')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBoundarySkipped(true)}
              style={[styles.secondary, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryLabel, { color: boundarySkipped ? theme.mutedForeground : theme.foreground }]}>
                {boundarySkipped ? t('draftDetail.skippedBoundary') : t('draftDetail.skipBoundary')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!isApproved ? (
          detail.requiresApproval ? (
            showApprovalConfirm ? (
              <View
                style={[
                  styles.approvalConfirm,
                  { borderColor: theme.border, backgroundColor: theme.secondary },
                ]}>
                <View style={styles.row}>
                  <Badge tone="warning" label={t('draftDetail.finalConfirmBadge')} />
                  <Text style={[styles.commentMeta, { color: theme.foregroundSubtitle }]}>
                    {t('draftDetail.finalConfirmMeta')}
                  </Text>
                </View>
                <Text style={[styles.commentBody, { color: theme.foreground }]}>
                  {t('draftDetail.finalConfirmBody')}
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={approveLoading}
                    onPress={() => setShowApprovalConfirm(false)}
                    style={[styles.confirmSecondary, { borderColor: theme.border }]}>
                    <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                      {t('draftDetail.recheckCta')}
                    </Text>
                  </Pressable>
                  <View style={styles.confirmActionsSpacer} />
                  <Pressable
                    accessibilityRole="button"
                    disabled={approveLoading}
                    onPress={() => void onApproveDraft()}
                    style={[styles.confirmPrimary, { backgroundColor: theme.primary }]}>
                    {approveLoading ? (
                      <ActivityIndicator color={theme.primaryForeground} />
                    ) : (
                      <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                        {t('draftDetail.confirmApproveCta')}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowApprovalConfirm(true)}
                style={[styles.primary, { backgroundColor: theme.primary }]}>
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                  {t('draftDetail.approveSendCta')}
                </Text>
              </Pressable>
            )
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={approveLoading}
              onPress={() => void onApproveDraft()}
              style={[styles.primary, { backgroundColor: theme.primary }]}>
              {approveLoading ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                  {t('draftDetail.markCheckedCta')}
                </Text>
              )}
            </Pressable>
          )
        ) : (
          <View style={styles.row}>
            <Badge tone="mint" label={t('draftDetail.approvedCta')} />
            <Text style={[styles.commentMeta, { color: theme.foregroundSubtitle }]}>{clearedAtLabel}</Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title={t('draftDetail.bodySectionTitle')}>
        {shouldUseBackendApi() ? (
          <View style={[styles.commentCard, styles.mailboxDraftStatus, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={styles.row}>
              <Badge
                tone={remoteDraftSent ? 'mint' : remoteDraftResult?.remoteDraftId || draftSyncFlash ? 'mint' : 'warning'}
                label={nativeDraftStatusBadge}
              />
              <Text style={[styles.commentMeta, { color: theme.foregroundSubtitle }]}>
                {remoteDraftResult?.provider ?? t('draftDetail.nativeDraftProviderFallback')}
              </Text>
            </View>
            <Text style={[styles.commentBody, { color: theme.foreground }]}>{nativeDraftStatusBody}</Text>
            {remoteDraftSent ? (
              <Text style={[styles.commentMeta, { color: theme.foregroundSubtitle }]}>
                {t('draftDetail.nativeDraftSentSyncHint')}
              </Text>
            ) : null}
            {saveDisabledReason && !remoteDraftSent ? (
              <Text
                style={[
                  styles.commentMeta,
                  { color: !mailboxSendReady ? '#B45309' : theme.foregroundSubtitle },
                ]}>
                {saveDisabledReason}
              </Text>
            ) : null}
            {!mailboxSendReady && shouldUseBackendApi() ? (
              <Pressable
                accessibilityRole="button"
                onPress={onReconnectMailbox}
                style={[styles.secondary, { borderColor: theme.border }]}>
                <Text style={[styles.secondaryLabel, { color: theme.primary }]}>
                  {t('draftDetail.nativeDraftReconnectCta')}
                </Text>
              </Pressable>
            ) : null}
            {remoteDraftError ? (
              <Text style={[styles.commentMeta, { color: '#DC2626' }]}>{remoteDraftError}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.composeToolbar}>
          {threadId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAiGenerator(true)}
              style={[styles.secondary, styles.composeToolbarButton, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryLabel, { color: theme.primary }]}>{t('replyDraftGenerator.openCta')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowTemplatePicker(true)}
            style={[styles.secondary, styles.composeToolbarButton, { borderColor: theme.border }]}>
            <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>{t('draftDetail.insertTemplateCta')}</Text>
          </Pressable>
        </View>
        {generationSource ? (
          <Text style={[styles.generationSource, { color: theme.mutedForeground }]}>
            {generationSource === 'llm'
              ? t('replyDraftGenerator.sourceLlm')
              : t('replyDraftGenerator.sourceRules')}
          </Text>
        ) : null}
        {emailSubject ? (
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
          style={getTextInputStyle(theme, {
            borderColor: theme.border,
            minHeight: 200,
            multiline: true,
          })}
          textAlignVertical="top"
        />

        {shouldUseBackendApi() ? (
          <View style={styles.mailboxDraftBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('draftDetail.nativeDraftCtaA11y')}
              disabled={!canSyncRemoteDraft}
              onPress={onSyncRemoteDraft}
              style={[
                styles.primary,
                {
                  backgroundColor: canSyncRemoteDraft ? theme.primary : theme.border,
                  opacity: remoteDraftLoading || remoteDraftSending ? 0.85 : 1,
                },
              ]}>
              {remoteDraftLoading ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>{nativeDraftSyncCta}</Text>
              )}
            </Pressable>

            {remoteDraftResult?.remoteDraftId && !remoteDraftSent ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('draftDetail.nativeDraftSendCtaA11y')}
                disabled={!canSyncRemoteDraft}
                onPress={onSendRemoteDraft}
                style={[
                  styles.secondary,
                  {
                    borderColor: theme.border,
                    opacity: remoteDraftLoading || remoteDraftSending ? 0.85 : 1,
                  },
                ]}>
                {remoteDraftSending ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>{t('draftDetail.nativeDraftSendCta')}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </SectionCard>

      <SettingsGroup title={t('hubLinks.actions')}>
        <HubListRow icon="share-outline" title={t('draftDetail.shareCopyCta')} onPress={onShareCopy} />
        {threadId ? (
          <HubListRow
            icon="mail-outline"
            title={t('draftDetail.backToThread')}
            onPress={() => {
              // 从商机详情 push 进草稿；用 back 弹出草稿栈，避免重复压入 /inbox/[id] 导致返回错乱
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace(`/inbox/${threadId}` as Href);
            }}
          />
        ) : null}
      </SettingsGroup>

      {isApproved && linkedDealId ? (
        <HubLinkGroup
          title={t('draftDetail.nextStepsTitle')}
          links={[
            {
              label: t('draftDetail.viewDelivery'),
              href: `/deal/${linkedDealId}/delivery`,
              icon: 'cube-outline',
            },
            {
              label: t('draftDetail.viewPacket'),
              href: `/deal/${linkedDealId}/packet`,
              icon: 'document-text-outline',
            },
          ]}
        />
      ) : null}

      <HubLinkGroup
        links={[
          {
            label: t('draftDetail.backToList'),
            href: '/drafts',
            icon: 'list-outline',
          },
        ]}
      />
    </HubScreen>
    <ReplyTemplatePicker
      visible={showTemplatePicker}
      onClose={() => setShowTemplatePicker(false)}
      onInsert={onInsertTemplate}
      renderContext={templateRenderContext}
    />
    <ReplyDraftGeneratorSheet
      visible={showAiGenerator}
      opportunityId={threadId}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  meta: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  commentCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  approvalConfirm: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  confirmActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confirmActionsSpacer: { flex: 1 },
  confirmPrimary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmSecondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  commentMeta: { fontSize: fontSize.caption, fontWeight: '600' },
  commentBody: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  mailboxDraftBlock: { gap: spacing.sm, marginTop: spacing.md },
  mailboxDraftStatus: { marginBottom: spacing.md },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: { fontWeight: '700', fontSize: fontSize.body },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  composeToolbarButton: {
    flexGrow: 1,
    flexBasis: '48%',
    paddingHorizontal: spacing.md,
  },
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
  ghost: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '700', fontSize: fontSize.body },
});
