import type { AuthSession } from '@/src/api/auth-types';
import type { AgentSendMode, CreatorFocusMode } from '@/src/stores/session-store';

export function mapAuthSessionToStore(session: AuthSession) {
  const agentSendMode = session.agentSendMode as AgentSendMode;
  const creatorFocusMode = (session.creatorFocusMode ?? 'quiet') as CreatorFocusMode;
  return {
    isAuthenticated: true,
    isLocalDemoWorkspace: false,
    demoWorkspaceKind: null,
    accountEmail: session.user.email,
    pendingDisplayName: session.user.displayName?.trim() || null,
    agentSendMode,
    creatorFocusMode,
    tenantPublicId: session.activeTenant.id,
    tenantDisplayName: session.activeTenant.displayName?.trim() || null,
    membershipRole: session.membershipRole,
    planAcknowledged: session.activeTenant.planCode === 'FREE',
  };
}
