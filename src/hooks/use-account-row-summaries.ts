import { useTranslation } from 'react-i18next';

import { useSubscriptionUsage, useTeamMembers } from '@/src/hooks/use-account-settings';
import { useAccountOverview } from '@/src/hooks/use-account-overview';
import { useMyTenants } from '@/src/hooks/use-tenants';
import {
  listConnectedPlatformStatLines,
  migrateLegacyProfileBasics,
} from '@/src/lib/creator-profile-aggregate';
import { useSessionStore } from '@/src/stores/session-store';

/** Trailing labels for Account settings rows (iOS Settings style). */
export function useAccountRowSummaries() {
  const { t } = useTranslation();
  const profile = useSessionStore((s) => s.profileBasics);
  const tenantDisplayName = useSessionStore((s) => s.tenantDisplayName);
  const overview = useAccountOverview();
  const tenants = useMyTenants();
  const subscription = useSubscriptionUsage();
  const members = useTeamMembers();

  const profileDetail = (() => {
    const { platformProfiles } = migrateLegacyProfileBasics(profile);
    const statLines = listConnectedPlatformStatLines(platformProfiles);
    if (statLines.length > 0) return statLines.join(' · ');
    if (profile?.handle) return `@${profile.handle.replace(/^@/, '')}`;
    return profile?.displayName?.trim() || undefined;
  })();

  const planDetail = subscription.isError ? undefined : subscription.data?.planName;
  const activeMembers = (members.data ?? []).filter((member) => member.status === 'ACTIVE');
  const teamDetail =
    !members.isError && activeMembers.length > 0
      ? t('account.summaries.teamMembers', { count: activeMembers.length })
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
