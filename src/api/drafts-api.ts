import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { mapDraftDetail, mapDraftSummary, type DraftDetailDto, type DraftListItemDto } from '@/src/api/draft-mappers';
import { fetchMockDraftDetail, fetchMockDrafts } from '@/src/api/mock-draft';
import type { DraftDetail, DraftKind, DraftSummary } from '@/src/types/domain';

export async function fetchDraftList(): Promise<DraftSummary[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockDrafts();
  }
  const items = await apiRequest<DraftListItemDto[]>('/api/v1/drafts');
  return items.map(mapDraftSummary);
}

export async function fetchDraftDetail(draftId: string): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(draftId);
  }
  const item = await apiRequest<DraftDetailDto>(`/api/v1/drafts/${draftId}`);
  return mapDraftDetail(item);
}

export async function createDraftForOpportunity(
  opportunityId: string,
  kind: DraftKind,
): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(kind === 'quote' ? 'draft-quote-02' : 'draft-reply-01');
  }
  const item = await apiRequest<DraftDetailDto>('/api/v1/drafts', {
    method: 'POST',
    body: { opportunityId, kind },
  });
  return mapDraftDetail(item);
}

export async function approveDraftOnServer(draftId: string): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(draftId);
  }
  const item = await apiRequest<DraftDetailDto>(`/api/v1/drafts/${draftId}/approve`, { method: 'POST' });
  return mapDraftDetail(item);
}

export type RemoteDraftSyncInput = {
  emailMessageId?: number | null;
  to?: string[];
  subject?: string;
  bodyText?: string;
};

export type RemoteDraftSyncResult = {
  outboundId: number;
  draftId: number;
  status: string;
  provider: string;
  remoteDraftId?: string | null;
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  sentAtISO?: string | null;
  errorMessage?: string | null;
};

export async function syncDraftToNativeMailbox(
  draftId: string,
  input: RemoteDraftSyncInput = {},
): Promise<RemoteDraftSyncResult | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<RemoteDraftSyncResult>(`/api/v1/drafts/${draftId}/remote-draft`, {
    method: 'POST',
    body: input,
  });
}

export async function sendNativeMailboxDraft(draftId: string): Promise<RemoteDraftSyncResult | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<RemoteDraftSyncResult>(`/api/v1/drafts/${draftId}/remote-draft/send`, {
    method: 'POST',
  });
}
