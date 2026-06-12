import {
  dedupePublicProofCatalog,
  resolveMediaKitPublicProofs,
  trustMetricToPublicProofItem,
} from '@/src/lib/public-proof';
import type { PublicProofItem, TrustMetricCard } from '@/src/types/domain';

const METRIC: TrustMetricCard = {
  id: 'tm-punctual',
  label: 'On-time publish',
  value: '96%',
  trendNote: 'Rolling 90 days',
  disclaimer: 'Demo metric only.',
};

describe('public-proof', () => {
  it('maps trust metrics to public proof items', () => {
    expect(trustMetricToPublicProofItem(METRIC)).toEqual({
      id: 'proof-tm-punctual',
      trustMetricId: 'tm-punctual',
      label: 'On-time publish',
      value: '96%',
      trendNote: 'Rolling 90 days',
      disclaimer: 'Demo metric only.',
    });
  });

  it('dedupes catalog rows by trustMetricId', () => {
    const duplicate = trustMetricToPublicProofItem(METRIC);
    const catalog: PublicProofItem[] = [
      duplicate,
      { ...duplicate, id: 'proof-tm-punctual-copy' },
      {
        id: 'proof-tm-response',
        trustMetricId: 'tm-response',
        label: 'Avg response time',
        value: '6.5h',
      },
    ];

    expect(dedupePublicProofCatalog(catalog)).toHaveLength(2);
  });

  it('filters catalog by enabled ids without duplicate trust metrics', () => {
    const catalog: PublicProofItem[] = [
      trustMetricToPublicProofItem(METRIC),
      {
        id: 'proof-tm-response',
        trustMetricId: 'tm-response',
        label: 'Avg response time',
        value: '6.5h',
      },
    ];

    expect(resolveMediaKitPublicProofs(catalog, ['proof-tm-punctual'])).toHaveLength(1);
    expect(resolveMediaKitPublicProofs(catalog, undefined)).toHaveLength(0);

    const duplicate = trustMetricToPublicProofItem(METRIC);
    const dupCatalog: PublicProofItem[] = [
      duplicate,
      { ...duplicate, id: 'proof-tm-punctual-copy' },
    ];
    expect(resolveMediaKitPublicProofs(dupCatalog, ['proof-tm-punctual', 'proof-tm-punctual-copy'])).toHaveLength(1);
    expect(resolveMediaKitPublicProofs(catalog, ['tm-punctual'])).toHaveLength(1);
  });
});
