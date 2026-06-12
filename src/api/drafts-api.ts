import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { mapDraftDetail, mapDraftSummary, type DraftDetailDto, type DraftListItemDto } from '@/src/api/draft-mappers';
import { fetchMockDraftDetail, fetchMockDrafts } from '@/src/api/mock-draft';
import type { DraftDetail, DraftSummary } from '@/src/types/domain';

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

export async function approveDraftOnServer(draftId: string): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(draftId);
  }
  const item = await apiRequest<DraftDetailDto>(`/api/v1/drafts/${draftId}/approve`, { method: 'POST' });
  return mapDraftDetail(item);
}
