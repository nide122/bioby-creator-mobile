import { useSessionStore } from '@/src/stores/session-store';

/** True when the current session may invite or revoke team members. */
export function isWorkspaceOwner(): boolean {
  const { membershipRole, isLocalDemoWorkspace } = useSessionStore.getState();
  return membershipRole === 'OWNER' || isLocalDemoWorkspace;
}
