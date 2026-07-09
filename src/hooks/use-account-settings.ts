import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchSubscriptionUsage, fetchTeamRoles } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { ApiError } from '@/src/api/api-client';
import {
  acceptTenantInvite,
  acceptTenantInviteByToken,
  changeTeamMemberRole,
  fetchTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  revokeTeamInvite,
} from '@/src/api/tenants-api';
import type { InvitableTeamRole } from '@/src/types/domain';
import { invalidateTenantScopedQueries, useTenantApiQueryEnabled, useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { isWorkspaceOwner } from '@/src/lib/workspace-owner';

export function useTeamRoles() {
  return useQuery({
    queryKey: ['account', 'team-roles', { api: shouldUseBackendApi() }],
    queryFn: fetchTeamRoles,
    retry: false,
  });
}

export function useTeamMembers() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('team-members', { api: apiMode });
  const tenantQueryEnabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchTeamMembers,
    enabled: tenantQueryEnabled,
    retry: false,
    refetchOnMount: 'always',
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: InvitableTeamRole }) => {
      if (!isWorkspaceOwner()) {
        throw new ApiError(403, 'FORBIDDEN', 'Owner role required');
      }
      return inviteTeamMember(input);
    },
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useChangeTeamMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: number; role: InvitableTeamRole }) => {
      if (!isWorkspaceOwner()) {
        throw new ApiError(403, 'FORBIDDEN', 'Owner role required');
      }
      return changeTeamMemberRole(input);
    },
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => {
      if (!isWorkspaceOwner()) {
        throw new ApiError(403, 'FORBIDDEN', 'Owner role required');
      }
      return removeTeamMember(memberId);
    },
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useRevokeTeamInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => {
      if (!isWorkspaceOwner()) {
        throw new ApiError(403, 'FORBIDDEN', 'Owner role required');
      }
      return revokeTeamInvite(memberId);
    },
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useAcceptTenantInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantPublicId: string) => acceptTenantInvite(tenantPublicId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] });
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useAcceptTenantInviteByToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptTenantInviteByToken(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] });
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useSubscriptionUsage() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('account', 'subscription', { api: apiMode });
  const tenantQueryEnabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchSubscriptionUsage,
    enabled: tenantQueryEnabled,
    retry: false,
  });
}

/** @deprecated use useTeamRoles */
export const useMockTeamRoles = useTeamRoles;

/** @deprecated use useSubscriptionUsage */
export const useMockSubscriptionUsage = useSubscriptionUsage;
