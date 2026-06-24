import type { QueryClient } from '@tanstack/react-query';

import { getActiveTenantPublicId, tenantQueryKey } from '@/src/lib/tenant-query';

/** Invalidate battle reports and trust metrics after deal settlement. */
export function invalidateDealClosureArtifacts(queryClient: QueryClient) {
  const tenantId = getActiveTenantPublicId();
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'battle-reports') });
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'trust') });
}

/** Invalidate Today decision queue after fulfillment phase changes. */
export function invalidateDecisionQueueQueries(queryClient: QueryClient) {
  const tenantId = getActiveTenantPublicId();
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'decisions') });
  void queryClient.invalidateQueries({ queryKey: ['decisions'] });
}

/** Invalidate deal list, detail, and packet after fulfillment mutations. */
export function invalidateDealWorkspaceQueries(queryClient: QueryClient, dealId: string) {
  const tenantId = getActiveTenantPublicId();
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'deals') });
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'deals', 'detail', dealId) });
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'deals', 'packet', dealId) });
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'payments') });
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'disputes') });
  invalidateDecisionQueueQueries(queryClient);
}

/** Invalidate the tenant-scoped deal list (after accept/decline mutations). */
export function invalidateDealListQueries(queryClient: QueryClient) {
  const tenantId = getActiveTenantPublicId();
  void queryClient.invalidateQueries({ queryKey: tenantQueryKey(tenantId, 'deals') });
}

/** Pull-to-refresh: await active deal list refetch. */
export async function refetchDealListQueries(queryClient: QueryClient) {
  const tenantId = getActiveTenantPublicId();
  await queryClient.refetchQueries({ queryKey: tenantQueryKey(tenantId, 'deals') });
}

/** Pull-to-refresh on deal detail / delivery / verification / packet. */
export async function refetchDealWorkspaceQueries(queryClient: QueryClient, dealId: string) {
  const tenantId = getActiveTenantPublicId();
  await Promise.all([
    queryClient.refetchQueries({ queryKey: tenantQueryKey(tenantId, 'deals', 'detail', dealId) }),
    queryClient.refetchQueries({ queryKey: tenantQueryKey(tenantId, 'deals', 'packet', dealId) }),
    queryClient.refetchQueries({ queryKey: tenantQueryKey(tenantId, 'deals', 'list') }),
  ]);
}
