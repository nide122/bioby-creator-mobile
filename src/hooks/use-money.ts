import { useQuery } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { fetchDisputes, fetchPayments, fetchPaymentsOverview } from '@/src/api/money-api';
import { useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

export function usePayments(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('payments', 'creator', { empty, api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => (empty ? Promise.resolve([]) : fetchPayments()),
    enabled,
  });
}

export function usePaymentsOverview(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('payments', 'overview', { empty, api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () =>
      empty
        ? Promise.resolve({
            currency: 'USD' as const,
            inEscrowCents: 0,
            pendingVerificationCents: 0,
            awaitingSettlementCents: 0,
            footnote: '',
          })
        : fetchPaymentsOverview(),
    enabled,
  });
}

export function useDisputes(options?: { empty?: boolean }) {
  const empty = options?.empty ?? false;
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('disputes', 'creator', { empty, api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => (empty ? Promise.resolve([]) : fetchDisputes()),
    enabled,
  });
}

/** @deprecated use usePayments */
export const useMockPayments = usePayments;

/** @deprecated use usePaymentsOverview */
export const useMockPaymentsOverview = usePaymentsOverview;

/** @deprecated use useDisputes */
export const useMockDisputes = useDisputes;
