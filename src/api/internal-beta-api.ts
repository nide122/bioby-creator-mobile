import { apiRequest } from '@/src/api/api-client';

export type InternalBetaStage =
  | 'REGISTERED'
  | 'GMAIL_CONNECTED'
  | 'GMAIL_ISSUE'
  | 'SYNCED'
  | 'BRAND_DEAL_FOUND'
  | 'DRAFTED'
  | 'REPLIED';

export type InternalBetaSummary = {
  totalRegistered: number;
  emailVerified: number;
  gmailConnected: number;
  syncSucceeded: number;
  withBrandDeals: number;
  withDrafts: number;
  withReplies: number;
  gmailIssues: number;
};

export type InternalBetaKol = {
  userId: string;
  displayName?: string | null;
  registrationEmail: string;
  registeredAt: string;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  workspaceId: string;
  workspaceName: string;
  gmailStatus?: string | null;
  connectedGmail?: string | null;
  gmailConnectedAt?: string | null;
  gmailLastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncSuccessCount: number;
  lastSyncFailedCount: number;
  syncedInboxEmailCount: number;
  brandDealCount: number;
  latestBrandDealAt?: string | null;
  replyDraftCount: number;
  sentReplyCount: number;
  latestReplyAt?: string | null;
  currentStage: InternalBetaStage;
};

export type InternalBetaDashboard = {
  summary: InternalBetaSummary;
  kols: InternalBetaKol[];
};

export type InternalBetaRole = 'BETA_ADMIN' | 'BETA_VIEWER';

export type InternalBetaAccess = {
  allowed: boolean;
  email: string;
  role: InternalBetaRole;
};

export type InternalBetaAdmin = {
  id: number;
  userId: string;
  email: string;
  displayName?: string | null;
  role: InternalBetaRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string | null;
};

export async function fetchInternalBetaDashboard(): Promise<InternalBetaDashboard> {
  return apiRequest<InternalBetaDashboard>('/api/v1/internal/beta/kols');
}

export async function fetchInternalBetaAccess(): Promise<InternalBetaAccess> {
  return apiRequest<InternalBetaAccess>('/api/v1/internal/beta/access');
}

export async function fetchInternalBetaAdmins(): Promise<InternalBetaAdmin[]> {
  return apiRequest<InternalBetaAdmin[]>('/api/v1/internal/beta/admins');
}

export async function saveInternalBetaAdmin(email: string, role: InternalBetaRole): Promise<InternalBetaAdmin> {
  return apiRequest<InternalBetaAdmin>('/api/v1/internal/beta/admins', {
    method: 'POST',
    body: { email, role },
  });
}

export async function setInternalBetaAdminActive(id: number, active: boolean): Promise<InternalBetaAdmin> {
  return apiRequest<InternalBetaAdmin>(`/api/v1/internal/beta/admins/${id}/${active ? 'enable' : 'disable'}`, {
    method: 'PATCH',
  });
}
