import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  mapDisputeCase,
  mapPaymentLine,
  mapPaymentsOverview,
  type DisputeCaseDto,
  type PaymentLineDto,
  type PaymentsOverviewDto,
} from '@/src/api/money-mappers';
import {
  fetchMockDisputes,
  fetchMockPayments,
  fetchMockPaymentsOverview,
} from '@/src/api/mock-money';
import type { DisputeCase, PaymentLineItem, PaymentsOverview } from '@/src/types/domain';

export async function fetchPayments(): Promise<PaymentLineItem[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockPayments();
  }
  const items = await apiRequest<PaymentLineDto[]>('/api/v1/payments');
  return items.map(mapPaymentLine);
}

export async function fetchPaymentsOverview(): Promise<PaymentsOverview> {
  if (!shouldUseBackendApi()) {
    return fetchMockPaymentsOverview();
  }
  const overview = await apiRequest<PaymentsOverviewDto>('/api/v1/payments/overview');
  return mapPaymentsOverview(overview);
}

export async function fetchDisputes(): Promise<DisputeCase[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockDisputes();
  }
  const items = await apiRequest<DisputeCaseDto[]>('/api/v1/disputes');
  return items.map(mapDisputeCase);
}
