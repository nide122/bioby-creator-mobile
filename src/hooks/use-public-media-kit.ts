import { useQuery } from '@tanstack/react-query';

import { fetchPublicMediaKitBySlug } from '@/src/api/growth-api';

export function usePublicMediaKit(slug: string | undefined) {
  return useQuery({
    queryKey: ['public', 'media-kit', slug],
    queryFn: () => fetchPublicMediaKitBySlug(slug as string),
    enabled: Boolean(slug?.trim()),
    retry: false,
  });
}
