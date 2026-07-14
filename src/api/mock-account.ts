import type { SubscriptionUsageSnapshot, TeamMember } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

let mockTeamMembers: TeamMember[] = [
  {
    id: 1,
    email: 'owner@demo.local',
    displayName: 'Demo Owner',
    role: 'OWNER',
    status: 'ACTIVE',
    createdAt: '2026-06-01T10:00:00Z',
  },
];

let nextMockMemberId = 2;

export async function fetchMockTeamMembers(): Promise<TeamMember[]> {
  await mockDelay(110);
  return mockTeamMembers.map((m) => ({ ...m }));
}

export async function inviteMockTeamMember(input: { email: string }): Promise<TeamMember> {
  await mockDelay(120);
  const normalized = input.email.trim().toLowerCase();
  if (mockTeamMembers.some((m) => m.email.toLowerCase() === normalized && m.status === 'ACTIVE')) {
    throw new Error('ALREADY_MEMBER');
  }
  if (mockTeamMembers.some((m) => m.email.toLowerCase() === normalized && m.status === 'INVITED')) {
    throw new Error('INVITE_PENDING');
  }
  const member: TeamMember = {
    id: nextMockMemberId++,
    email: input.email.trim(),
    displayName: null,
    role: 'MEMBER',
    status: 'INVITED',
    createdAt: new Date().toISOString(),
    inviteKind: 'EMAIL',
    emailSent: true,
  };
  mockTeamMembers = [...mockTeamMembers, member];
  return { ...member };
}

export async function revokeMockTeamInvite(memberId: number): Promise<void> {
  return removeMockTeamMember(memberId);
}

export async function removeMockTeamMember(memberId: number): Promise<void> {
  await mockDelay(90);
  mockTeamMembers = mockTeamMembers.filter((m) => m.id !== memberId || m.role === 'OWNER');
}

export async function acceptMockTenantInvite(_tenantPublicId: string): Promise<TeamMember> {
  await mockDelay(90);
  throw new Error('Demo mode: accept invite requires API');
}

export async function fetchMockSubscriptionUsage(): Promise<SubscriptionUsageSnapshot> {
  await mockDelay(110);
  return {
    planName: 'Plus',
    billingCycleLabel: 'Monthly billing',
    brandPitchesUsed: 128,
    brandPitchesLimit: 500,
    draftConcurrentUsed: 2,
    draftConcurrentLimit: 5,
    renewalHint: 'Invoices, upgrades, downgrades, and seats are managed here.',
  };
}
