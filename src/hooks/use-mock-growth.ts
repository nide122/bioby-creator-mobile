import { useQuery } from '@tanstack/react-query';

import {
  fetchMockMediaKitPreview,
  fetchMockRateCardPackages,
  fetchMockProposalPreview,
} from '@/src/api/mock-growth';

export function useMockRateCardPackages() {
  return useQuery({
    queryKey: ['growth', 'rate-card-packages'],
    queryFn: fetchMockRateCardPackages,
  });
}

export function useMockProposalPreview(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['growth', 'proposal', proposalId],
    queryFn: () => fetchMockProposalPreview(proposalId as string),
    enabled: !!proposalId,
  });
}

export function useMockMediaKitPreview() {
  return useQuery({
    queryKey: ['growth', 'media-kit'],
    queryFn: fetchMockMediaKitPreview,
  });
}
