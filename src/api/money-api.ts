import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { mapDisputeCase, mapPaymentLine, mapPaymentsOverview } from '@/src/api/money-mappers';
import {
  fetchMockDisputes,
  fetchMockPayments,
  fetchMockPaymentsOverview,
} from '@/src/api/mock-money';
import type { DisputeCaseView, PaymentLineView, PaymentsOverviewView } from '@/src/types/api';
import type { DisputeCase, PaymentLineItem, PaymentsOverview } from '@/src/types/domain';

export async function fetchPayments(): Promise<PaymentLineItem[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockPayments();
  }
  const items = await apiRequest<PaymentLineView[]>('/api/v1/payments');
  return items.map(mapPaymentLine);
}

export async function fetchPaymentsOverview(): Promise<PaymentsOverview> {
  if (!shouldUseBackendApi()) {
    return fetchMockPaymentsOverview();
  }
  const overview = await apiRequest<PaymentsOverviewView>('/api/v1/payments/overview');
  return mapPaymentsOverview(overview);
}

export async function fetchDisputes(): Promise<DisputeCase[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockDisputes();
  }
  const items = await apiRequest<DisputeCaseView[]>('/api/v1/disputes');
  return items.map(mapDisputeCase);
}

export async function resolveDispute(disputeId: string, resolutionNote?: string): Promise<DisputeCase> {
  if (!shouldUseBackendApi()) {
    const items = await fetchMockDisputes();
    return items.find((d) => d.id === disputeId) ?? items[0];
  }
  const item = await apiRequest<DisputeCaseView>(`/api/v1/disputes/${disputeId}/resolve`, {
    method: 'POST',
    body: resolutionNote ? { resolutionNote } : {},
  });
  return mapDisputeCase(item);
}
