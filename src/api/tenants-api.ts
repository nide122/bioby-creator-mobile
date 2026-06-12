import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { AuthSession } from '@/src/api/auth-types';
import type { InvitableTeamRole, TeamMember } from '@/src/types/domain';
import { setAuthTokens } from '@/src/auth/token-storage';

export type TenantMembership = {
  tenantPublicId: string;
  tenantType: string;
  displayName: string;
  planCode: string;
  role: string;
  status: string;
  active: boolean;
};

export async function fetchMyTenants(): Promise<TenantMembership[]> {
  if (!shouldUseBackendApi()) return [];
  return apiRequest<TenantMembership[]>('/api/v1/tenants/mine');
}

export async function switchTenant(tenantPublicId: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>(`/api/v1/tenants/${tenantPublicId}/switch`, {
    method: 'POST',
  });
  await setAuthTokens(session.accessToken, session.refreshToken);
  return session;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  if (!shouldUseBackendApi()) {
    const { fetchMockTeamMembers } = await import('@/src/api/mock-account');
    return fetchMockTeamMembers();
  }
  return apiRequest<TeamMember[]>('/api/v1/tenants/members');
}

export async function inviteTeamMember(input: { email: string; role: InvitableTeamRole }): Promise<TeamMember> {
  if (!shouldUseBackendApi()) {
    const { inviteMockTeamMember } = await import('@/src/api/mock-account');
    return inviteMockTeamMember(input);
  }
  return apiRequest<TeamMember>('/api/v1/tenants/members/invite', {
    method: 'POST',
    body: { email: input.email, role: input.role },
  });
}

export async function acceptTenantInvite(tenantPublicId: string): Promise<TeamMember> {
  if (!shouldUseBackendApi()) {
    const { acceptMockTenantInvite } = await import('@/src/api/mock-account');
    return acceptMockTenantInvite(tenantPublicId);
  }
  return apiRequest<TeamMember>('/api/v1/tenants/members/accept', {
    method: 'POST',
    body: { tenantPublicId },
  });
}

export async function revokeTeamInvite(memberId: number): Promise<void> {
  if (!shouldUseBackendApi()) {
    const { revokeMockTeamInvite } = await import('@/src/api/mock-account');
    return revokeMockTeamInvite(memberId);
  }
  await apiRequest<void>(`/api/v1/tenants/members/${memberId}`, { method: 'DELETE' });
}
