import { useTranslation } from 'react-i18next';

import { useSubscriptionUsage, useTeamRoles } from '@/src/hooks/use-account-settings';
import { useAccountOverview } from '@/src/hooks/use-account-overview';
import { useMyTenants } from '@/src/hooks/use-tenants';
import { useSessionStore } from '@/src/stores/session-store';

/** Trailing labels for Account settings rows (iOS Settings style). */
export function useAccountRowSummaries() {
  const { t } = useTranslation();
  const profile = useSessionStore((s) => s.profileBasics);
  const tenantDisplayName = useSessionStore((s) => s.tenantDisplayName);
  const overview = useAccountOverview();
  const tenants = useMyTenants();
  const subscription = useSubscriptionUsage();
  const team = useTeamRoles();

  const profileDetail = profile?.handle
    ? `@${profile.handle}`
    : profile?.displayName?.trim() || undefined;

  const planDetail = subscription.isError ? undefined : subscription.data?.planName;
  const teamRoles = Array.isArray(team.data) ? team.data : [];
  const teamDetail =
    !team.isError && teamRoles.length > 0
      ? t('account.summaries.teamRoles', { count: teamRoles.length })
      : undefined;

  const pendingInviteCount =
    tenants.data?.filter((tenant) => tenant.status === 'INVITED').length ?? 0;
  const activeTenantName = tenants.data?.find((tenant) => tenant.active)?.displayName?.trim();
  const workspaceDetail =
    pendingInviteCount > 0
      ? t('account.summaries.pendingInvites', { count: pendingInviteCount })
      : activeTenantName || tenantDisplayName?.trim() || overview.data?.tenantDisplayName?.trim() || undefined;

  return {
    profileDetail,
    planDetail,
    teamDetail,
    workspaceDetail,
    dataDetail: t('account.summaries.dataHub'),
  };
}
