import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useBattleReports } from '@/src/hooks/use-battle-reports';
import { useDrafts } from '@/src/hooks/use-drafts';
import { useMediaKitDocument, useRateCardPackages } from '@/src/hooks/use-growth';
import { useDisputes } from '@/src/hooks/use-money';
import { useReplyTemplates } from '@/src/hooks/use-reply-templates';
import { useTrustMetrics } from '@/src/hooks/use-trust-metrics';
import {
  assessMediaKitCompletion,
  formatMediaKitHubDetail,
  mediaKitHubNeedsAttention,
} from '@/src/lib/media-kit-completion';
import { parseOnTimeRatePercent } from '@/src/lib/parse-trust-on-time';
import { useDraftApprovalStore } from '@/src/stores/draft-approval-store';
import { useSessionStore } from '@/src/stores/session-store';

/** Row trailing labels and hero metrics for the Assets tab. */
export function useAssetsHubSummaries() {
  const { t } = useTranslation();
  const battleReports = useBattleReports();
  const drafts = useDrafts();
  const rateCard = useRateCardPackages();
  const disputes = useDisputes();
  const trustMetrics = useTrustMetrics();
  const mediaKitDocument = useMediaKitDocument();
  const replyTemplates = useReplyTemplates();
  const profileDisplayName = useSessionStore((s) => s.profileBasics?.displayName);
  const isDraftApproved = useDraftApprovalStore((s) => s.isDraftApproved);

  return useMemo(() => {
    const shareableCount =
      battleReports.data?.filter((report) => report.shareableToMediaKit).length ?? 0;
    const draftRows = drafts.data ?? [];
    const pendingDrafts = draftRows.filter((item) => {
      if (item.approvalState === 'approved') return false;
      if (item.requiresApproval) return !isDraftApproved(item.id);
      return false;
    }).length;
    const templateCount = replyTemplates.templates.length;
    const packageCount = rateCard.data?.length ?? 0;
    const openDisputes =
      disputes.data?.filter((item) => item.state !== 'resolved').length ?? 0;
    const onTimeFromApi = parseOnTimeRatePercent(trustMetrics.data);
    const onTimeRate = shouldUseBackendApi() && onTimeFromApi != null ? onTimeFromApi : 96;
    const mediaKitLoading = mediaKitDocument.isPending;
    const mediaKitCompletion = assessMediaKitCompletion(mediaKitDocument.data, profileDisplayName);
    const mediaKitDetail = mediaKitLoading
      ? undefined
      : mediaKitDocument.isError
        ? t('assetsScreen.summaries.mediaKitIncomplete')
        : formatMediaKitHubDetail(mediaKitCompletion, t);

    return {
      isLoading:
        battleReports.isPending ||
        drafts.isPending ||
        rateCard.isPending ||
        disputes.isPending ||
        mediaKitLoading ||
        replyTemplates.isLoading ||
        (shouldUseBackendApi() && trustMetrics.isPending),
      onTimeRate,
      shareableCount,
      pendingDrafts,
      mediaKitDetail,
      mediaKitNeedsAttention: !mediaKitLoading && !mediaKitDocument.isError && mediaKitHubNeedsAttention(mediaKitCompletion),
      mediaKitPricingSynced: mediaKitCompletion.pricingSyncedVisible,
      fulfillmentDetail: t('assetsScreen.summaries.fulfillmentOptional'),
      rateCardDetail:
        packageCount > 0
          ? t('assetsScreen.summaries.packages', { count: packageCount })
          : undefined,
      proposalDetail: t('assetsScreen.summaries.sampleReady'),
      replyTemplatesDetail:
        templateCount > 0
          ? t('assetsScreen.summaries.replyTemplatesCount', { count: templateCount })
          : t('assetsScreen.summaries.replyTemplatesEmpty'),
      battleReportsDetail:
        shareableCount > 0
          ? t('assetsScreen.summaries.shareableCount', { count: shareableCount })
          : t('assetsScreen.summaries.noShareable'),
      draftsDetail:
        pendingDrafts > 0
          ? t('assetsScreen.summaries.pendingDrafts', { count: pendingDrafts })
          : t('assetsScreen.summaries.draftsClear'),
      disputesDetail:
        openDisputes > 0
          ? t('assetsScreen.summaries.openDisputes', { count: openDisputes })
          : t('assetsScreen.summaries.noOpenDisputes'),
      disputesNeedsAttention: openDisputes > 0,
    };
  }, [
    battleReports.data,
    battleReports.isPending,
    disputes.data,
    disputes.isPending,
    drafts.data,
    drafts.isPending,
    isDraftApproved,
    mediaKitDocument.data,
    mediaKitDocument.isPending,
    mediaKitDocument.isError,
    profileDisplayName,
    rateCard.data,
    rateCard.isPending,
    replyTemplates.isLoading,
    replyTemplates.templates,
    trustMetrics.data,
    trustMetrics.isPending,
    t,
  ]);
}
