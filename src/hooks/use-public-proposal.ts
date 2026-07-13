import { useQuery } from '@tanstack/react-query';

import { fetchPublicProposal } from '@/src/api/growth-api';

export function usePublicProposal(token: string | undefined) {
  return useQuery({
    queryKey: ['public', 'proposal', token],
    queryFn: () => fetchPublicProposal(token as string),
    enabled: Boolean(token?.trim()),
    retry: false,
  });
}
