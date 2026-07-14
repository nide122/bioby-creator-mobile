import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { createTenant, fetchMyTenants, switchTenant, type TenantMembership } from '@/src/api/tenants-api';
import { replaceTenantOnboardingFromOverview } from '@/src/hooks/use-account-overview';
import { fetchAccountOverview } from '@/src/api/account-api';
import { useSessionStore } from '@/src/stores/session-store';

export const tenantsMineQueryKey = ['tenants', 'mine', { api: shouldUseBackendApi() }] as const;

export function useMyTenants() {
  return useQuery({
    queryKey: tenantsMineQueryKey,
    queryFn: fetchMyTenants,
    enabled: shouldUseBackendApi(),
    refetchOnMount: 'always',
  });
}

export function usePendingTenantInvites() {
  const tenants = useMyTenants();
  const pending = useMemo(
    () => (tenants.data ?? []).filter((tenant) => tenant.status === 'INVITED'),
    [tenants.data],
  );
  return { ...tenants, pending, pendingCount: pending.length };
}

export async function prefetchMyTenants(queryClient: ReturnType<typeof useQueryClient>) {
  if (!shouldUseBackendApi()) return;
  await queryClient.prefetchQuery({
    queryKey: ['tenants', 'mine', { api: true }],
    queryFn: fetchMyTenants,
  });
}

export function useSwitchTenant() {
  const queryClient = useQueryClient();
  const applyAuthSession = useSessionStore((s) => s.applyAuthSession);

  return useMutation({
    mutationFn: async (tenant: TenantMembership) => {
      const session = await switchTenant(tenant.tenantPublicId);
      applyAuthSession(session);
      const overview = await fetchAccountOverview();
      // Single write avoids a transient incomplete state that triggers the onboarding redirect.
      replaceTenantOnboardingFromOverview(overview);
      return session;
    },
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] });
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const applyAuthSession = useSessionStore((s) => s.applyAuthSession);

  return useMutation({
    mutationFn: async (displayName: string) => {
      const session = await createTenant(displayName);
      applyAuthSession(session);
      const overview = await fetchAccountOverview();
      replaceTenantOnboardingFromOverview(overview);
      return session;
    },
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] });
    },
  });
}
