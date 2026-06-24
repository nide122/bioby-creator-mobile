import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge, SectionCard } from '@/components/product';
import { RiskBanner } from '@/components/inbox/RiskBanner';
import { useColorScheme } from '@/components/useColorScheme';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useDealPacket } from '@/src/hooks/use-deal-packet';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useInboxThreads } from '@/src/hooks/use-inbox-threads';
import { useTenantQueryKey } from '@/src/lib/tenant-query';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { openBrandDetail } from '@/src/lib/open-brand-detail';
import { localizeDealSummaryCopy } from '@/src/lib/deal-copy-i18n';
import { localizeDeliveryTimeline } from '@/src/lib/delivery-workflow-i18n';
import { reconcileDeliveryTimeline } from '@/src/lib/reconcile-delivery-timeline';
import { formatThreadToggleLabel } from '@/src/lib/inbox-message-stats';
import { stripQuotedPlainText } from '@/src/lib/email-body';
import { visibleRiskFlags } from '@/src/lib/inbox-detail-labels';
import { contractWarningSeverity } from '@/src/lib/contract-warning';
import { fetchEmailMessage } from '@/src/api/mailbox-api';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import { ApiError } from '@/src/api/api-client';
import { alertAction } from '@/src/lib/app-dialog';
import { EmailAttachmentsList, EmailAttachmentBadge } from '@/components/mail/EmailAttachmentsList';
import { isPdfAttachment } from '@/components/mail/email-attachment-utils';
import { DealTermsWithContractSection } from '@/components/deals/DealTermsWithContractSection';
import { ContractSummaryCard } from '@/components/deals/ContractSummaryCard';
import { DealStatusStrip } from '@/components/deals/DealStatusStrip';
import { resolveFulfillmentStatus } from '@/src/lib/deal-fulfillment-status';
import { dealPanelQuickHref, dealPanelQuickLabelKey } from '@/src/lib/deal-panel-fields';
import { useDealTermsAndContract } from '@/src/hooks/use-deal-terms-and-contract';
import type { DealSummary, EscrowLifecyclePhase, InboxMessage, InboxMessageStats } from '@/src/types/domain';

type Props = {
  deal: DealSummary | null;
  onClose: () => void;
};

function escrowTone(phase: EscrowLifecyclePhase): 'primary' | 'mint' | 'warning' | 'danger' | 'neutral' {
  switch (phase) {
    case 'settled':
      return 'primary';
    case 'escrowed':
      return 'mint';
    case 'remediation':
    case 'disputed':
      return 'danger';
    case 'pending_verification':
      return 'warning';
    default:
      return 'neutral';
  }
}

function messageStatsFromMessages(
  messages: { direction?: 'inbound' | 'outbound' }[]
): InboxMessageStats {
  const received = messages.filter((message) => message.direction !== 'outbound').length;
  const sent = messages.filter((message) => message.direction === 'outbound').length;
  return {
    total: messages.length,
    received,
    sent,
    unread: 0,
    unreadReceived: 0,
    unreadSent: 0,
  };
}

type StepStatus = 'done' | 'current' | 'blocked' | 'upcoming';

function stepBadge(status: StepStatus, t: (key: string) => string): { label: string; tone: 'mint' | 'warning' | 'danger' | 'neutral' } {
  switch (status) {
    case 'done':
      return { label: t('dealDeliveryScreen.statusDone'), tone: 'mint' };
    case 'current':
      return { label: t('dealDeliveryScreen.statusCurrent'), tone: 'warning' };
    case 'blocked':
      return { label: t('dealDeliveryScreen.statusBlocked'), tone: 'danger' };
    default:
      return { label: t('dealDeliveryScreen.statusNext'), tone: 'neutral' };
  }
}

export function DealSidePanel({ deal, onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { escrowLifecycleLabel } = useDomainLabels();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { width } = useWindowDimensions();
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [summarizingAttachmentId, setSummarizingAttachmentId] = useState<string | null>(null);
  const [inlineSummaryMessageId, setInlineSummaryMessageId] = useState<string | null>(null);

  const packetQuery = useDealPacket(deal?.id);
  const inboxThreads = useInboxThreads();
  const matchedThreadId = useMemo(
    () =>
      deal?.opportunityThreadId ??
      inboxThreads.data?.find((t) => t.brandName === deal?.brandPlaceholder)?.id,
    [deal?.opportunityThreadId, deal?.brandPlaceholder, inboxThreads.data],
  );
  const threadQuery = useInboxThreadDetail(matchedThreadId);
  const termsContract = useDealTermsAndContract(deal ?? undefined);
  const { termLines, deliverableLines, usageRights, showContractBlock, contractEditor } = termsContract;
  const mailboxMessageKey = useTenantQueryKey('mailbox', 'message', selectedMessage?.id);
  const emailQuery = useQuery({
    queryKey: mailboxMessageKey,
    queryFn: () => fetchEmailMessage(selectedMessage!.id),
    enabled: !!selectedMessage,
    staleTime: 0,
  });

  const packet = packetQuery.data?.packet;
  const thread = threadQuery.data;
  const compact = width < 900;
  const contractRiskFlags = visibleRiskFlags(thread?.riskFlags ?? [], thread?.budgetLabel);
  const showContractWarning = contractWarningSeverity(contractRiskFlags) != null;

  useEffect(() => {
    if (!deal) return;
    setTimelineOpen(true);
    setDeliveryOpen(false);
    setSelectedMessage(null);
    setInlineSummaryMessageId(null);
  }, [deal?.id]);

  const dealCopy = deal ? localizeDealSummaryCopy(deal, t) : null;
  const rawDeliveryTimeline = packetQuery.data?.packet.delivery?.timeline;
  const deliveryTimeline = useMemo(() => {
    if (!rawDeliveryTimeline || rawDeliveryTimeline.length === 0) return [];
    const localized = localizeDeliveryTimeline(rawDeliveryTimeline, t);
    return deal ? reconcileDeliveryTimeline(localized, deal.escrowPhase) : localized;
  }, [rawDeliveryTimeline, deal, t]);
  const summary =
    thread?.classificationSummary ??
    dealCopy?.outcomeSummary ??
    packet?.summary ??
    dealCopy?.nextMilestone ??
    t('dealsScreen.description');
  const contractRisk =
    thread?.riskLabel ??
    deal?.recommendRiskNote ??
    thread?.riskFlags?.[0]?.label ??
    t('dealsScreen.panelRiskFallback');
  const fulfillmentStatus = useMemo(
    () => (deal ? resolveFulfillmentStatus(deal, packet, packetQuery.data?.fulfillmentStatus) : null),
    [deal, packet, packetQuery.data?.fulfillmentStatus],
  );

  const timelineItems = useMemo(
    () => [...(thread?.messages ?? [])].sort((left, right) => new Date(left.sentAtISO).getTime() - new Date(right.sentAtISO).getTime()),
    [thread?.messages]
  );
  const timelineStats = messageStatsFromMessages(timelineItems);
  const selectedMessagePdfAttachments = useMemo(
    () => (emailQuery.data?.attachments ?? []).filter(isPdfAttachment),
    [emailQuery.data?.attachments]
  );
  const contractForSelectedMessage = useMemo(
    () =>
      selectedMessage && thread?.contractSummary?.emailMessageId === selectedMessage.id
        ? thread.contractSummary
        : null,
    [selectedMessage, thread?.contractSummary]
  );
  const savedDocumentForSelectedMessage = emailQuery.data?.documentSummary ?? null;
  const showDraftInEmail =
    !!selectedMessage &&
    inlineSummaryMessageId === selectedMessage.id &&
    (contractEditor.parsing || !!summarizingAttachmentId || contractEditor.unsaved || !!contractEditor.draft);
  const riskItems = thread?.riskFlags ?? [];
  const openMessage = (message: InboxMessage) => {
    setSelectedMessage(message);
  };
  const closeMessage = () => {
    setSelectedMessage(null);
  };
  const summarizePdfAttachment = async (attachment: EmailAttachment) => {
    if (!matchedThreadId || !selectedMessage) {
      void alertAction(t('contractSummary.title'), t('contractSummary.missingThread'));
      return;
    }
    setSummarizingAttachmentId(attachment.id);
    setInlineSummaryMessageId(selectedMessage.id);
    try {
      await contractEditor.parseFromAttachment(selectedMessage.id, attachment.id);
    } catch (error) {
      setInlineSummaryMessageId(null);
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
      setInlineSummaryMessageId(null);
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
    if (!selectedMessage) return;
    try {
      await contractEditor.saveDocumentDraft(selectedMessage.id);
      setInlineSummaryMessageId(null);
      await queryClient.invalidateQueries({ queryKey: mailboxMessageKey });
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
  const cancelContractSummary = () => {
    contractEditor.cancelDraft();
    setInlineSummaryMessageId(null);
  };
  const termsContractCardProps = {
    ...termsContract.contractCardProps,
    loading: termsContract.contractCardProps.loading || !!summarizingAttachmentId,
    onSave: () => void saveContractSummary(),
    onCancel: cancelContractSummary,
    uploadDisabled: termsContract.contractCardProps.uploadDisabled || !!summarizingAttachmentId,
  };
  const openFullDeal = () => {
    if (!deal) return;
    onClose();
    router.push({ pathname: '/deal/[dealId]', params: { dealId: deal.id } });
  };
  const openQuickAction = () => {
    if (!deal) return;
    onClose();
    router.push(dealPanelQuickHref(deal) as never);
  };
  const openBrand = () => {
    if (!deal?.brandId) return;
    onClose();
    openBrandDetail(router, deal.brandId, '/deals');
  };

  const renderContractSummaryCard = (placement: 'inline' | 'timeline') => (
    <ContractSummaryCard
      key={placement}
      summary={contractEditor.displayed}
      loading={contractEditor.parsing || !!summarizingAttachmentId}
      saving={contractEditor.saving}
      savingTarget={contractEditor.savingTarget}
      unsaved={contractEditor.unsaved}
      editable={!!contractEditor.displayed && contractEditor.displayed.status !== 'FAILED'}
      saveLayout={placement === 'inline' ? 'email' : 'contract'}
      headerStyle={placement === 'inline' ? 'attachmentFilename' : 'default'}
      onChange={contractEditor.patchDraft}
      onSave={() => void saveContractSummary()}
      onSaveDocument={placement === 'inline' ? () => void saveDocumentSummary() : undefined}
      onSaveContract={placement === 'inline' ? () => void saveContractSummary() : undefined}
      onCancel={cancelContractSummary}
      onUploadPdf={termsContract.contractCardProps.onUploadPdf}
      uploadDisabled={contractEditor.parsing || contractEditor.saving || !!summarizingAttachmentId}
    />
  );

  return (
    <Modal animationType="slide" transparent visible={!!deal} onRequestClose={onClose}>
      <View style={[styles.backdropWrap, compact ? styles.backdropCompact : styles.backdropWide]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              width: compact ? '100%' : Math.min(600, Math.max(460, width * 0.42)),
              height: compact ? undefined : '100%',
              alignSelf: compact ? 'stretch' : 'flex-end',
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Pressable
                accessibilityRole="link"
                disabled={!shouldUseBackendApi() || !deal?.brandId}
                onPress={openBrand}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
                <Text style={[styles.brand, { color: theme.foregroundEyebrow }]} numberOfLines={1}>
                  {deal?.brandPlaceholder}
                </Text>
              </Pressable>
              <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
                {deal?.title}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.foreground} />
            </Pressable>
          </View>

          <View style={styles.badges}>
            {deal ? <Badge tone={escrowTone(deal.escrowPhase)} label={escrowLifecycleLabel[deal.escrowPhase]} /> : null}
            {deal?.recommendBadge ? <Badge tone="primary" label={deal.recommendBadge} /> : null}
            {deal?.opportunityThreadId ? <Badge tone="neutral" label={t('dealsScreen.timelineLinkedBadge')} /> : null}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {showContractWarning ? <RiskBanner flags={contractRiskFlags} /> : null}

            {packetQuery.isLoading || threadQuery.isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.mutedForeground }]}>{t('dealsScreen.panelLoading')}</Text>
              </View>
            ) : null}

            <DealTermsWithContractSection
              loading={termsContract.loading}
              termLines={termLines}
              deliverableLines={deliverableLines}
              usageRights={usageRights}
              showContractBlock={showContractBlock && !showDraftInEmail}
              contractCardProps={termsContractCardProps}
            />

            <SectionCard title={t('dealsScreen.panelSummaryTitle')} subtitle={t('dealsScreen.panelSummarySubtitle')} emphasis>
              <Text style={[styles.bodyText, { color: theme.foreground }]}>{summary}</Text>
              {dealCopy?.nextMilestone ? (
                <Text style={[styles.nextMilestone, { color: theme.foregroundEyebrow }]}>{dealCopy.nextMilestone}</Text>
              ) : null}
            </SectionCard>

            {!showContractWarning ? (
              <SectionCard title={t('dealsScreen.panelRiskTitle')} subtitle={t('dealsScreen.panelRiskSubtitle')}>
                <Text style={[styles.bodyText, { color: theme.foreground }]}>{contractRisk}</Text>
                {riskItems.length > 0 ? (
                  <View style={styles.riskList}>
                    {riskItems.map((risk) => (
                      <View key={risk.id} style={styles.riskRow}>
                        <Badge tone={risk.severity === 'danger' ? 'danger' : risk.severity === 'warning' ? 'warning' : 'neutral'} label={risk.severity} />
                        <View style={styles.riskCopy}>
                          <Text style={[styles.riskLabel, { color: theme.foreground }]}>{risk.label}</Text>
                          {risk.hint ? <Text style={[styles.riskHint, { color: theme.mutedForeground }]}>{risk.hint}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </SectionCard>
            ) : null}

            {deal && fulfillmentStatus ? (
              <DealStatusStrip
                dealId={deal.id}
                status={fulfillmentStatus}
                compact={compact}
                onNavigate={(href) => {
                  onClose();
                  router.push(href as never);
                }}
              />
            ) : null}

            <SectionCard title={t('dealsScreen.panelTimelineTitle')} subtitle={thread?.subject ?? t('dealsScreen.panelTimelineSubtitle')}>
                <View style={[styles.timelineBox, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTimelineOpen((value) => !value)}
                    style={styles.timelineHeader}>
                    <View style={styles.timelineHeaderLeft}>
                      <Ionicons name="mail-outline" size={14} color={theme.foregroundEyebrow} />
                      <Text style={[styles.timelineHeaderText, { color: theme.foregroundEyebrow }]}>
                        {formatThreadToggleLabel(timelineStats, timelineItems.length, t)}
                      </Text>
                    </View>
                    <Ionicons
                      name={timelineOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={theme.mutedForeground}
                    />
                  </Pressable>

                  {timelineOpen ? (
                    <View style={styles.timelineBody}>
                      {selectedMessage ? (
                        <View>
                          <Pressable onPress={closeMessage} style={styles.msgDetailBack}>
                            <Ionicons name="arrow-back" size={16} color={theme.primary} />
                            <Text style={[styles.msgDetailBackText, { color: theme.primary }]}>
                              {t('navigation.back')}
                            </Text>
                          </Pressable>
                          <View style={[styles.msgDetailCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                            <View style={styles.msgDetailHeader}>
                              <Ionicons
                                name={selectedMessage.direction === 'outbound' ? 'arrow-up-circle-outline' : 'mail-outline'}
                                size={16}
                                color={selectedMessage.direction === 'outbound' ? theme.accentMintStrong : theme.foregroundEyebrow}
                              />
                              <Text style={[styles.msgDetailFrom, { color: theme.foreground }]}>
                                {selectedMessage.direction === 'outbound' ? t('inboxThreadDetail.youLabel') : selectedMessage.fromLabel}
                              </Text>
                              {selectedMessage.direction === 'outbound' ? (
                                <View style={[styles.replyBadge, { borderColor: theme.accentMintStrong + '66', backgroundColor: theme.accentMintSoft }]}>
                                  <Text style={[styles.replyBadgeText, { color: theme.accentMintStrong }]}>
                                    {t('inboxThreadDetail.yourReplyBadge')}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.msgDetailTime, { color: theme.foregroundEyebrow }]}>
                              {new Date(selectedMessage.sentAtISO).toLocaleString(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                            {emailQuery.isLoading ? (
                              <ActivityIndicator size="small" color={theme.primary} />
                            ) : (
                              <View style={styles.msgDetailBody}>
                                {emailQuery.data?.attachments && emailQuery.data.attachments.length > 0 ? (
                                  <EmailAttachmentsList
                                    messageId={selectedMessage.id}
                                    attachments={emailQuery.data.attachments}
                                    onSummarizePdf={
                                      matchedThreadId && selectedMessagePdfAttachments.length > 0
                                        ? summarizePdfAttachment
                                        : undefined
                                    }
                                    summarizingAttachmentId={summarizingAttachmentId}
                                  />
                                ) : null}
                                {savedDocumentForSelectedMessage && !showDraftInEmail ? (
                                  <View style={{ marginTop: spacing.sm }}>
                                    <ContractSummaryCard summary={savedDocumentForSelectedMessage} editable={false} headerStyle="attachmentFilename" />
                                  </View>
                                ) : null}
                                {contractForSelectedMessage && !showDraftInEmail ? (
                                  <View style={{ marginTop: spacing.sm }}>
                                    <ContractSummaryCard summary={contractForSelectedMessage} editable={false} headerStyle="attachmentFilename" />
                                  </View>
                                ) : null}
                                {showDraftInEmail ? (
                                  <View style={{ marginTop: spacing.sm }}>{renderContractSummaryCard('inline')}</View>
                                ) : null}
                                {(emailQuery.data?.bodyText || selectedMessage.snippet).split('\n').map((line, i) => (
                                  <Text key={i} style={[styles.msgDetailLine, { color: theme.foreground }]}>
                                    {line || ' '}
                                  </Text>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                      ) : timelineItems.length > 0 ? (
                        <View style={styles.timeline}>
                          {timelineItems.map((message: InboxMessage) => {
                            const outbound = message.direction === 'outbound';
                            const snippet = stripQuotedPlainText(message.snippet) || message.snippet;
                            return (
                              <Pressable
                                key={message.id}
                                onPress={() => openMessage(message)}
                                style={({ pressed }) => [
                                  styles.msgRow,
                                  {
                                    borderColor: outbound ? theme.accentMintStrong + '55' : theme.border,
                                    backgroundColor: outbound ? theme.accentMintSoft + 'CC' : theme.card,
                                  },
                                  outbound ? styles.msgRowOutbound : styles.msgRowInbound,
                                  pressed && { opacity: 0.88 },
                                ]}>
                                <View style={styles.msgRowTop}>
                                  <View style={styles.msgMetaGroup}>
                                    <Ionicons
                                      name={outbound ? 'arrow-up-circle-outline' : 'mail-outline'}
                                      size={14}
                                      color={outbound ? theme.accentMintStrong : theme.foregroundEyebrow}
                                    />
                                    <Text style={[styles.msgMeta, { color: theme.foregroundEyebrow, flex: 1 }]}>
                                      {outbound ? t('inboxThreadDetail.youLabel') : message.fromLabel} ·{' '}
                                      {new Date(message.sentAtISO).toLocaleString(undefined, {
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </Text>
                                  </View>
                                  {outbound ? (
                                    <View style={[styles.replyBadge, { borderColor: theme.accentMintStrong + '66', backgroundColor: theme.accentMintSoft }]}>
                                      <Text style={[styles.replyBadgeText, { color: theme.accentMintStrong }]}>
                                        {t('inboxThreadDetail.yourReplyBadge')}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={[styles.msgSnippet, { color: theme.foreground }]} numberOfLines={3}>
                                  {snippet}
                                </Text>
                                {(message.attachmentCount ?? 0) > 0 ? (
                                  <EmailAttachmentBadge count={message.attachmentCount ?? 0} />
                                ) : null}
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>
                          {t('dealsScreen.panelTimelineEmpty')}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
              </SectionCard>

            {deliveryTimeline.length > 0 ? (
              <SectionCard title={t('dealDeliveryScreen.timelineTitle')} subtitle={t('dealsScreen.panelDeliveryScheduleSubtitle')}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDeliveryOpen((v) => !v)}
                  style={styles.timelineHeader}>
                  <View style={styles.timelineHeaderLeft}>
                    <Ionicons name="calendar-outline" size={14} color={theme.foregroundEyebrow} />
                    <Text style={[styles.timelineHeaderText, { color: theme.foregroundEyebrow }]}>
                      {t('dealsScreen.panelDeliveryScheduleToggle', { count: deliveryTimeline.length })}
                    </Text>
                  </View>
                  <Ionicons
                    name={deliveryOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.mutedForeground}
                  />
                </Pressable>
                {deliveryOpen ? (
                  <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                    {deliveryTimeline.map((step) => {
                      const badge = stepBadge(step.status, t);
                      return (
                        <View key={step.id} style={[styles.stepCard, { borderColor: theme.border }]}>
                          <View style={styles.stepTop}>
                            <View style={{ flex: 1, gap: spacing.xs }}>
                              <Text style={[styles.stepTitle, { color: theme.foreground }]}>{step.title}</Text>
                              <Text style={[styles.stepDue, { color: theme.foregroundSubtitle }]}>{step.due}</Text>
                            </View>
                            <Badge tone={badge.tone} label={badge.label} />
                          </View>
                          <Badge tone="neutral" label={step.owner} />
                          <Text style={[styles.stepNote, { color: theme.mutedForeground }]}>{step.note}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </SectionCard>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
            <Pressable accessibilityRole="button" onPress={openQuickAction} style={[styles.footerBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.footerBtnLabel, { color: theme.primaryForeground }]}>
                {deal ? t(dealPanelQuickLabelKey(deal)) : t('dealsScreen.openDealCta')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openFullDeal} style={[styles.footerBtnGhost, { borderColor: theme.border }]}>
              <Text style={[styles.footerBtnGhostLabel, { color: theme.foreground }]}>{t('dealsScreen.panelOpenFullDeal')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 23, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropCompact: {
    alignItems: 'stretch',
  },
  backdropWide: {
    alignItems: 'flex-end',
  },
  sheet: {
    maxHeight: '100%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexShrink: 0,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    opacity: 0.85,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  brand: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSize.sectionTitle,
    lineHeight: lineHeight.lead,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  bodyText: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  list: {
    gap: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  listCopy: {
    flex: 1,
    gap: 2,
  },
  listLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
  listValue: {
    fontSize: fontSize.eyebrow,
    lineHeight: lineHeight.body,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.bodySmall,
  },
  timelineBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  timelineHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timelineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  timelineHeaderText: {
    fontSize: fontSize.bodySmall,
    fontWeight: '800',
  },
  timelineBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  timeline: {
    gap: spacing.sm,
  },
  // ── inbox-style message cards ──
  msgRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  msgRowInbound: {
    borderLeftWidth: 2,
  },
  msgRowOutbound: {
    borderLeftWidth: 2,
    marginLeft: spacing.sm,
  },
  msgRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  msgMetaGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  msgMeta: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  replyBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  replyBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  msgSnippet: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
  },
  // ── message detail ──
  msgDetailBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  msgDetailBackText: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
  },
  msgDetailCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  msgDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  msgDetailFrom: {
    fontSize: fontSize.body,
    fontWeight: '700',
    flex: 1,
  },
  msgDetailTime: {
    fontSize: fontSize.caption,
  },
  msgDetailBody: {},
  msgDetailLine: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
  },
  // ── delivery timeline ──
  stepCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepTitle: { fontSize: fontSize.body, fontWeight: '700' },
  stepDue: { fontSize: fontSize.caption, fontWeight: '600' },
  stepNote: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  termGrid: { gap: spacing.sm },
  termRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs / 2,
  },
  termLabel: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  termValue: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  riskList: {
    gap: spacing.sm,
  },
  riskRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  riskCopy: {
    flex: 1,
    gap: 2,
  },
  riskLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
  riskHint: {
    fontSize: fontSize.eyebrow,
    lineHeight: lineHeight.body,
  },
  nextMilestone: {
    marginTop: spacing.sm,
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
    lineHeight: lineHeight.body,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  footerBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  footerBtnGhost: {
    minHeight: 40,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  footerBtnLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerBtnGhostLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
});