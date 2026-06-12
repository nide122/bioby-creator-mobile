import type { TFunction } from 'i18next';

import type { TeamRoleCard, TeamRoleId } from '@/src/types/domain';

const PERMISSION_KEYS: Record<TeamRoleId, { allowed: string[]; denied: string[] }> = {
  owner: {
    allowed: ['connectInbox', 'manageMembers', 'viewDealsPayments', 'approveHighRiskSends'],
    denied: ['signBrandContracts'],
  },
  agent: {
    allowed: ['processInboxLeads', 'generateEditDrafts', 'moveDeliveryForward'],
    denied: ['removeInboxAccess', 'changePayoutAccount'],
  },
  finance: {
    allowed: ['viewPaymentsEscrow', 'exportBillingRecords'],
    denied: ['changeAcceptanceTerms'],
  },
  viewer: {
    allowed: ['readDealsDraftsTrust'],
    denied: ['sendMessagesApproveDrafts'],
  },
};

/** Map API/mock team role cards to localized copy keyed by stable role id. */
export function localizeTeamRole(role: TeamRoleCard, t: TFunction): TeamRoleCard {
  const base = `teamSettingsScreen.roleCards.${role.id}`;
  const keys = PERMISSION_KEYS[role.id];

  return {
    ...role,
    title: t(`${base}.title`, { defaultValue: role.title }),
    summary: t(`${base}.summary`, { defaultValue: role.summary }),
    allowed: keys.allowed.map((key, index) =>
      t(`${base}.allowed.${key}`, { defaultValue: role.allowed[index] ?? '' }),
    ),
    denied: keys.denied.map((key, index) =>
      t(`${base}.denied.${key}`, { defaultValue: role.denied[index] ?? '' }),
    ),
  };
}

export function localizeTeamRoles(roles: TeamRoleCard[], t: TFunction): TeamRoleCard[] {
  return roles.map((role) => localizeTeamRole(role, t));
}

export function localizeMemberRole(role: string, t: TFunction): string {
  return t(`teamSettingsScreen.memberRoles.${role}`, { defaultValue: role });
}
