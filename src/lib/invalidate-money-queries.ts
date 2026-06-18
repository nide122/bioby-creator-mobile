import type { QueryClient } from '@tanstack/react-query';

import { getActiveTenantPublicId, tenantQueryKey } from '@/src/lib/tenant-query';

export function invalidateMoneyQueries(queryClient: QueryClient) {
  const tenantId = getActiveTenantPublicId();
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'payments') });
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'disputes') });
}
