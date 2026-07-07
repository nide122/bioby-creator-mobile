import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAccountOverview, mapCreatorProfileResponse, type AccountOverviewResponse } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { normalizeCreatorVerificationStatus } from '@/src/lib/creator-verification';
import {
  getActiveTenantPublicId,
  tenantQueryKey,
  useTenantApiQueryEnabled,
  useTenantQueryKey,
} from '@/src/lib/tenant-query';
import type { AgentSendMode, ClassificationStrictness, CreatorFocusMode, CreatorProfileBasics } from '@/src/stores/session-store';
import { useSessionStore } from '@/src/stores/session-store';

/** Infer whether a returning API user has finished onboarding (unit-tested). */
export function inferOnboardingComplete(overview: AccountOverviewResponse): boolean {
  if (overview.onboardingCompletedAt) return true;

  const hasProfile = Boolean(overview.profile?.displayName?.trim());
  const hasConsent = Boolean(overview.agentSendMode);
  const inboxDone = Boolean(overview.mailbox?.connected) || overview.inboxSetupSkipped === true;

  return hasProfile && hasConsent && inboxDone;
}

function mapProfile(view: NonNullable<AccountOverviewResponse['profile']>): CreatorProfileBasics {
  return mapCreatorProfileResponse(view);
}

function buildOnboardingPatchFromOverview(overview: AccountOverviewResponse): {
  profileBasics: CreatorProfileBasics | null;
  complianceAcceptedAt: string | null;
  agentSendMode: AgentSendMode | null;
  creatorFocusMode: CreatorFocusMode;
  classificationStrictness: ClassificationStrictness;
  inboxFilterStepFinished: boolean;
  emailWizardFinished: boolean;
  emailSkipped: boolean;
  mailboxConnection: ReturnType<typeof useSessionStore.getState>['mailboxConnection'];
  creatorVerificationStatus: ReturnType<typeof useSessionStore.getState>['creatorVerificationStatus'];
  onboardingComplete: boolean;
  planAcknowledged: boolean;
} {
  const patch = {
    profileBasics: null as CreatorProfileBasics | null,
    complianceAcceptedAt: null as string | null,
    agentSendMode: null as AgentSendMode | null,
    creatorFocusMode: (overview.creatorFocusMode ?? 'quiet') as CreatorFocusMode,
    classificationStrictness: (overview.classificationStrictness ?? 'standard') as ClassificationStrictness,
    inboxFilterStepFinished: true,
    emailWizardFinished: false,
    emailSkipped: false,
    mailboxConnection: null as ReturnType<typeof useSessionStore.getState>['mailboxConnection'],
    creatorVerificationStatus: 'unverified' as ReturnType<typeof useSessionStore.getState>['creatorVerificationStatus'],
    onboardingComplete: false,
    planAcknowledged: false,
  };

  if (overview.profile) {
    patch.profileBasics = mapProfile(overview.profile);
  }

  const mailbox = overview.mailbox;
  if (mailbox?.connected && mailbox.emailAddress) {
    patch.emailWizardFinished = true;
    patch.emailSkipped = false;
    patch.mailboxConnection = {
      email: mailbox.emailAddress,
      method: 'smtp',
      connectedAt: new Date().toISOString(),
    };
  } else if (overview.inboxSetupSkipped) {
    patch.emailWizardFinished = true;
    patch.emailSkipped = true;
  }

  if (overview.agentSendMode) {
    patch.agentSendMode = overview.agentSendMode as AgentSendMode;
    patch.complianceAcceptedAt = new Date().toISOString();
  }

  patch.creatorVerificationStatus = overview.creatorVerified
    ? 'verified'
    : normalizeCreatorVerificationStatus(overview.creatorVerificationStatus);

  if (inferOnboardingComplete(overview)) {
    patch.onboardingComplete = true;
    patch.planAcknowledged = true;
  }

  return patch;
}

export function applyOverviewToSession(overview: AccountOverviewResponse) {
  if (useSessionStore.getState().onboardingReplayInProgress) {
    const tenantDisplayName = overview.tenantDisplayName?.trim() || null;
    if (tenantDisplayName) {
      useSessionStore.setState({ tenantDisplayName });
    }
    return;
  }

  try {
    const {
      setProfileBasics,
      completeEmailWizard,
      skipEmailWizard,
      acceptCompliance,
      setAgentSendMode,
      setCreatorFocusMode,
      setClassificationStrictness,
      setCreatorVerificationStatus,
    } = useSessionStore.getState();
    if (overview.profile) {
      setProfileBasics(mapProfile(overview.profile));
    }
    const mailbox = overview.mailbox;
    if (mailbox?.connected && mailbox.emailAddress) {
      completeEmailWizard(mailbox.emailAddress);
    } else if (overview.inboxSetupSkipped) {
      skipEmailWizard();
    }
    if (overview.agentSendMode) {
      const { complianceAcceptedAt } = useSessionStore.getState();
      if (!complianceAcceptedAt) {
        acceptCompliance(overview.agentSendMode as AgentSendMode);
      } else {
        setAgentSendMode(overview.agentSendMode as AgentSendMode);
      }
    }
    setCreatorFocusMode((overview.creatorFocusMode ?? 'quiet') as CreatorFocusMode);
    if (overview.inboxFilterConfigured) {
      setClassificationStrictness((overview.classificationStrictness ?? 'standard') as ClassificationStrictness);
      useSessionStore.setState({ inboxFilterStepFinished: true });
    }
    setCreatorVerificationStatus(
      overview.creatorVerified
        ? 'verified'
        : normalizeCreatorVerificationStatus(overview.creatorVerificationStatus),
    );
    const tenantDisplayName = overview.tenantDisplayName?.trim() || null;
    if (inferOnboardingComplete(overview)) {
      useSessionStore.setState({ onboardingComplete: true, planAcknowledged: true, tenantDisplayName });
    } else if (tenantDisplayName) {
      useSessionStore.setState({ tenantDisplayName });
    }
  } catch {
    // Keep local session; overview query can still surface retry UI.
  }
}

/** Atomically replaces tenant-scoped onboarding fields (workspace switch). */
export function replaceTenantOnboardingFromOverview(overview: AccountOverviewResponse | null) {
  if (useSessionStore.getState().onboardingReplayInProgress) {
    if (overview?.tenantDisplayName?.trim()) {
      useSessionStore.setState({ tenantDisplayName: overview.tenantDisplayName.trim() });
    }
    return;
  }

  useSessionStore.setState(() => {
    if (!overview) {
      return {
        profileBasics: null,
        complianceAcceptedAt: null,
        emailWizardFinished: false,
        emailSkipped: false,
        mailboxConnection: null,
        creatorVerificationStatus: 'unverified',
        onboardingComplete: false,
        planAcknowledged: false,
        tenantDisplayName: null,
      };
    }
    return {
      ...buildOnboardingPatchFromOverview(overview),
      tenantDisplayName: overview.tenantDisplayName?.trim() || null,
    };
  });
}

/** Shared hydration for login, register, and cold-start bootstrap. */
export async function hydrateSessionFromBackend(): Promise<void> {
  const overview = await fetchAccountOverview();
  if (overview) applyOverviewToSession(overview);
}

export function useAccountOverview() {
  const queryClient = useQueryClient();
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('account', 'overview', { api: apiMode });
  const tenantQueryEnabled = useTenantApiQueryEnabled();
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const overview = await fetchAccountOverview();
      if (!overview) return null;
      applyOverviewToSession(overview);
      if (overview.subscription) {
        queryClient.setQueryData(
          tenantQueryKey(getActiveTenantPublicId(), 'account', 'subscription', { api: true }),
          overview.subscription,
        );
      }
      return overview;
    },
    retry: false,
    enabled: tenantQueryEnabled,
  });

  useEffect(() => {
    if (query.data) {
      applyOverviewToSession(query.data);
    }
  }, [query.data]);

  return query;
}
