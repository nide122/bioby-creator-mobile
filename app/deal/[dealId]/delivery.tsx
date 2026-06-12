import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Badge,
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
import { useDealPacket } from '@/src/hooks/use-deal-packet';
import { useDealDetail } from '@/src/hooks/use-deals';

type StepStatus = 'done' | 'current' | 'blocked' | 'upcoming';

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
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const canRegisterUpload =
    shouldUseBackendApi() && !!dealId && /^\d+$/.test(dealId);

  const onRegisterUpload = (uploadId: string, title: string) => {
    if (!canRegisterUpload || uploadingId) return;
    const alreadyUploaded = /uploaded/i.test(
      resolvedUploads.find((u) => u.id === uploadId)?.state ?? ''
    );
    if (alreadyUploaded) return;
    setUploadingId(uploadId);
    void registerDealDeliveryUpload(dealId as string, { uploadId, title })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['deals', 'packet', dealId] });
        void queryClient.invalidateQueries({ queryKey: ['deals', 'detail', dealId] });
        void queryClient.invalidateQueries({ queryKey: ['deals'] });
        void alertAction(
          t('dealDeliveryScreen.uploadSuccessTitle'),
          t('dealDeliveryScreen.uploadSuccessBody')
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
  const resolvedTimeline = apiTimeline && apiTimeline.length > 0 ? apiTimeline : timeline;

  const uploadItems = useMemo(
    () => [
      {
        id: 'script',
        title: t('dealDeliveryScreen.fileScriptTitle'),
        state: t('dealDeliveryScreen.fileScriptState'),
      },
      {
        id: 'rough',
        title: t('dealDeliveryScreen.fileRoughTitle'),
        state: t('dealDeliveryScreen.fileRoughState'),
      },
      {
        id: 'final',
        title: t('dealDeliveryScreen.fileFinalTitle'),
        state: t('dealDeliveryScreen.fileFinalState'),
      },
    ],
    [t],
  );

  const apiUploads = packetQuery.data?.packet.delivery?.uploads;
  const resolvedUploads = apiUploads && apiUploads.length > 0 ? apiUploads : uploadItems;
  const feedbackNote = packetQuery.data?.packet.delivery?.feedbackNote;

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
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('dealDeliveryScreen.loadingA11y')} color={theme.primary} />
      </View>
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
  const dealBrand = dealQuery.data?.brandPlaceholder ?? packetQuery.data?.brandPlaceholder;

  return (
    <HubScreen
      eyebrow={t('tabs.deals')}
      title={t('dealDeliveryScreen.title')}
      lead={
        dealTitle && dealBrand
          ? `${dealBrand} · ${dealTitle}`
          : t('dealDeliveryScreen.description')
      }>
      <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={[styles.heroTitle, { color: theme.foreground }]}>
            {t('dealDeliveryScreen.heroTitle')}
          </Text>
          <Text style={[styles.heroCopy, { color: theme.mutedForeground }]}>
            {t('dealDeliveryScreen.heroCopy')}
          </Text>
        </View>
        <Badge tone="warning" label={t('dealDeliveryScreen.badgeWaiting')} />
      </View>

      <SectionCard title={t('dealDeliveryScreen.nowWhatTitle')} emphasis>
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.feedbackCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={styles.feedbackTop}>
              <Badge tone="warning" label={t('dealDeliveryScreen.badgeAwaitingFeedback')} />
              <Text style={[styles.feedbackMeta, { color: theme.foregroundSubtitle }]}>
                {t('dealDeliveryScreen.feedbackDeadlineLabel')}
              </Text>
            </View>
            <Text style={[styles.feedbackBody, { color: theme.foreground }]}>
              {feedbackNote ?? t('dealDeliveryScreen.feedbackAiDraftBody')}
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
          {resolvedUploads.map((item) => {
            const uploaded = /uploaded/i.test(item.state);
            const RowWrapper = canRegisterUpload && !uploaded ? Pressable : View;
            return (
              <RowWrapper
                key={item.id}
                accessibilityRole={canRegisterUpload && !uploaded ? 'button' : undefined}
                disabled={!!uploadingId || uploaded}
                onPress={
                  canRegisterUpload && !uploaded
                    ? () => onRegisterUpload(item.id, item.title)
                    : undefined
                }
                style={[
                  styles.uploadRow,
                  { borderColor: theme.border, backgroundColor: theme.secondary },
                  canRegisterUpload && !uploaded && styles.uploadRowAction,
                ]}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={[styles.uploadTitle, { color: theme.foreground }]}>{item.title}</Text>
                  <Text style={[styles.uploadState, { color: theme.foregroundSubtitle }]}>{item.state}</Text>
                </View>
                {canRegisterUpload && !uploaded ? (
                  uploadingId === item.id ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Text style={[styles.uploadCta, { color: theme.primary }]}>
                      {t('dealDeliveryScreen.uploadCta')}
                    </Text>
                  )
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
                  label: t('dealDeliveryScreen.ctaVerification'),
                  href: `/deal/${dealId}/verification` as Href,
                  icon: 'checkmark-circle-outline' as const,
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
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
