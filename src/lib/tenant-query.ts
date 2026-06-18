import type { Query, QueryClient } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useSessionStore } from '@/src/stores/session-store';

export const TENANT_QUERY_ROOT = 'tenant' as const;

export function getActiveTenantPublicId(): string | null {
  return useSessionStore.getState().tenantPublicId;
}

/** Prefix tenant-scoped React Query keys so caches do not leak across workspace switches. */
export function tenantQueryKey(tenantPublicId: string | null, ...segments: unknown[]): unknown[] {
  return [TENANT_QUERY_ROOT, tenantPublicId, ...segments];
}

export function useTenantQueryKey(...segments: unknown[]): unknown[] {
  const tenantPublicId = useSessionStore((s) => s.tenantPublicId);
  return tenantQueryKey(tenantPublicId, ...segments);
}

/** Gate tenant-scoped API queries until JWT workspace is known. */
export function useTenantApiQueryEnabled(): boolean {
  const tenantPublicId = useSessionStore((s) => s.tenantPublicId);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const authBootstrapReady = useSessionStore((s) => s.authBootstrapReady);
  return shouldUseBackendApi() && !!tenantPublicId && isAuthenticated && authBootstrapReady;
}

/** Allow demo/mock queries without JWT; require tenant id when hitting the API. */
export function useTenantScopedQueryEnabled(): boolean {
  const tenantPublicId = useSessionStore((s) => s.tenantPublicId);
  if (!shouldUseBackendApi()) return true;
  return !!tenantPublicId;
}

export function isTenantScopedQueryKey(queryKey: unknown): queryKey is unknown[] {
  return Array.isArray(queryKey) && queryKey[0] === TENANT_QUERY_ROOT;
}

export function tenantScopedPredicate(query: Query): boolean {
  return isTenantScopedQueryKey(query.queryKey);
}

export async function invalidateTenantScopedQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ predicate: tenantScopedPredicate });
}

export function clearAllQueries(queryClient: QueryClient): void {
  queryClient.clear();
}
