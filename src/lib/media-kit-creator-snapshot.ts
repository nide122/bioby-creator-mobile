import type { CreatorPublicSnapshot, MediaKitPreview } from '@/src/types/domain';

export function toCreatorPublicSnapshot(preview: MediaKitPreview): CreatorPublicSnapshot {
  return {
    headline: preview.headline,
    bio: preview.bio,
    heroStats: preview.heroStats,
    platforms: preview.platforms,
    cases: preview.cases.slice(0, 2),
  };
}
