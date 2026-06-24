import { useQuery } from '@tanstack/react-query';

import { fetchBrandDetail, fetchBrandTimeline } from '@/src/api/brands-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

export function useBrandDetail(brandId: string | undefined) {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('brand', 'detail', brandId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => fetchBrandDetail(brandId as string),
    enabled: enabled && apiMode && !!brandId,
  });
}

export function useBrandTimeline(brandId: string | undefined) {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('brand', 'timeline', brandId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => fetchBrandTimeline(brandId as string),
    enabled: enabled && apiMode && !!brandId,
  });
}
