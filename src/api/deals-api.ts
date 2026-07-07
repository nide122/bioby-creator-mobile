import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { mapDealPacketDto } from '@/src/api/deal-packet-mappers';
import { mapDealDto } from '@/src/api/deal-mappers';
import { fetchMockDealPacket } from '@/src/api/mock-deal-packet';
import { fetchMockDealById, fetchMockDealList } from '@/src/api/mock-deals';
import type { DealPacketWireView, DealListItemView } from '@/src/types/api';
import type { DealSummary } from '@/src/types/domain';
import type { DealPacketView } from '@/src/types/deal-workflow';

export async function fetchDealList(): Promise<DealSummary[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealList();
  }
  const items = await apiRequest<DealListItemView[]>('/api/v1/deals');
  const mapped = items.map(mapDealDto);
  return [
    ...mapped.filter((d) => d.source === 'recommended'),
    ...mapped.filter((d) => d.source === 'self'),
  ];
}

export async function fetchDealById(dealId: string): Promise<DealSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealById(dealId);
  }
  const item = await apiRequest<DealListItemView>(`/api/v1/deals/${dealId}`);
  return mapDealDto(item);
}

export async function fetchDealPacket(dealId: string): Promise<DealPacketView> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealPacket(dealId);
  }
  const dto = await apiRequest<DealPacketWireView>(`/api/v1/deals/${dealId}/packet`);
  return mapDealPacketDto(dto);
}

export async function acceptRecommendedDeal(dealId: string): Promise<DealSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealById(dealId);
  }
  const item = await apiRequest<DealListItemView>(`/api/v1/deals/${dealId}/accept`, { method: 'POST' });
  return mapDealDto(item);
}

export async function declineRecommendedDeal(dealId: string): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest(`/api/v1/deals/${dealId}/decline`, { method: 'POST' });
}

export async function submitDealVerification(
  dealId: string,
  input: { postLink: string; firstDayMetrics: string; creatorNote: string }
): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest(`/api/v1/deals/${dealId}/verification-submissions`, {
    method: 'POST',
    body: input,
  });
}

export async function registerDealDeliveryUpload(
  dealId: string,
  input: { uploadId: string; title?: string }
): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest(`/api/v1/deals/${dealId}/delivery-uploads`, {
    method: 'POST',
    body: input,
  });
}

export async function collectDealPrepay(dealId: string): Promise<DealSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealById(dealId);
  }
  const item = await apiRequest<DealListItemView>(`/api/v1/deals/${dealId}/collect-prepay`, { method: 'POST' });
  return mapDealDto(item);
}

export async function settleDeal(dealId: string): Promise<DealSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealById(dealId);
  }
  const item = await apiRequest<DealListItemView>(`/api/v1/deals/${dealId}/settle`, { method: 'POST' });
  return mapDealDto(item);
}

export async function approveDealVerification(dealId: string): Promise<DealSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealById(dealId);
  }
  const item = await apiRequest<DealListItemView>(`/api/v1/deals/${dealId}/approve-verification`, { method: 'POST' });
  return mapDealDto(item);
}

export async function openDealDispute(dealId: string, input: { title: string; causeCode?: string }): Promise<DealSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockDealById(dealId);
  }
  const item = await apiRequest<DealListItemView>(`/api/v1/deals/${dealId}/disputes`, {
    method: 'POST',
    body: input,
  });
  return mapDealDto(item);
}
