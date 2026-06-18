import { generateMockProfileSummary } from '@/src/api/mock-creator-profile-summary';
import { ApiError, apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { ProfileFactsSnapshot, SummarySuggestion } from '@/src/types/creator-profile';

export type { SummarySuggestion, ProfileFactsSnapshot };

export async function generateCreatorProfileSummary(
  snapshot: ProfileFactsSnapshot,
): Promise<SummarySuggestion> {
  if (!shouldUseBackendApi()) {
    return generateMockProfileSummary(snapshot);
  }

  try {
    return await apiRequest<SummarySuggestion>('/api/v1/account/profile/generate-summary', {
      method: 'POST',
      body: { snapshot },
      suppressSessionExpiry: true,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && error.code === 'UNAUTHORIZED') {
      throw new ApiError(
        503,
        'GENERATE_SUMMARY_ENDPOINT_MISSING',
        'Creator API is missing POST /api/v1/account/profile/generate-summary. Rebuild and restart the backend (./mvnw spring-boot:run), then try again.',
      );
    }
    throw error;
  }
}
