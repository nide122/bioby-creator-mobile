import { hasSamePackageOrder, reorderRateCardPackages } from '@/src/lib/rate-card-package-reorder';
import { previewWebPackageOrder } from '@/src/hooks/use-web-long-press-reorder';
import type { RateCardPackage } from '@/src/types/domain';

function pkg(id: string): RateCardPackage {
  return {
    id,
    name: id,
    tagline: '',
    priceLabel: '$1k',
    deliverables: [],
    revisionRounds: '',
    usageRights: '',
    prepayLabel: '',
    addOnHint: '',
    highlights: [],
  };
}

describe('rate-card-package-reorder', () => {
  it('moves a package before another id', () => {
    const input = [pkg('a'), pkg('b'), pkg('c')];
    expect(reorderRateCardPackages(input, 'c', 'a').map((row) => row.id)).toEqual(['c', 'a', 'b']);
  });

  it('detects unchanged order', () => {
    const input = [pkg('a'), pkg('b')];
    expect(hasSamePackageOrder(input, [pkg('a'), pkg('b')])).toBe(true);
    expect(hasSamePackageOrder(input, [pkg('b'), pkg('a')])).toBe(false);
  });

  it('previews web drag order without persisting', () => {
    const input = [pkg('a'), pkg('b'), pkg('c')];
    expect(previewWebPackageOrder(input, 'c', 'a').map((row) => row.id)).toEqual(['c', 'a', 'b']);
    expect(previewWebPackageOrder(input, null, 'a')).toEqual(input);
  });
});
