import { useQuery } from '@tanstack/react-query';

import { fetchOnboardingStatus } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  buildOnboardingDashboardStatus,
  type OnboardingDashboardStatus,
} from '@/src/lib/onboarding-status';
import { useTenantApiQueryEnabled, useTenantQueryKey } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';

export function useOnboardingDashboardStatus() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('account', 'onboarding-status', { api: apiMode });
  const tenantQueryEnabled = useTenantApiQueryEnabled();

  const profile = useSessionStore((s) => s.profileBasics);
  const mailboxConnection = useSessionStore((s) => s.mailboxConnection);
  const creatorVerificationStatus = useSessionStore((s) => s.creatorVerificationStatus);

  const localStatus: OnboardingDashboardStatus = buildOnboardingDashboardStatus({
    profile,
    mailboxConnected: Boolean(mailboxConnection),
    creatorVerificationStatus,
  });

  const query = useQuery({
    queryKey,
    queryFn: fetchOnboardingStatus,
    enabled: tenantQueryEnabled,
    retry: false,
  });

  if (!apiMode) {
    return {
      status: localStatus,
      isLoading: false,
      isError: false,
      refetch: async () => undefined,
    };
  }

  return {
    status: query.data ?? localStatus,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
