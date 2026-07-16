import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { fetchProposalDraft } from '@/src/api/growth-api';
import { alertAction } from '@/src/lib/app-dialog';
import { resolveDefaultProposalPackageId } from '@/src/lib/proposal-from-package';
import { proposalDraftQueryKey, proposalPreviewQueryKey, useGenerateProposalDraft, useRateCardPackages } from '@/src/hooks/use-growth';

export type OpenProposalInput = {
  packageId?: string;
  opportunityId?: string;
  brandHint?: string;
};

export function useOpenProposal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const rateCards = useRateCardPackages();
  const generateProposalDraft = useGenerateProposalDraft();
  const [openingProposal, setOpeningProposal] = useState(false);

  const openProposal = useCallback(
    async (input?: OpenProposalInput) => {
      if (openingProposal || generateProposalDraft.isPending) return;
      const packageId = input?.packageId ?? resolveDefaultProposalPackageId(rateCards.data ?? []);
      if (!packageId) {
        router.push('/pricing' as Href);
        return;
      }
      setOpeningProposal(true);
      try {
        const draft = await generateProposalDraft.mutateAsync({
          packageId,
          opportunityId: input?.opportunityId,
          brandHint: input?.brandHint,
          locale: i18n.language,
          previewOnly: true,
        });
        queryClient.setQueryData(proposalDraftQueryKey(draft.id), draft);
        queryClient.setQueryData(proposalPreviewQueryKey(draft.proposal.id), draft.proposal);
        router.push(`/proposal/${draft.proposal.id}?draftId=${draft.id}` as Href);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('proposalDetailScreen.emptyDataFallback');
        void alertAction(t('proposalDetailScreen.loadFailedTitle'), message);
      } finally {
        setOpeningProposal(false);
      }
    },
    [generateProposalDraft, i18n.language, openingProposal, queryClient, rateCards.data, router, t],
  );

  const openProposalDraftById = useCallback(
    async (draftId: string) => {
      if (openingProposal) return;
      setOpeningProposal(true);
      try {
        const draft = await fetchProposalDraft(draftId);
        queryClient.setQueryData(proposalDraftQueryKey(draft.id), draft);
        queryClient.setQueryData(proposalPreviewQueryKey(draft.proposal.id), draft.proposal);
        router.push(`/proposal/${draft.proposal.id}?draftId=${draft.id}` as Href);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('proposalDetailScreen.emptyDataFallback');
        void alertAction(t('proposalDetailScreen.loadFailedTitle'), message);
      } finally {
        setOpeningProposal(false);
      }
    },
    [openingProposal, queryClient, router, t],
  );

  return {
    openProposal,
    openProposalDraftById,
    openingProposal: openingProposal || generateProposalDraft.isPending,
  };
}
