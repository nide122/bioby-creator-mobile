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

export type InternalGmailOAuthFailure = {
  failureCode: string;
  count: number;
};

export type InternalGmailOAuthAnalytics = {
  periodDays: number;
  viewed: number;
  started: number;
  callbackReceived: number;
  succeeded: number;
  connectFailed: number;
  oauthFailed: number;
  cancelled: number;
  skipped: number;
  averageConnectDurationMs: number;
  failureReasons: InternalGmailOAuthFailure[];
};

export type InternalMailboxSyncFailure = {
  failureCode: string;
  count: number;
};

export type InternalMailboxSyncAnalytics = {
  periodDays: number;
  started: number;
  succeeded: number;
  empty: number;
  failed: number;
  inProgress: number;
  totalProcessed: number;
  totalNewMessages: number;
  averageDurationMs: number;
  averageConnectionToStartMs: number;
  failureReasons: InternalMailboxSyncFailure[];
};

export type InternalCommercialProcessingFailure = {
  stage: string;
  failureCode: string;
  count: number;
};

export type InternalCommercialProcessingAnalytics = {
  periodDays: number;
  detectionStarted: number;
  commercialDetected: number;
  nonCommercial: number;
  detectionFailed: number;
  detectionInProgress: number;
  briefStarted: number;
  briefSucceeded: number;
  briefFailed: number;
  briefInProgress: number;
  classificationCorrections: number;
  averageDetectionDurationMs: number;
  averageBriefDurationMs: number;
  failureReasons: InternalCommercialProcessingFailure[];
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
  gmailOAuthLastEventType?: string | null;
  gmailOAuthLastEventAt?: string | null;
  gmailOAuthLastFailureCode?: string | null;
  gmailOAuthLastSource?: string | null;
  gmailOAuthLastPlatform?: string | null;
  firstSyncLastEventType?: string | null;
  firstSyncLastEventAt?: string | null;
  firstSyncLastFailureCode?: string | null;
  firstSyncNewCount?: number | null;
  commercialProcessingLastEventType?: string | null;
  commercialProcessingLastEventAt?: string | null;
  commercialProcessingLastStage?: string | null;
  commercialProcessingLastFailureCode?: string | null;
  commercialProcessingLastCategory?: string | null;
  currentStage: InternalBetaStage;
};

export type InternalBetaDashboard = {
  summary: InternalBetaSummary;
  gmailOAuth: InternalGmailOAuthAnalytics;
  mailboxSync: InternalMailboxSyncAnalytics;
  commercialProcessing: InternalCommercialProcessingAnalytics;
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

export type InternalBetaFeedbackType = 'PROBLEM' | 'SUGGESTION' | 'CONFUSING' | 'OTHER';

export type InternalBetaFeedback = {
  id: string;
  userId: string;
  email: string;
  displayName?: string | null;
  workspaceId: string;
  workspaceName: string;
  feedbackType: InternalBetaFeedbackType;
  content: string;
  contactAllowed: boolean;
  sourcePage?: string | null;
  appVersion?: string | null;
  clientPlatform?: string | null;
  errorCode?: string | null;
  submittedAt: string;
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

export async function fetchInternalBetaFeedback(): Promise<InternalBetaFeedback[]> {
  return apiRequest<InternalBetaFeedback[]>('/api/v1/internal/beta/feedback');
}
