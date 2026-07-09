import type { SubscriptionUsageSnapshot, TeamRoleCard, TeamMember, InvitableTeamRole } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

const TEAM_ROLES: TeamRoleCard[] = [
  {
    id: 'owner',
    title: 'Owner',
    summary: 'Final approval for inbox access, team roles, and sensitive commercial terms.',
    allowed: ['Connect or disconnect inbox', 'Invite or remove members', 'View all deals and payments', 'Approve high-risk sends'],
    denied: ['Cannot sign brand-side contracts inside Bioby.'],
  },
  {
    id: 'agent',
    title: 'Agent',
    summary: 'Handles pitch triage, drafts, and delivery progress.',
    allowed: ['Process inbox leads', 'Generate and edit drafts', 'Move delivery and verification forward'],
    denied: ['Remove inbox access', 'Change payout account'],
  },
  {
    id: 'finance',
    title: 'Finance',
    summary: 'Reviews billing, invoices, and settlement timing.',
    allowed: ['View payments and escrow summary', 'Export billing records'],
    denied: ['Change acceptance terms'],
  },
  {
    id: 'viewer',
    title: 'Viewer',
    summary: 'Read-only seat for editors, assistants, or training.',
    allowed: ['Read deals, drafts, and trust proof'],
    denied: ['Send messages or approve drafts'],
  },
];

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

export async function inviteMockTeamMember(input: {
  email: string;
  role: InvitableTeamRole;
}): Promise<TeamMember> {
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
    role: input.role,
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

export async function changeMockTeamMemberRole(input: {
  memberId: number;
  role: InvitableTeamRole;
}): Promise<TeamMember> {
  await mockDelay(90);
  const member = mockTeamMembers.find((m) => m.id === input.memberId);
  if (!member || member.role === 'OWNER') {
    throw new Error('MEMBER_NOT_FOUND');
  }
  member.role = input.role;
  return { ...member };
}

export async function acceptMockTenantInvite(_tenantPublicId: string): Promise<TeamMember> {
  await mockDelay(90);
  throw new Error('Demo mode: accept invite requires API');
}

export async function fetchMockTeamRoles(): Promise<TeamRoleCard[]> {
  await mockDelay(110);
  return TEAM_ROLES.map((r) => ({
    ...r,
    allowed: [...r.allowed],
    denied: [...r.denied],
  }));
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
