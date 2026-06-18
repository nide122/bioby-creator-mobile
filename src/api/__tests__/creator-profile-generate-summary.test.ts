import { generateMockProfileSummary } from '@/src/api/mock-creator-profile-summary';
import { ApiError, apiRequest } from '@/src/api/api-client';
import { generateCreatorProfileSummary } from '@/src/api/creator-profile-generate-summary';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { ProfileFactsSnapshot } from '@/src/types/creator-profile';

jest.mock('@/src/api/should-use-backend-api', () => ({
  shouldUseBackendApi: jest.fn(),
}));

jest.mock('@/src/api/api-client', () => {
  class MockApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return {
    ApiError: MockApiError,
    isAuthApiError: (error: unknown) =>
      error instanceof MockApiError && (error.status === 401 || error.code === 'TOKEN_EXPIRED'),
    apiRequest: jest.fn(),
  };
});

jest.mock('@/src/api/mock-creator-profile-summary', () => ({
  generateMockProfileSummary: jest.fn(),
}));

const mockedShouldUseBackendApi = shouldUseBackendApi as jest.MockedFunction<typeof shouldUseBackendApi>;
const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

const snapshot: ProfileFactsSnapshot = {
  connectedPlatforms: ['tiktok'],
  slots: {
    tiktok: {
      handle: 'home.finds',
      displayName: 'Home Finds',
      bio: 'Short-form home gadgets.',
      nicheTags: ['Home'],
      followerCount: 210_000,
    },
  },
  existingSummary: { displayName: '', bio: '', nicheTags: [] },
  locale: 'en',
  intent: 'creator_positioning_for_brands',
};

describe('generateCreatorProfileSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses mock in demo mode', async () => {
    mockedShouldUseBackendApi.mockReturnValue(false);

    await generateCreatorProfileSummary(snapshot);

    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('surfaces stale backend missing generate-summary endpoint', async () => {
    mockedShouldUseBackendApi.mockReturnValue(true);
    mockedApiRequest.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));

    await expect(generateCreatorProfileSummary(snapshot)).rejects.toMatchObject({
      code: 'GENERATE_SUMMARY_ENDPOINT_MISSING',
    });
  });
});
