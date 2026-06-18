import { MOCK_DEAL_CATALOG } from '@/src/data/mock-deal-catalog';
import type { DealSummary } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

export const MOCK_DEALS: DealSummary[] = MOCK_DEAL_CATALOG;

export async function fetchMockDealList(options?: { empty?: boolean }): Promise<DealSummary[]> {
  await mockDelay(200);
  if (options?.empty) return [];
  const deals = MOCK_DEALS.map((d) => ({ ...d }));
  return [...deals.filter((d) => d.source === 'recommended'), ...deals.filter((d) => d.source === 'self')];
}

export async function fetchMockDealById(dealId: string): Promise<DealSummary> {
  await mockDelay(160);
  const deal = MOCK_DEALS.find((d) => d.id === dealId);
  if (!deal) {
    throw new Error(`deal_not_found:${dealId}`);
  }
  return deal;
}
