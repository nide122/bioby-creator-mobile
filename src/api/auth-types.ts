/** Aligned with backend AuthResponse / MeResponse. */
export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export type AuthTenant = {
  id: string;
  type: string;
  displayName: string;
  planCode: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  user: AuthUser;
  activeTenant: AuthTenant;
  membershipRole: string;
  agentSendMode: 'review_only' | 'agent_assist';
  creatorFocusMode: 'quiet' | 'work';
};

export type ApiErrorBody = {
  code?: string;
  message?: string;
};
