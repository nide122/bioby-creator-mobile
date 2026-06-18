import { mockDelay } from '@/src/lib/mock-delay';
import {
  buildProfileFactsSnapshot,
  listConnectedPresetPlatformKeys,
} from '@/src/lib/creator-profile-aggregate';
import type {
  CreatorPlatformProfile,
  CreatorProfileSummary,
  PresetPlatformKey,
  ProfileFactsSnapshot,
  SummarySuggestion,
} from '@/src/types/creator-profile';

export async function generateMockProfileSummary(
  snapshot: ProfileFactsSnapshot,
): Promise<SummarySuggestion> {
  await mockDelay(520);

  const connected = snapshot.connectedPlatforms;
  const slots = snapshot.slots;
  const primary = pickPrimaryPlatform(connected, slots);
  const primarySlot = primary ? slots[primary] : undefined;

  const displayName = primarySlot?.displayName?.trim() || primarySlot?.handle?.replace(/^@/, '') || '';
  const bio = synthesizeBio(snapshot, primary, primarySlot);
  const nicheTags = synthesizeTags(snapshot);

  return {
    suggestion: { displayName, bio, nicheTags },
    confidence: hasLowConfidence(snapshot) ? 'low' : 'high',
    fieldProvenance: {
      displayName: { source: 'synthesized', fromPlatforms: primary ? [primary] : connected },
      bio: { source: 'synthesized', fromPlatforms: connected },
      nicheTags: { source: 'synthesized', fromPlatforms: connected },
    },
    reasons:
      connected.length > 1
        ? [`Combined facts from ${connected.join(', ')}`]
        : primary
          ? [`Based on ${primary} platform profile`]
          : [],
  };
}

function pickPrimaryPlatform(
  connected: PresetPlatformKey[],
  slots: ProfileFactsSnapshot['slots'],
): PresetPlatformKey | undefined {
  let best: PresetPlatformKey | undefined;
  let bestFollowers = -1;
  for (const platform of connected) {
    const slot = slots[platform];
    const followers = slot?.followerCount ?? 0;
    if (followers > bestFollowers) {
      bestFollowers = followers;
      best = platform;
    }
  }
  return best ?? connected[0];
}

function synthesizeBio(
  snapshot: ProfileFactsSnapshot,
  primary: PresetPlatformKey | undefined,
  primarySlot: ProfileFactsSnapshot['slots'][PresetPlatformKey] | undefined,
): string {
  const zh = snapshot.locale.startsWith('zh');
  if (primarySlot?.bio?.trim()) {
    const trimmed = trimBio(primarySlot.bio);
    if (snapshot.connectedPlatforms.length === 1) return trimmed;
    return zh
      ? `跨平台创作者，专注${primarySlot.nicheTags?.[0] ?? '生活方式'}。${trimBio(primarySlot.bio, 80)}`
      : `Cross-platform creator focused on ${primarySlot.nicheTags?.[0] ?? 'lifestyle'}. ${trimBio(primarySlot.bio, 80)}`;
  }
  for (const platform of snapshot.connectedPlatforms) {
    const bio = snapshot.slots[platform]?.bio?.trim();
    if (bio) return trimBio(bio);
  }
  return zh
    ? `面向品牌合作的创作者，内容覆盖 ${snapshot.connectedPlatforms.join('、')}。`
    : `Creator partnering with brands across ${snapshot.connectedPlatforms.join(', ')}.`;
}

function synthesizeTags(snapshot: ProfileFactsSnapshot): string[] {
  const tags = new Set<string>();
  for (const platform of snapshot.connectedPlatforms) {
    for (const tag of snapshot.slots[platform]?.nicheTags ?? []) {
      if (tag.trim()) tags.add(tag.trim());
    }
  }
  const list = [...tags].slice(0, 5);
  if (list.length >= 3) return list;
  const zh = snapshot.locale.startsWith('zh');
  if (!list.length) {
    list.push(zh ? '创作者' : 'Creator', zh ? '品牌合作' : 'Brand partnerships');
  }
  while (list.length < 3) list.push(zh ? '内容创作' : 'Content');
  return list.slice(0, 5);
}

function hasLowConfidence(snapshot: ProfileFactsSnapshot): boolean {
  return snapshot.connectedPlatforms.some((platform) => snapshot.slots[platform]?.confidence === 'low');
}

function trimBio(bio: string, maxLen = 120): string {
  const trimmed = bio.trim();
  return trimmed.length <= maxLen ? trimmed : `${trimmed.slice(0, maxLen - 1).trim()}…`;
}

export function buildMockProfileFactsSnapshot(input: {
  summary: CreatorProfileSummary;
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile>;
  locale: string;
}): ProfileFactsSnapshot {
  return buildProfileFactsSnapshot(input);
}

export function canGenerateProfileSummary(
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile>,
): boolean {
  return listConnectedPresetPlatformKeys(platformProfiles).length > 0;
}
