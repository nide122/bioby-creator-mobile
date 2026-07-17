import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { alertAction } from '@/src/lib/app-dialog';
import {
  Badge,
  getTextInputProps,
  getTextInputStyle,
  HubCallout,
  HubLinkGroup,
  HubScreen,
  QueryRetryCard,
  SectionCard,
  type BadgeTone,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { submitDealVerification, approveDealVerification } from '@/src/api/deals-api';
import {
  invalidateDealClosureArtifacts,
  invalidateDealWorkspaceQueries,
} from '@/src/lib/invalidate-deal-queries';
import { getActiveTenantPublicId, tenantQueryKey } from '@/src/lib/tenant-query';
import { useDealWorkspaceFocusRefresh, useDealWorkspaceRefresh } from '@/src/hooks/use-deal-refresh';
import { useDealPacket } from '@/src/hooks/use-deal-packet';
import { useDealDetail } from '@/src/hooks/use-deals';
import {
  canSubmitVerification,
  evidenceStatusFromForm,
  isValidPostLink,
  isUserConfirmChecklistId,
  mergeEvidenceStatuses,
  allUserChecksConfirmed,
  resolveVerificationChecklist,
  type ChecklistConfirmations,
  type UserConfirmChecklistId,
} from '@/src/lib/verification-submit-eligibility';
import { VerificationChecklistRow } from '@/components/deals/VerificationChecklistRow';
import { cooperationLeadLine } from '@/src/lib/cooperation-display-name';

type VerificationStatus = 'done' | 'reviewing' | 'missing';

const EVIDENCE_DEFS: { id: string; status: VerificationStatus }[] = [
  { id: 'post-link', status: 'missing' },
  { id: 'screenshot', status: 'missing' },
  { id: 'metrics', status: 'missing' },
];

const CHECKLIST_DEFS: { id: string; passed: boolean }[] = [
  { id: 'fit', passed: true },
  { id: 'quality', passed: true },
  { id: 'response', passed: true },
  { id: 'published', passed: true },
  { id: 'format', passed: false },
  { id: 'access', passed: true },
  { id: 'compliance', passed: true },
];

export default function DealVerificationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ dealId?: string | string[] }>();
  const dealId = Array.isArray(params.dealId) ? params.dealId[0] : params.dealId;
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [postLink, setPostLink] = useState('');
  const [screenshotAttested, setScreenshotAttested] = useState(false);
  const [firstDayMetrics, setFirstDayMetrics] = useState('');
  const [creatorNote, setCreatorNote] = useState('');
  const [checklistConfirmations, setChecklistConfirmations] = useState<ChecklistConfirmations>({});
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();
  const dealQuery = useDealDetail(dealId);
  const packetQuery = useDealPacket(dealId);
  const { refreshing, onRefresh } = useDealWorkspaceRefresh(dealId);
  useDealWorkspaceFocusRefresh(dealId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (packetQuery.data?.packet.verification?.submittedAt) {
      setSubmitted(true);
    }
  }, [packetQuery.data?.packet.verification?.submittedAt]);

  function evidenceTitle(id: string) {
    switch (id) {
      case 'post-link':
        return t('dealVerificationScreen.postLinkTitle');
      case 'screenshot':
        return t('dealVerificationScreen.screenshotTitle');
      case 'metrics':
        return t('dealVerificationScreen.metricsEvidenceTitle');
      default:
        return id;
    }
  }

  function evidenceDescription(id: string) {
    switch (id) {
      case 'post-link':
        return t('dealVerificationScreen.postLinkDesc');
      case 'screenshot':
        return t('dealVerificationScreen.screenshotDesc');
      case 'metrics':
        return t('dealVerificationScreen.metricsEvidenceDesc');
      default:
        return '';
    }
  }

  function checklistLabel(id: string) {
    switch (id) {
      case 'fit':
        return t('dealVerificationScreen.checkFit');
      case 'quality':
        return t('dealVerificationScreen.checkQuality');
      case 'response':
        return t('dealVerificationScreen.checkResponse');
      case 'published':
        return t('dealVerificationScreen.checkPublished');
      case 'format':
        return t('dealVerificationScreen.checkFormat');
      case 'access':
        return t('dealVerificationScreen.checkAccess');
      case 'compliance':
        return t('dealVerificationScreen.checkCompliance');
      default:
        return id;
    }
  }

  function verificationStatusCopy(status: VerificationStatus): { label: string; tone: BadgeTone } {
    switch (status) {
      case 'done':
        return { label: t('dealVerificationScreen.statusComplete'), tone: 'mint' };
      case 'reviewing':
        return { label: t('dealVerificationScreen.statusReviewing'), tone: 'warning' };
      default:
        return { label: t('dealVerificationScreen.statusMissing'), tone: 'danger' };
    }
  }

  const apiEvidence = packetQuery.data?.packet.verification?.evidence;
  const baseEvidence =
    apiEvidence && apiEvidence.length > 0 ? apiEvidence : EVIDENCE_DEFS;
  const apiChecklist = packetQuery.data?.packet.verification?.checklist;
  const baseChecklist =
    apiChecklist && apiChecklist.length > 0 ? apiChecklist : CHECKLIST_DEFS;
  const postLinkValid = isValidPostLink(postLink);
  const resolvedChecklist = useMemo(
    () => resolveVerificationChecklist(baseChecklist, checklistConfirmations, postLinkValid),
    [baseChecklist, checklistConfirmations, postLinkValid],
  );
  const payoutHint = packetQuery.data?.packet.verification?.payoutHint;
  const brandReviewStatus = packetQuery.data?.packet.verification?.brandReviewStatus;
  const brandReviewPending =
    submitted && brandReviewStatus !== 'approved' && dealQuery.data?.escrowPhase === 'pending_verification';

  const phaseAllowsSubmit = dealQuery.data?.escrowPhase === 'pending_verification';
  const formInput = useMemo(
    () => ({
      postLink,
      screenshotAttested,
      firstDayMetrics,
      creatorNote,
    }),
    [postLink, screenshotAttested, firstDayMetrics, creatorNote],
  );
  const canSubmit = canSubmitVerification(formInput, phaseAllowsSubmit, resolvedChecklist);
  const visibleEvidence = useMemo(
    () =>
      mergeEvidenceStatuses(
        baseEvidence,
        evidenceStatusFromForm(formInput, submitted),
        submitted,
      ),
    [baseEvidence, formInput, submitted],
  );

  const completedEvidence = visibleEvidence.filter((item) => item.status === 'done').length;
  const passedChecks = resolvedChecklist.filter((item) => item.passed).length;

  const toggleChecklistItem = useCallback((id: UserConfirmChecklistId) => {
    setChecklistConfirmations((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }, []);

  const registerScreenshotProof = useCallback(() => {
    setScreenshotAttested(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || submitted || submitting || !dealId) return;
    const payload = {
      postLink: postLink.trim(),
      firstDayMetrics: firstDayMetrics.trim(),
      creatorNote: creatorNote.trim(),
    };
    if (shouldUseBackendApi() && /^\d+$/.test(dealId)) {
      setSubmitting(true);
      void submitDealVerification(dealId, payload)
        .then(() => {
          setSubmitted(true);
          invalidateDealWorkspaceQueries(queryClient, dealId);
          void queryClient.invalidateQueries({ queryKey: ['payments'] });
          void alertAction(
            t('dealVerificationScreen.submitAlertTitle'),
            t('dealVerificationScreen.submitAlertBody'),
          );
        })
        .catch(() => {
          void alertAction(
            t('dealVerificationScreen.submitErrorTitle'),
            t('dealVerificationScreen.submitErrorBody'),
          );
        })
        .finally(() => setSubmitting(false));
      return;
    }
    setSubmitted(true);
    void alertAction(t('dealVerificationScreen.submitAlertTitle'), t('dealVerificationScreen.submitAlertBody'));
  }, [
    canSubmit,
    creatorNote,
    dealId,
    firstDayMetrics,
    postLink,
    queryClient,
    submitted,
    submitting,
    t,
  ]);

  const submitFooter =
    !submitted ? (
      <View
        style={[styles.stickyFooter, { borderColor: theme.border, backgroundColor: theme.background }]}>
        {!phaseAllowsSubmit ? (
          <Text style={[styles.footerHint, { color: theme.mutedForeground }]}>
            {t('dealVerificationScreen.deliveryIncompleteHint')}
          </Text>
        ) : !canSubmit ? (
          <Text style={[styles.footerHint, { color: theme.mutedForeground }]}>
            {!allUserChecksConfirmed(resolvedChecklist)
              ? t('dealVerificationScreen.checklistBlockedHint')
              : t('dealVerificationScreen.submitBlockedHint')}
          </Text>
        ) : null}
        <Pressable
          testID="deal-verification-submit"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit || submitting || !phaseAllowsSubmit }}
          disabled={!canSubmit || submitting || !phaseAllowsSubmit}
          onPress={handleSubmit}
          style={[
            styles.primary,
            {
              backgroundColor: theme.primary,
              opacity: !canSubmit || submitting || !phaseAllowsSubmit ? 0.45 : 1,
            },
          ]}>
          {submitting ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('dealVerificationScreen.ctaSubmit')}
            </Text>
          )}
        </Pressable>
      </View>
    ) : null;

  if (!dealId) {
    return (
      <PlaceholderScreen
        title={t('dealVerificationScreen.missingTitle')}
        description={t('dealVerificationScreen.missingDesc')}
      />
    );
  }

  if (packetQuery.isPending && !packetQuery.data) {
    return (
      <HubScreen
        eyebrow={t('tabs.deals')}
        title={t('dealVerificationScreen.title')}
        refreshing={refreshing}
        onRefresh={onRefresh}>
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel={t('dealVerificationScreen.loadingA11y')} color={theme.primary} />
        </View>
      </HubScreen>
    );
  }

  if (packetQuery.error) {
    return (
      <PlaceholderScreen
        title={t('dealVerificationScreen.loadFailedTitle')}
        description={t('dealVerificationScreen.loadFailedDesc')}>
        <QueryRetryCard message={packetQuery.error.message} onRetry={() => packetQuery.refetch()} />
      </PlaceholderScreen>
    );
  }

  const dealTitle = dealQuery.data?.title ?? packetQuery.data?.title;

  return (
    <HubScreen
      eyebrow={t('tabs.deals')}
      title={t('dealVerificationScreen.title')}
      lead={
        dealTitle
          ? cooperationLeadLine(dealQuery.data?.brandPlaceholder ?? packetQuery.data?.brandPlaceholder, dealTitle)
          : payoutHint ?? t('dealVerificationScreen.description')
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      fixedFooter={submitFooter}
      scrollBottomInset={submitFooter ? 108 : undefined}>
      <View style={[styles.summary, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[styles.summaryTitle, { color: theme.foreground }]}>
              {submitted
                ? t('dealVerificationScreen.summarySubmittedTitle')
                : t('dealVerificationScreen.summaryMissingTitle')}
            </Text>
            <Text style={[styles.summaryCopy, { color: theme.mutedForeground }]}>
              {submitted
                ? brandReviewPending
                  ? t('dealVerificationScreen.brandReviewPendingHint')
                  : t('dealVerificationScreen.summarySubmittedCopy')
                : t('dealVerificationScreen.summaryDraftCopy')}
            </Text>
          </View>
          <Badge
            tone={submitted ? 'mint' : 'warning'}
            label={
              submitted ? t('dealVerificationScreen.badgeReviewing') : t('dealVerificationScreen.badgeMissingData')
            }
          />
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text style={[styles.progressValue, { color: theme.primary }]}>
              {completedEvidence}/{EVIDENCE_DEFS.length}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.foregroundSubtitle }]}>
              {t('dealVerificationScreen.progressEvidence')}
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressValue, { color: theme.primary }]}>
              {passedChecks}/{resolvedChecklist.length}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.foregroundSubtitle }]}>
              {t('dealVerificationScreen.progressChecks')}
            </Text>
          </View>
        </View>
      </View>

      {!phaseAllowsSubmit && !submitted ? (
        <>
          <HubCallout body={t('dealVerificationScreen.deliveryIncompleteHint')} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/deal/${dealId}/delivery` as Href)}
            style={[styles.primary, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('dealVerificationScreen.ctaContinueDelivery')}
            </Text>
          </Pressable>
        </>
      ) : null}

      <SectionCard title={t('dealVerificationScreen.neededEvidenceTitle')} emphasis>
        <View style={{ gap: spacing.md }}>
          {visibleEvidence.map((item) => {
            const copy = verificationStatusCopy(item.status);
            const canEditEvidence = !submitted && phaseAllowsSubmit;
            return (
              <View
                key={item.id}
                style={[styles.evidenceRow, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text style={[styles.evidenceTitle, { color: theme.foreground }]}>
                        {evidenceTitle(item.id)}
                      </Text>
                      <Text style={[styles.evidenceDesc, { color: theme.mutedForeground }]}>
                        {evidenceDescription(item.id)}
                      </Text>
                    </View>
                    <Badge tone={copy.tone} label={copy.label} />
                  </View>
                  {item.id === 'post-link' && canEditEvidence ? (
                    <TextInput
                      value={postLink}
                      onChangeText={setPostLink}
                      placeholder={t('dealVerificationScreen.placeholderPostLink')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      {...getTextInputProps(theme)}
                      style={getTextInputStyle(theme)}
                    />
                  ) : null}
                  {item.id === 'screenshot' && canEditEvidence ? (
                    <View style={{ gap: spacing.sm }}>
                      <Pressable
                        testID="deal-verification-upload-screenshot"
                        accessibilityRole="button"
                        disabled={screenshotAttested}
                        onPress={registerScreenshotProof}
                        style={[
                          styles.uploadProofButton,
                          {
                            borderColor: screenshotAttested ? theme.border : theme.primary,
                            backgroundColor: screenshotAttested ? theme.card : theme.primary,
                            opacity: screenshotAttested ? 0.72 : 1,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.uploadProofLabel,
                            { color: screenshotAttested ? theme.foreground : theme.primaryForeground },
                          ]}>
                          {screenshotAttested
                            ? t('dealVerificationScreen.screenshotUploaded')
                            : t('dealVerificationScreen.screenshotUploadCta')}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: screenshotAttested }}
                        onPress={() => setScreenshotAttested((value) => !value)}
                        style={[
                          styles.attestRow,
                          {
                            borderColor: screenshotAttested ? theme.primary : theme.border,
                            backgroundColor: screenshotAttested ? theme.accentMintSoft : theme.card,
                          },
                        ]}>
                        <View style={[styles.attestBox, { borderColor: theme.primary }]}>
                          {screenshotAttested ? (
                            <View style={[styles.attestDot, { backgroundColor: theme.primary }]} />
                          ) : null}
                        </View>
                        <Text style={[styles.attestLabel, { color: theme.foreground }]}>
                          {t('dealVerificationScreen.screenshotAttestLabel')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {item.id === 'metrics' && canEditEvidence ? (
                    <TextInput
                      value={firstDayMetrics}
                      onChangeText={setFirstDayMetrics}
                      placeholder={t('dealVerificationScreen.placeholderMetrics')}
                      {...getTextInputProps(theme)}
                      style={getTextInputStyle(theme, { multiline: true, minHeight: 88 })}
                      multiline
                      textAlignVertical="top"
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
          {phaseAllowsSubmit && !submitted ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.inputLabel, { color: theme.foregroundSubtitle }]}>
                {t('dealVerificationScreen.labelNote')}
              </Text>
              <TextInput
                value={creatorNote}
                onChangeText={setCreatorNote}
                placeholder={t('dealVerificationScreen.placeholderNote')}
                {...getTextInputProps(theme)}
                style={getTextInputStyle(theme, { multiline: true, minHeight: 88 })}
                multiline
                textAlignVertical="top"
              />
            </View>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard title={t('dealVerificationScreen.preflightTitle')} emphasis>
        <View style={{ gap: spacing.sm }}>
          {resolvedChecklist.map((item) => (
            <VerificationChecklistRow
              key={item.id}
              testID={item.userConfirmable ? `deal-verification-check-${item.id}` : undefined}
              label={checklistLabel(item.id)}
              passed={item.passed}
              userConfirmable={item.userConfirmable}
              interactive={!submitted && phaseAllowsSubmit}
              passLabel={t('dealVerificationScreen.checkPass')}
              confirmLabel={t('dealVerificationScreen.checkConfirmCta')}
              pendingLabel={t('dealVerificationScreen.checkPending')}
              onToggle={
                item.userConfirmable && isUserConfirmChecklistId(item.id)
                  ? () => toggleChecklistItem(item.id)
                  : undefined
              }
            />
          ))}
          {!submitted && phaseAllowsSubmit && !allUserChecksConfirmed(resolvedChecklist) ? (
            <Text style={[styles.submitHint, { color: theme.mutedForeground }]}>
              {t('dealVerificationScreen.checklistBlockedHint')}
            </Text>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title={t('dealVerificationScreen.whyNotDirectTitle')}
        subtitle={t('dealVerificationScreen.whyNotDirectSubtitle')}>
        <View style={styles.gateGrid}>
          <View style={[styles.gateCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="mint" label={t('dealVerificationScreen.badgePrecheck')} />
            <Text style={[styles.gateTitle, { color: theme.foreground }]}>
              {t('dealVerificationScreen.precheckFindGapsTitle')}
            </Text>
            <Text style={[styles.evidenceDesc, { color: theme.mutedForeground }]}>
              {t('dealVerificationScreen.precheckFindGapsHint')}
            </Text>
          </View>
          <View style={[styles.gateCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="warning" label={t('dealVerificationScreen.badgeYouConfirm')} />
            <Text style={[styles.gateTitle, { color: theme.foreground }]}>
              {t('dealVerificationScreen.youApproveTitle')}
            </Text>
            <Text style={[styles.evidenceDesc, { color: theme.mutedForeground }]}>
              {t('dealVerificationScreen.youApproveHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t('dealVerificationScreen.aiPrecheckTitle')}>
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.evidenceRow, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[styles.evidenceTitle, { color: theme.foreground }]}>
                {t('dealVerificationScreen.foundLinksTitle')}
              </Text>
              <Text style={[styles.evidenceDesc, { color: theme.mutedForeground }]}>
                {submitted
                  ? t('dealVerificationScreen.foundLinksHintSubmitted')
                  : canSubmit
                    ? t('dealVerificationScreen.foundLinksHintReady')
                    : t('dealVerificationScreen.foundLinksHint')}
              </Text>
            </View>
            <Badge
              tone={submitted || canSubmit ? 'mint' : 'warning'}
              label={
                submitted || canSubmit
                  ? t('dealVerificationScreen.badgeFound')
                  : t('dealVerificationScreen.badgePendingConfirm')
              }
            />
          </View>
        </View>
      </SectionCard>

      <HubLinkGroup
        title={t('hubLinks.actions')}
        links={[
          {
            label: t('dealVerificationScreen.ctaBackDelivery'),
            href: `/deal/${dealId}/delivery` as Href,
            icon: 'cube-outline',
          },
        ]}
      />

      {submitted ? (
        <HubLinkGroup
          title={t('dealVerificationScreen.afterSubmitTitle')}
          links={[
            ...(shouldUseBackendApi() && dealId && /^\d+$/.test(dealId) && brandReviewPending
              ? [
                  {
                    label: t('dealVerificationScreen.ctaBrandApprove'),
                    icon: 'checkmark-done-outline' as const,
                    detailAccent: true,
                    onPress: () => {
                      if (submitting) return;
                      setSubmitting(true);
                      void approveDealVerification(dealId)
                        .then(() => {
                          invalidateDealWorkspaceQueries(queryClient, dealId);
                          invalidateDealClosureArtifacts(queryClient);
                          void queryClient.invalidateQueries({
                            queryKey: tenantQueryKey(getActiveTenantPublicId(), 'decisions'),
                          });
                          void alertAction(
                            t('dealVerificationScreen.approveAlertTitle'),
                            t('dealVerificationScreen.approveAlertBody')
                          );
                          router.replace(`/deal/${dealId}` as Href);
                        })
                        .catch(() => {
                          void alertAction(
                            t('dealVerificationScreen.approveErrorTitle'),
                            t('dealVerificationScreen.approveErrorBody')
                          );
                        })
                        .finally(() => setSubmitting(false));
                    },
                  },
                ]
              : []),
            { label: t('dealVerificationScreen.ctaPayments'), href: '/payments', icon: 'wallet-outline' },
            { label: t('dealVerificationScreen.ctaDisputes'), href: '/disputes', icon: 'lock-closed-outline' },
          ]}
        />
      ) : null}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
  summary: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  summaryTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  summaryTitle: { fontSize: fontSize.cardTitle, fontWeight: '700' },
  summaryCopy: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  progressRow: { flexDirection: 'row', gap: spacing.md },
  progressItem: { flex: 1, gap: spacing.xs },
  progressValue: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progressLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  evidenceRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  evidenceTitle: { fontSize: fontSize.body, fontWeight: '700' },
  evidenceDesc: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  gateGrid: { flexDirection: 'row', gap: spacing.sm },
  gateCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  gateTitle: { fontSize: fontSize.bodySmall, fontWeight: '800', lineHeight: lineHeight.body },
  inputLabel: { fontSize: fontSize.caption, fontWeight: '700', marginTop: spacing.xs },
  uploadProofButton: {
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  uploadProofLabel: { fontSize: fontSize.body, fontWeight: '700' },
  attestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  attestBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attestDot: { width: 10, height: 10, borderRadius: 5 },
  attestLabel: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body, fontWeight: '600' },
  submitHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  footerHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body, textAlign: 'center' },
  actions: { gap: spacing.sm },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
});
