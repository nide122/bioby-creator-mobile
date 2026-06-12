import { fetchMockDealById, fetchMockDealList } from '@/src/api/mock-deals';

jest.mock('@/src/lib/mock-delay', () => ({
  mockDelay: jest.fn().mockResolvedValue(undefined),
}));

describe('mock-deals', () => {
  it('returns a non-empty deal list for UI smoke flows', async () => {
    const deals = await fetchMockDealList();
    expect(deals.length).toBeGreaterThan(0);
    expect(deals.some((d) => d.id === 'mock-deal-beta')).toBe(true);
  });

  it('loads deal detail by id', async () => {
    const deal = await fetchMockDealById('mock-deal-beta');
    expect(deal.id).toBe('mock-deal-beta');
    expect(deal.title).toBeTruthy();
  });

  it('throws for unknown deal ids', async () => {
    await expect(fetchMockDealById('missing-deal')).rejects.toThrow(/deal_not_found/);
  });
});
