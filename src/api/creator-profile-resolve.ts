import {
  resolveCreatorProfileFromUrl as resolveCreatorProfileFromUrlMock,
  type CreatorProfileResolved,
  type SocialPlatformKey,
} from '@/src/api/mock-creator-profile';
import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';

type PresetPlatformKey = Extract<SocialPlatformKey, 'youtube' | 'tiktok' | 'instagram'>;

export type { CreatorProfileResolved };

export async function resolveCreatorProfileFromUrl(
  inputUrl: string,
  expectedPlatform?: PresetPlatformKey,
): Promise<CreatorProfileResolved> {
  if (!shouldUseBackendApi()) {
    return resolveCreatorProfileFromUrlMock(inputUrl, expectedPlatform);
  }

  return apiRequest<CreatorProfileResolved>('/api/v1/account/profile/resolve', {
    method: 'POST',
    body: {
      profileUrl: inputUrl.trim(),
      platform: expectedPlatform ?? null,
    },
  });
}
