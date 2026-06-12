import { fetchOpportunityThreadPage } from '@/src/api/opportunities-api';

jest.mock('@/src/api/api-config', () => ({
  isApiConfigured: jest.fn(() => false),
}));

describe('fetchOpportunityThreadPage', () => {
  it('treats needs-action as decide-now plus develop threads in mock mode', async () => {
    const page = await fetchOpportunityThreadPage({ needsAction: true });

    expect(page.items.map((item) => item.id)).toEqual(['thread-skincare', 'thread-hardware']);
    expect(page.items.map((item) => item.actionTier)).toEqual(['DEVELOP', 'DECIDE_NOW']);
    expect(page.items.map((item) => item.messageCount)).toEqual([2, 2]);
    expect(page.categoryCounts).toMatchObject({
      commercial: 2,
      pr_sample: 0,
      media: 0,
      personal: 0,
      other: 0,
    });
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
