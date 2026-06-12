import {
  fetchMockMediaKitPreview,
  primeMockGrowthQueryFailure,
} from '@/src/api/mock-growth';

describe('mock-growth failure switch', () => {
  it('fails once after priming, then succeeds', async () => {
    primeMockGrowthQueryFailure();
    await expect(fetchMockMediaKitPreview()).rejects.toThrow('Network is unstable');
    await expect(fetchMockMediaKitPreview()).resolves.toMatchObject({
      headline: expect.any(String),
    });
  });
});
