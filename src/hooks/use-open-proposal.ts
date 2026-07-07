import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { alertAction } from '@/src/lib/app-dialog';
import { resolveDefaultProposalPackageId } from '@/src/lib/proposal-from-package';
import { proposalPreviewQueryKey, useCreateProposal, useRateCardPackages } from '@/src/hooks/use-growth';

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
  const createProposal = useCreateProposal();
  const [openingProposal, setOpeningProposal] = useState(false);

  const openProposal = useCallback(
    async (input?: OpenProposalInput) => {
      if (openingProposal || createProposal.isPending) return;
      const packageId = input?.packageId ?? resolveDefaultProposalPackageId(rateCards.data ?? []);
      if (!packageId) {
        router.push('/pricing' as Href);
        return;
      }
      setOpeningProposal(true);
      try {
        const proposal = await createProposal.mutateAsync({
          packageId,
          opportunityId: input?.opportunityId,
          brandHint: input?.brandHint,
          locale: i18n.language,
          previewOnly: true,
        });
        queryClient.setQueryData(proposalPreviewQueryKey(proposal.id), proposal);
        router.push(`/proposal/${proposal.id}` as Href);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('proposalDetailScreen.emptyDataFallback');
        void alertAction(t('proposalDetailScreen.loadFailedTitle'), message);
      } finally {
        setOpeningProposal(false);
      }
    },
    [createProposal, i18n.language, openingProposal, queryClient, rateCards.data, router, t],
  );

  return { openProposal, openingProposal: openingProposal || createProposal.isPending };
}
