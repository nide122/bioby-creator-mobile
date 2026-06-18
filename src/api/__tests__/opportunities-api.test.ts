import { fetchOpportunityThreadPage } from '@/src/api/opportunities-api';

jest.mock('@/src/api/api-config', () => ({
  isApiConfigured: jest.fn(() => false),
}));

describe('fetchOpportunityThreadPage', () => {
  it('treats needs-action as high-value plus negotiation bands in mock mode', async () => {
    const page = await fetchOpportunityThreadPage({ needsAction: true });

    expect(page.items.map((item) => item.id)).toEqual(['thread-skincare', 'thread-hardware']);
    expect(page.items.map((item) => item.leadValueBand)).toEqual(['high_value', 'needs_negotiation']);
    expect(page.items.map((item) => item.messageCount)).toEqual([2, 2]);
    expect(page.categoryCounts).toMatchObject({
      commercial: 2,
      pr_sample: 0,
      media: 0,
      personal: 0,
      spam: 0,
      other: 0,
    });
    expect(page.valueBandCounts).toMatchObject({
      high_value: 1,
      needs_negotiation: 1,
    });
    expect(page.valueBandCounts?.archived ?? 0).toBeGreaterThan(0);
  });

  it('sorts by classification score in mock mode', async () => {
    const page = await fetchOpportunityThreadPage({
      needsAction: true,
      sortBy: 'CLASSIFICATION_SCORE',
      sortDirection: 'DESC',
    });

    expect(page.items.map((item) => item.id)).toEqual(['thread-skincare', 'thread-hardware']);
  });

  it('sorts by message count in mock mode', async () => {
    const ascending = await fetchOpportunityThreadPage({
      sortBy: 'MESSAGE_COUNT',
      sortDirection: 'ASC',
    });
    const descending = await fetchOpportunityThreadPage({
      sortBy: 'MESSAGE_COUNT',
      sortDirection: 'DESC',
    });

    const ascendingCounts = ascending.items.map((item) => item.messageCount ?? 1);
    const descendingCounts = descending.items.map((item) => item.messageCount ?? 1);

    expect(ascendingCounts).toEqual([...ascendingCounts].sort((a, b) => a - b));
    expect(descendingCounts).toEqual([...descendingCounts].sort((a, b) => b - a));
  });
});
