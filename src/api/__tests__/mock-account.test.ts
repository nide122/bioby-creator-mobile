import { inviteMockTeamMember } from '@/src/api/mock-account';

describe('mock workspace collaborators', () => {
  it('always invites a regular member without a role choice', async () => {
    const member = await inviteMockTeamMember({ email: 'assistant-two-role@example.com' });

    expect(member.role).toBe('MEMBER');
    expect(member.status).toBe('INVITED');
  });
});
