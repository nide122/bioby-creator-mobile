import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
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
import { approveDraftOnServer } from '@/src/api/drafts-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { alertAction } from '@/src/lib/app-dialog';
import { useDraftDetail } from '@/src/hooks/use-drafts';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { useDraftApprovalStore } from '@/src/stores/draft-approval-store';

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
  const [body, setBody] = useState('');
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false);
  const [boundarySkipped, setBoundarySkipped] = useState(false);

  useEffect(() => {
    if (query.data?.body) {
      setBody(query.data.body);
    }
  }, [query.data?.body]);

  const brandHint = useMemo(() => {
    if (shouldUseBackendApi()) return query.data?.sourceBrandHint;
    if (threadId) return getMockInboxThreadBrandHint(threadId);
    return query.data?.sourceBrandHint;
  }, [threadId, query.data?.sourceBrandHint]);

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

  const onApprove = () => {
    if (!draftId) return;
    approveDraftLocal(draftId);
    if (shouldUseBackendApi()) {
      void approveDraftOnServer(draftId).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['drafts'] });
        void queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
        void queryClient.invalidateQueries({ queryKey: ['decisions'] });
      });
    }
    setApprovalConfirmOpen(false);
  };

  const onShareCopy = async () => {
    try {
      await Share.share({ message: body });
    } catch {
      void alertAction(t('draftDetail.shareErrorTitle'), t('draftDetail.shareErrorMsg'));
    }
  };

  const clearedAtLabel = approvedAtISO
    ? new Date(approvedAtISO).toLocaleString(i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('draftDetail.approvalJustNow');

  return (
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
      </SectionCard>

      {isApproved ? (
        <SectionCard title={t('draftDetail.approvalRecordTitle')} emphasis>
          <Text style={[styles.meta, { color: theme.foreground }]}>{clearedAtLabel}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title={t('draftDetail.bodySectionTitle')}>
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
      </SectionCard>

      <View style={{ gap: spacing.sm }}>
        {approvalConfirmOpen && !isApproved ? (
          <View style={[styles.approvalConfirm, { borderColor: '#F59E0B55', backgroundColor: '#F59E0B0F' }]}>
            <View style={styles.row}>
              <Badge tone="warning" label={t('draftDetail.finalConfirmBadge')} />
              <Text style={[styles.commentMeta, { color: '#F59E0B' }]}>{t('draftDetail.finalConfirmMeta')}</Text>
            </View>
            <Text style={[styles.commentBody, { color: theme.foreground }]}>{t('draftDetail.finalConfirmBody')}</Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setApprovalConfirmOpen(false)}
                style={[styles.confirmSecondary, { borderColor: '#F59E0B55' }]}>
                <Text style={[styles.secondaryLabel, { color: '#F59E0B' }]}>{t('draftDetail.recheckCta')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onApprove}
                style={[styles.confirmPrimary, { backgroundColor: theme.primary }]}>
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>{t('draftDetail.confirmApproveCta')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {detail.requiresApproval ? (
          <Pressable
            accessibilityRole="button"
            disabled={isApproved}
            onPress={() => setApprovalConfirmOpen(true)}
            style={[
              styles.primary,
              {
                backgroundColor: isApproved ? theme.border : theme.primary,
                opacity: isApproved ? 0.7 : 1,
              },
            ]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {isApproved ? t('draftDetail.approvedCta') : t('draftDetail.approveSendCta')}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isApproved}
            onPress={() => approveDraftLocal(draftId)}
            style={[styles.primary, { backgroundColor: theme.primary, opacity: isApproved ? 0.65 : 1 }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {isApproved ? t('draftDetail.checkedCta') : t('draftDetail.markCheckedCta')}
            </Text>
          </Pressable>
        )}

      </View>

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
  confirmActions: { flexDirection: 'row', gap: spacing.sm },
  confirmPrimary: {
    flex: 1,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSecondary: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentMeta: { fontSize: fontSize.caption, fontWeight: '600' },
  commentBody: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
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
  ghost: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontWeight: '700', fontSize: fontSize.body },
});
