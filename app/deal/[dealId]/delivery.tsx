import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import {
  Badge,
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
import { alertAction } from '@/src/lib/app-dialog';
import { registerDealDeliveryUpload } from '@/src/api/deals-api';
import {
  asDeliveryUploadId,
  deliveryUploadCopyKey,
  isUploadRegistered,
  type DeliveryUploadId,
} from '@/src/lib/delivery-upload-steps';
import {
  localizeDeliveryFeedbackNote,
  localizeDeliveryTimeline,
  localizeDeliveryUploads,
  localizeDeliveryUploadState,
} from '@/src/lib/delivery-workflow-i18n';
import { invalidateDealWorkspaceQueries } from '@/src/lib/invalidate-deal-queries';
import { useDealWorkspaceFocusRefresh, useDealWorkspaceRefresh } from '@/src/hooks/use-deal-refresh';
import { useDealPacket } from '@/src/hooks/use-deal-packet';
import { useDealDetail } from '@/src/hooks/use-deals';
import { cooperationLeadLine } from '@/src/lib/cooperation-display-name';

type StepStatus = 'done' | 'current' | 'blocked' | 'upcoming';

function uploadStateLabel(t: TFunction, id: string, state: string): string {
  const stepId = asDeliveryUploadId(id);
  const localized = localizeDeliveryUploadState(state, id, t);
  if (localized !== state.trim()) {
    return localized;
  }
  if (!stepId) return state;
  if (isUploadRegistered(state)) {
    return t(deliveryUploadCopyKey(stepId, 'stateDone'));
  }
  return t(deliveryUploadCopyKey(stepId, 'statePending'));
}

function uploadDoneBadgeLabel(t: TFunction, id: DeliveryUploadId): string {
  switch (id) {
    case 'script':
      return t('dealDeliveryScreen.uploadSteps.script.badgeDone');
    case 'rough':
      return t('dealDeliveryScreen.uploadSteps.rough.badgeDone');
    case 'final':
      return t('dealDeliveryScreen.uploadSteps.final.badgeDone');
  }
}

export default function DealDeliveryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ dealId?: string | string[] }>();
  const dealId = Array.isArray(params.dealId) ? params.dealId[0] : params.dealId;
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const queryClient = useQueryClient();
  const dealQuery = useDealDetail(dealId);
  const packetQuery = useDealPacket(dealId);
  const { refreshing, onRefresh } = useDealWorkspaceRefresh(dealId);
  useDealWorkspaceFocusRefresh(dealId);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const canRegisterUpload =
    shouldUseBackendApi() && !!dealId && /^\d+$/.test(dealId);

  const onRegisterUpload = (uploadId: string, title: string) => {
    if (!canRegisterUpload || uploadingId) return;
    const stepId = asDeliveryUploadId(uploadId);
    const alreadyUploaded = isUploadRegistered(
      resolvedUploads.find((u) => u.id === uploadId)?.state ?? ''
    );
    if (alreadyUploaded || !stepId) return;
    setUploadingId(uploadId);
    void registerDealDeliveryUpload(dealId as string, { uploadId, title })
      .then(() => {
        invalidateDealWorkspaceQueries(queryClient, dealId as string);
        void alertAction(
          t(deliveryUploadCopyKey(stepId, 'successTitle')),
          t(deliveryUploadCopyKey(stepId, 'successBody'))
        );
      })
      .catch(() => {
        void alertAction(t('dealDeliveryScreen.uploadErrorTitle'), t('dealDeliveryScreen.uploadErrorBody'));
      })
      .finally(() => setUploadingId(null));
  };

  const timeline = useMemo(
    () =>
      [
        {
          id: 'brief',
          title: t('dealDeliveryScreen.stepBriefTitle'),
          due: t('dealDeliveryScreen.stepBriefDue'),
          status: 'done' as const,
          owner: t('dealDeliveryScreen.stepOwnerYou'),
          note: t('dealDeliveryScreen.stepBriefNote'),
        },
        {
          id: 'script',
          title: t('dealDeliveryScreen.stepScriptTitle'),
          due: t('dealDeliveryScreen.stepScriptDue'),
          status: 'done' as const,
          owner: t('dealDeliveryScreen.stepOwnerCreator'),
          note: t('dealDeliveryScreen.stepScriptNote'),
        },
        {
          id: 'rough-cut',
          title: t('dealDeliveryScreen.stepRoughTitle'),
          due: t('dealDeliveryScreen.stepRoughDue'),
          status: 'current' as const,
          owner: t('dealDeliveryScreen.stepOwnerBrand'),
          note: t('dealDeliveryScreen.stepRoughNote'),
        },
        {
          id: 'final',
          title: t('dealDeliveryScreen.stepFinalTitle'),
          due: t('dealDeliveryScreen.stepFinalDue'),
          status: 'upcoming' as const,
          owner: t('dealDeliveryScreen.stepOwnerCreator'),
          note: t('dealDeliveryScreen.stepFinalNote'),
        },
      ] satisfies {
        id: string;
        title: string;
        due: string;
        status: StepStatus;
        owner: string;
        note: string;
      }[],
    [t],
  );

  const apiTimeline = packetQuery.data?.packet.delivery?.timeline;
  const resolvedTimeline = useMemo(() => {
    const raw = apiTimeline && apiTimeline.length > 0 ? apiTimeline : timeline;
    return localizeDeliveryTimeline(raw, t);
  }, [apiTimeline, timeline, t]);

  const uploadItems = useMemo(
    () => [
      {
        id: 'script',
        title: t('dealDeliveryScreen.fileScriptTitle'),
        state: 'Not started',
      },
      {
        id: 'rough',
        title: t('dealDeliveryScreen.fileRoughTitle'),
        state: 'Not started',
      },
      {
        id: 'final',
        title: t('dealDeliveryScreen.fileFinalTitle'),
        state: 'Not started',
      },
    ],
    [t],
  );

  const apiUploads = packetQuery.data?.packet.delivery?.uploads;
  const resolvedUploads = useMemo(() => {
    const raw = apiUploads && apiUploads.length > 0 ? apiUploads : uploadItems;
    return localizeDeliveryUploads(raw, t);
  }, [apiUploads, uploadItems, t]);
  const feedbackNote = packetQuery.data?.packet.delivery?.feedbackNote;
  const localizedFeedbackNote = useMemo(
    () => localizeDeliveryFeedbackNote(feedbackNote, t),
    [feedbackNote, t]
  );
  const escrowPhase = dealQuery.data?.escrowPhase;
  const needsPrepay = escrowPhase === 'awaiting_prepay';
  const nextUpload = resolvedUploads.find((item) => !isUploadRegistered(item.state));
  const uploadedCount = resolvedUploads.filter((item) => isUploadRegistered(item.state)).length;
  const allUploadsDone =
    resolvedUploads.length > 0 && resolvedUploads.every((item) => isUploadRegistered(item.state));
  const canOpenVerification =
    escrowPhase === 'pending_verification' || (!needsPrepay && allUploadsDone);

  const screenGuide = useMemo(() => {
    if (needsPrepay) {
      return {
        title: t('dealDeliveryScreen.prepayTitle'),
        heroTitle: t('dealDeliveryScreen.prepayHero'),
        heroCopy: t('dealDeliveryScreen.prepayCopy'),
        badgeTone: 'warning' as BadgeTone,
        badgeLabel: t('dealDeliveryScreen.badgePrepay'),
        nextStepId: null as DeliveryUploadId | null,
      };
    }
    if (canOpenVerification) {
      return {
        title: t('dealDeliveryScreen.readyVerificationTitle'),
        heroTitle: t('dealDeliveryScreen.readyVerificationHero'),
        heroCopy: localizedFeedbackNote ?? t('dealDeliveryScreen.readyVerificationCopy'),
        badgeTone: 'mint' as BadgeTone,
        badgeLabel: t('dealDeliveryScreen.badgeReady'),
        nextStepId: null as DeliveryUploadId | null,
      };
    }
    if (nextUpload) {
      const stepId = asDeliveryUploadId(nextUpload.id);
      const stepGuide = stepId ? t(deliveryUploadCopyKey(stepId, 'guide')) : t('dealDeliveryScreen.uploadCopy');
      return {
        title: t('dealDeliveryScreen.uploadProgressTitle'),
        heroTitle: stepId
          ? t(deliveryUploadCopyKey(stepId, 'primaryCta'))
          : t('dealDeliveryScreen.uploadHero', { file: nextUpload.title }),
        heroCopy: localizedFeedbackNote ?? stepGuide,
        badgeTone: 'primary' as BadgeTone,
        badgeLabel: t('dealDeliveryScreen.badgeActionRequired'),
        nextStepId: stepId,
      };
    }
    return {
      title: t('dealDeliveryScreen.title'),
      heroTitle: t('dealDeliveryScreen.heroTitle'),
      heroCopy: localizedFeedbackNote ?? t('dealDeliveryScreen.heroCopy'),
      badgeTone: 'warning' as BadgeTone,
      badgeLabel: t('dealDeliveryScreen.badgeWaiting'),
      nextStepId: null as DeliveryUploadId | null,
    };
  }, [canOpenVerification, localizedFeedbackNote, needsPrepay, nextUpload, t]);

  function stepBadge(status: StepStatus): { label: string; tone: BadgeTone } {
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

  if (!dealId) {
    return (
      <PlaceholderScreen
        title={t('dealDeliveryScreen.missingTitle')}
        description={t('dealDeliveryScreen.missingDesc')}
      />
    );
  }

  if (packetQuery.isPending && !packetQuery.data) {
    return (
      <HubScreen
        eyebrow={t('tabs.deals')}
        title={t('dealDeliveryScreen.title')}
        refreshing={refreshing}
        onRefresh={onRefresh}>
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel={t('dealDeliveryScreen.loadingA11y')} color={theme.primary} />
        </View>
      </HubScreen>
    );
  }

  if (packetQuery.error) {
    return (
      <PlaceholderScreen
        title={t('dealDeliveryScreen.loadFailedTitle')}
        description={t('dealDeliveryScreen.loadFailedDesc')}>
        <QueryRetryCard message={packetQuery.error.message} onRetry={() => packetQuery.refetch()} />
      </PlaceholderScreen>
    );
  }

  const dealTitle = dealQuery.data?.title ?? packetQuery.data?.title;

  return (
    <HubScreen
      eyebrow={t('tabs.deals')}
      title={screenGuide.title}
      lead={
        dealTitle
          ? cooperationLeadLine(dealQuery.data?.brandPlaceholder ?? packetQuery.data?.brandPlaceholder, dealTitle)
          : t('dealDeliveryScreen.description')
      }
      refreshing={refreshing}
      onRefresh={onRefresh}>
      {!canRegisterUpload ? (
        <HubCallout body={t('dealDeliveryScreen.demoModeHint')} />
      ) : null}

      <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={[styles.heroTitle, { color: theme.foreground }]}>
            {screenGuide.heroTitle}
          </Text>
          <Text style={[styles.heroCopy, { color: theme.mutedForeground }]}>
            {screenGuide.heroCopy}
          </Text>
          {nextUpload && !needsPrepay && !canOpenVerification ? (
            <Text style={[styles.heroCopy, { color: theme.foregroundSubtitle, fontWeight: '600' }]}>
              {t('dealDeliveryScreen.uploadOrderHint', {
                current: uploadedCount + 1,
                total: resolvedUploads.length,
                file: nextUpload.title,
              })}
            </Text>
          ) : null}
        </View>
        <Badge tone={screenGuide.badgeTone} label={screenGuide.badgeLabel} />
      </View>

      {needsPrepay ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/deal/${dealId}` as Href)}
          style={[styles.primary, { backgroundColor: theme.primary }]}>
          <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
            {t('dealDeliveryScreen.ctaCollectPrepay')}
          </Text>
        </Pressable>
      ) : canOpenVerification ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/deal/${dealId}/verification` as Href)}
          style={[styles.primary, { backgroundColor: theme.primary }]}>
          <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
            {t('dealDeliveryScreen.ctaGoVerification')}
          </Text>
        </Pressable>
      ) : nextUpload && canRegisterUpload && screenGuide.nextStepId ? (
        <Pressable
          accessibilityRole="button"
          disabled={!!uploadingId}
          onPress={() => onRegisterUpload(nextUpload.id, nextUpload.title)}
          style={[styles.primary, { backgroundColor: theme.primary, opacity: uploadingId ? 0.6 : 1 }]}>
          {uploadingId === nextUpload.id ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t(deliveryUploadCopyKey(screenGuide.nextStepId, 'primaryCta'))}
            </Text>
          )}
        </Pressable>
      ) : null}

      <SectionCard title={t('dealDeliveryScreen.nowWhatTitle')} emphasis>
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.feedbackCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={styles.feedbackTop}>
              <Badge
                tone={canOpenVerification ? 'mint' : needsPrepay ? 'warning' : 'primary'}
                label={
                  canOpenVerification
                    ? t('dealDeliveryScreen.badgeReady')
                    : needsPrepay
                      ? t('dealDeliveryScreen.badgePrepay')
                      : t('dealDeliveryScreen.badgeActionRequired')
                }
              />
            </View>
            <Text style={[styles.feedbackBody, { color: theme.foreground }]}>
              {screenGuide.heroCopy}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t('dealDeliveryScreen.rulesTitle')}>
        <View style={styles.ruleGrid}>
          <View style={[styles.ruleCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="mint" label={t('dealDeliveryScreen.badgeRoutine')} />
            <Text style={[styles.ruleTitle, { color: theme.foreground }]}>
              {t('dealDeliveryScreen.ruleSilenceTitle')}
            </Text>
            <Text style={[styles.ruleHint, { color: theme.mutedForeground }]}>
              {t('dealDeliveryScreen.ruleSilenceHint')}
            </Text>
          </View>
          <View style={[styles.ruleCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Badge tone="warning" label={t('dealDeliveryScreen.badgeNeedsConfirm')} />
            <Text style={[styles.ruleTitle, { color: theme.foreground }]}>
              {t('dealDeliveryScreen.ruleScopeTitle')}
            </Text>
            <Text style={[styles.ruleHint, { color: theme.mutedForeground }]}>
              {t('dealDeliveryScreen.ruleScopeHint')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t('dealDeliveryScreen.timelineTitle')}>
        <View style={{ gap: spacing.md }}>
          {resolvedTimeline.map((step) => {
            const badge = stepBadge(step.status);
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
      </SectionCard>

      <SectionCard title={t('dealDeliveryScreen.filesTitle')}>
        <View style={{ gap: spacing.sm }}>
          {resolvedUploads.map((item, index) => {
            const uploaded = isUploadRegistered(item.state);
            const isNext = !uploaded && item.id === nextUpload?.id;
            const stepId = asDeliveryUploadId(item.id);
            const RowWrapper = canRegisterUpload && !uploaded && !needsPrepay ? Pressable : View;
            return (
              <RowWrapper
                key={item.id}
                accessibilityRole={canRegisterUpload && !uploaded && !needsPrepay ? 'button' : undefined}
                disabled={!!uploadingId || uploaded || needsPrepay}
                onPress={
                  canRegisterUpload && !uploaded && !needsPrepay && stepId
                    ? () => onRegisterUpload(item.id, item.title)
                    : undefined
                }
                style={[
                  styles.uploadRow,
                  {
                    borderColor: isNext ? theme.primary : theme.border,
                    backgroundColor: uploaded ? theme.card : theme.secondary,
                    borderWidth: isNext ? 2 : StyleSheet.hairlineWidth,
                    opacity: !uploaded && !isNext && nextUpload && item.id !== nextUpload.id ? 0.85 : 1,
                  },
                  canRegisterUpload && !uploaded && !needsPrepay && styles.uploadRowAction,
                ]}>
                <View style={styles.uploadIndex}>
                  <Text style={[styles.uploadIndexLabel, { color: theme.foregroundEyebrow }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={[styles.uploadTitle, { color: theme.foreground }]}>{item.title}</Text>
                  <Text style={[styles.uploadState, { color: theme.foregroundSubtitle }]}>
                    {uploadStateLabel(t, item.id, item.state)}
                  </Text>
                </View>
                {canRegisterUpload && !uploaded && stepId && !needsPrepay ? (
                  uploadingId === item.id ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Text style={[styles.uploadCta, { color: isNext ? theme.primary : theme.foregroundSubtitle }]}>
                      {t(deliveryUploadCopyKey(stepId, 'cta'))}
                    </Text>
                  )
                ) : uploaded && stepId ? (
                  <Badge
                    tone={stepId === 'rough' ? 'warning' : 'mint'}
                    label={uploadDoneBadgeLabel(t, stepId)}
                  />
                ) : null}
              </RowWrapper>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title={t('dealDeliveryScreen.evidenceTitle')}>
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.feedbackCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={styles.feedbackTop}>
              <Badge tone="warning" label={t('dealDeliveryScreen.badgeBrand')} />
              <Text style={[styles.feedbackMeta, { color: theme.foregroundSubtitle }]}>
                {t('dealDeliveryScreen.feedbackDeadlineLabel')}
              </Text>
            </View>
            <Text style={[styles.feedbackBody, { color: theme.foreground }]}>
              {t('dealDeliveryScreen.evidenceBrandCopy')}
            </Text>
          </View>
          <View style={[styles.feedbackCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={styles.feedbackTop}>
              <Badge tone="mint" label={t('dealDeliveryScreen.badgeDecision')} />
              <Text style={[styles.feedbackMeta, { color: theme.foregroundSubtitle }]}>
                {t('dealDeliveryScreen.evidenceDecisionMeta')}
              </Text>
            </View>
            <Text style={[styles.feedbackBody, { color: theme.foreground }]}>
              {t('dealDeliveryScreen.evidenceDecisionCopy')}
            </Text>
          </View>
        </View>
      </SectionCard>

      <HubLinkGroup
        title={t('hubLinks.actions')}
        links={[
          {
            label: t('dealDeliveryScreen.ctaPrepareReminder'),
            icon: 'notifications-outline',
            onPress: () =>
              void alertAction(t('dealDeliveryScreen.alertReminderTitle'), t('dealDeliveryScreen.alertReminderBody')),
          },
          ...(dealId
            ? [
                {
                  label: canOpenVerification
                    ? t('dealDeliveryScreen.ctaVerification')
                    : t('dealDeliveryScreen.ctaVerificationLocked'),
                  hint: canOpenVerification
                    ? undefined
                    : t('dealDeliveryScreen.ctaVerificationLockedHint'),
                  href: canOpenVerification ? (`/deal/${dealId}/verification` as Href) : undefined,
                  icon: 'checkmark-circle-outline' as const,
                  onPress: canOpenVerification
                    ? undefined
                    : () =>
                        void alertAction(
                          t('dealDeliveryScreen.ctaVerificationLocked'),
                          t('dealDeliveryScreen.ctaVerificationLockedHint')
                        ),
                },
                {
                  label: t('dealDetailScreen.linkPacket'),
                  href: { pathname: '/deal/[dealId]/packet', params: { dealId } },
                  icon: 'document-text-outline' as const,
                },
              ]
            : []),
        ]}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
  hero: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroTitle: { fontSize: fontSize.cardTitle, fontWeight: '700' },
  heroCopy: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  stepCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepTitle: { fontSize: fontSize.body, fontWeight: '700' },
  stepDue: { fontSize: fontSize.caption, fontWeight: '600' },
  stepNote: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  feedbackTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  feedbackMeta: { fontSize: fontSize.caption, fontWeight: '600' },
  feedbackBody: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  ruleGrid: { flexDirection: 'row', gap: spacing.sm },
  ruleCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  ruleTitle: { fontSize: fontSize.bodySmall, fontWeight: '800', lineHeight: lineHeight.body },
  ruleHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  uploadRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  uploadIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIndexLabel: { fontSize: fontSize.caption, fontWeight: '800' },
  uploadTitle: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  uploadState: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  uploadRowAction: { borderStyle: 'dashed' },
  uploadCta: { fontSize: fontSize.caption, fontWeight: '800' },
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
