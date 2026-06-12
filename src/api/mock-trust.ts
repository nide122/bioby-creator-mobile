import type { PublicProofItem, TrustMetricCard } from '@/src/types/domain';
import { trustMetricToPublicProofItem } from '@/src/lib/public-proof';
import { mockDelay } from '@/src/lib/mock-delay';

const METRICS: TrustMetricCard[] = [
  {
    id: 'tm-punctual',
    label: 'On-time publish',
    value: '96%',
    trendNote: 'Rolling 90 days',
    disclaimer: 'Based on your deal records, not a credit score.',
  },
  {
    id: 'tm-disclosure',
    label: 'Disclosure pass rate',
    value: '93%',
    trendNote: 'Generated from disclosure and delivery records',
    disclaimer: 'Definition may vary by deal packet.',
  },
  {
    id: 'tm-response',
    label: 'Avg response time',
    value: '6.5h',
    trendNote: 'Based on delivery communication records',
    disclaimer: 'Business-day response only.',
  },
  {
    id: 'tm-repeat',
    label: 'Repeat intent',
    value: 'Med-high',
    trendNote: 'From structured brand feedback',
    disclaimer: 'Subjective feedback is private by default.',
  },
];

export const MOCK_PUBLIC_PROOF_ITEMS: PublicProofItem[] = METRICS.map(trustMetricToPublicProofItem);

export async function fetchMockTrustMetrics(): Promise<TrustMetricCard[]> {
  await mockDelay(120);
  return METRICS.map((m) => ({ ...m }));
}

export async function fetchMockPublicProofCatalog(): Promise<PublicProofItem[]> {
  await mockDelay(100);
  return MOCK_PUBLIC_PROOF_ITEMS.map((item) => ({ ...item }));
}
