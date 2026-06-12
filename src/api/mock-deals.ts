import type { DealSummary } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

export const MOCK_DEALS: DealSummary[] = [
  {
    id: 'mock-deal-recommended-01',
    brandPlaceholder: 'Luminary Skincare',
    title: 'Barrier repair serum · 3-video series',
    escrowPhase: 'awaiting_prepay',
    nextMilestone: 'Accept to lock $4.8k prepay.',
    outcomeSummary: 'High match with your skincare content. Prepay ready to escrow.',
    source: 'recommended',
    recommendBadge: 'Strong fit',
    recommendReasons: ['Skincare niche match', 'Budget above recent median', 'Deliverables match your short-form workflow'],
    recommendPayoutNote: '100% prepay can be escrowed before production.',
    recommendRiskNote: 'Claims review required. Keep usage limited to campaign scope unless priced separately.',
  },
  {
    id: 'mock-deal-recommended-02',
    brandPlaceholder: 'Volta Energy',
    title: 'EV lifestyle · Instagram Reels x2',
    escrowPhase: 'awaiting_prepay',
    nextMilestone: 'Review packet and confirm deliverables.',
    outcomeSummary: 'Your outdoor audience fits their target demo.',
    source: 'recommended',
    recommendBadge: 'Audience fit',
    recommendReasons: ['Outdoor lifestyle audience match', 'Brand accepts escrow-first delivery', 'Themes reusable in Media Kit'],
    recommendPayoutNote: 'Prepay required before delivery dates are committed.',
    recommendRiskNote: 'Confirm location, usage term, and whether brand needs paid social edits.',
  },
  {
    id: 'mock-deal-alpha',
    brandPlaceholder: 'ClearSkin Lab',
    title: '2 short videos | Claims review',
    escrowPhase: 'in_execution',
    nextMilestone: 'Submit rough cut by May 22, 12:00. Review window: 48h.',
    outcomeSummary: 'Deliver and publish against packet, then move to verification.',
    source: 'self',
  },
  {
    id: 'mock-deal-beta',
    brandPlaceholder: 'TrailPeak Gear',
    title: 'Camping light unboxing + overlay',
    escrowPhase: 'pending_verification',
    nextMilestone: 'Add first-day metrics before final verification.',
    outcomeSummary: 'Post link submitted. Screenshots and metrics still needed.',
    source: 'self',
  },
  {
    id: 'mock-deal-gamma',
    brandPlaceholder: 'CloudField Coffee',
    title: 'Livestream read reshoot',
    escrowPhase: 'remediation',
    nextMilestone: 'Review fixes: replacement, extension, or refund path.',
    outcomeSummary: 'Remediation in progress. Keep evidence and timeline clean.',
    source: 'self',
  },
];

export async function fetchMockDealList(options?: { empty?: boolean }): Promise<DealSummary[]> {
  await mockDelay(200);
  if (options?.empty) return [];
  const deals = MOCK_DEALS.map((d) => ({ ...d }));
  // 推荐订单始终排在前面
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
