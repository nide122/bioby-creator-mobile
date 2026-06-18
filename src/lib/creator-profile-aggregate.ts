import type { CreatorProfileResolved } from '@/src/api/mock-creator-profile';
import type { CreatorProfileBasics } from '@/src/stores/session-store';
import {
  PRESET_PLATFORM_KEYS,
  PRESET_PLATFORM_LABELS,
  PRESET_TO_SOCIAL_KEY,
  type CreatorPlatformProfile,
  type CreatorProfileSummary,
  type PlatformCardMode,
  type PresetPlatformKey,
  type ProfileFactsSnapshot,
  type SummaryAdoptField,
  type SummaryAdoptOptions,
  type SummarySuggestion,
} from '@/src/types/creator-profile';

const PLATFORM_HOSTS: Record<PresetPlatformKey, string[]> = {
  youtube: ['youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com'],
  instagram: ['instagram.com'],
};

export function createEmptyPlatformProfile(platform: PresetPlatformKey): CreatorPlatformProfile {
  return { platform, status: 'empty' };
}

export function createEmptyPlatformProfiles(): Record<PresetPlatformKey, CreatorPlatformProfile> {
  return {
    youtube: createEmptyPlatformProfile('youtube'),
    tiktok: createEmptyPlatformProfile('tiktok'),
    instagram: createEmptyPlatformProfile('instagram'),
  };
}

export function parseNicheTags(text: string): string[] {
  return text
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatNicheTagsText(tags: string[]): string {
  return tags.join(', ');
}

export function syncPlatformsList(
  profiles: Record<PresetPlatformKey, CreatorPlatformProfile>,
): string[] {
  return PRESET_PLATFORM_KEYS.filter((key) => profiles[key].status !== 'empty').map(
    (key) => PRESET_PLATFORM_LABELS[key],
  );
}

/** One-line platform stat for summary UI, e.g. "TikTok · @handle · 210K followers". */
export function formatPlatformStatLine(slot: CreatorPlatformProfile): string | null {
  if (slot.status === 'empty') return null;

  const parts = [PRESET_PLATFORM_LABELS[slot.platform]];
  if (slot.handle?.trim()) parts.push(`@${slot.handle.replace(/^@/, '')}`);
  if (slot.followerCountLabel?.trim()) parts.push(slot.followerCountLabel.trim());
  return parts.join(' · ');
}

export function listConnectedPlatformStatLines(
  profiles: Record<PresetPlatformKey, CreatorPlatformProfile>,
): string[] {
  return PRESET_PLATFORM_KEYS.flatMap((key) => {
    const line = formatPlatformStatLine(profiles[key]);
    return line ? [line] : [];
  });
}

export function listConnectedPresetPlatformKeys(
  profiles: Record<PresetPlatformKey, CreatorPlatformProfile> | undefined,
): PresetPlatformKey[] {
  if (!profiles) return [];
  return PRESET_PLATFORM_KEYS.filter((key) => profiles[key]?.status !== 'empty');
}

export function validatePlatformUrl(url: string, platform: PresetPlatformKey): boolean {
  const trimmed = url.trim();
  if (trimmed.length < 6) return false;

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return PLATFORM_HOSTS[platform].some((fixtureHost) => host === fixtureHost || host.endsWith(`.${fixtureHost}`));
  } catch {
    return false;
  }
}

export function platformSlotFromResolved(
  platform: PresetPlatformKey,
  resolved: CreatorProfileResolved,
): CreatorPlatformProfile {
  return {
    platform,
    profileUrl: resolved.canonicalUrl,
    handle: resolved.handle,
    displayName: resolved.displayName,
    bio: resolved.bio,
    followerCountLabel: resolved.followerCountLabel,
    followerCount: resolved.followerCount,
    avgViews: resolved.avgViews,
    engagementRate: resolved.engagementRate,
    avatarUrl: resolved.avatarUrl,
    crmInfluencerId: resolved.crmInfluencerId,
    email: resolved.email,
    minPrice: resolved.minPrice,
    maxPrice: resolved.maxPrice,
    nicheTags: resolved.nicheTags,
    confidence: resolved.confidence,
    resolvedAtISO: resolved.fetchedAtISO,
    status: 'linked',
  };
}

export function prefillSummaryIfEmpty(
  summary: CreatorProfileSummary,
  resolved: CreatorProfileResolved,
): CreatorProfileSummary {
  const next = { ...summary };

  if (!next.displayName.trim() && resolved.displayName.trim()) {
    next.displayName = resolved.displayName;
  }
  if (!next.bio.trim() && resolved.bio.trim()) {
    next.bio = resolved.bio;
  }
  if (!parseNicheTags(next.nicheTagsText).length && resolved.nicheTags.length) {
    next.nicheTagsText = resolved.nicheTags.join(', ');
  }

  return next;
}

export function getPlatformCardMode(
  slot: CreatorPlatformProfile,
  isEditing: boolean,
): PlatformCardMode {
  if (isEditing || slot.status === 'empty') return 'input';
  return 'display';
}

export function isSummaryComplete(summary: CreatorProfileSummary): boolean {
  const nicheTags = parseNicheTags(summary.nicheTagsText);
  return (
    summary.displayName.trim().length >= 2 &&
    (summary.bio.trim().length >= 6 || nicheTags.length >= 1)
  );
}

export function migrateLegacyProfileBasics(
  basics: CreatorProfileBasics | null,
  pendingDisplayName?: string | null,
): {
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile>;
  summary: CreatorProfileSummary;
} {
  const platformProfiles = createEmptyPlatformProfiles();

  if (basics?.platformProfiles) {
    for (const key of PRESET_PLATFORM_KEYS) {
      const slot = basics.platformProfiles[key];
      if (slot) platformProfiles[key] = { ...createEmptyPlatformProfile(key), ...slot };
    }
  } else if (basics?.profileUrl && basics.platform) {
    const legacyKey = basics.platform as PresetPlatformKey;
    if (PRESET_PLATFORM_KEYS.includes(legacyKey)) {
      platformProfiles[legacyKey] = {
        platform: legacyKey,
        profileUrl: basics.profileUrl,
        handle: basics.handle,
        displayName: basics.displayName,
        bio: basics.bio,
        followerCountLabel: basics.followerCountLabel,
        nicheTags: basics.nicheTags,
        confidence: basics.confidence,
        status: 'linked',
      };
    }
  }

  return {
    platformProfiles,
    summary: {
      displayName: basics?.displayName ?? pendingDisplayName ?? '',
      bio: basics?.bio ?? '',
      nicheTagsText: basics?.nicheTags?.join(', ') ?? '',
    },
  };
}

/** Account Tab hero: connected platform icons + subtitle fallback. */
export function resolveAccountProfileHeroMeta(
  profile: CreatorProfileBasics | null,
  emailFallback: string,
): { connectedKeys: PresetPlatformKey[]; subtitle: string } {
  const { platformProfiles } = migrateLegacyProfileBasics(profile);
  const connectedKeys = listConnectedPresetPlatformKeys(platformProfiles);

  if (connectedKeys.length > 0) {
    const statLines = listConnectedPlatformStatLines(platformProfiles);
    return {
      connectedKeys,
      subtitle: statLines.length > 0 ? statLines.join(' · ') : syncPlatformsList(platformProfiles).join(' · '),
    };
  }

  if (profile?.platformLabel) {
    const legacyLine = `${profile.platformLabel}${profile.handle ? ` · @${profile.handle.replace(/^@/, '')}` : ''}`;
    return { connectedKeys: [], subtitle: legacyLine };
  }

  return { connectedKeys: [], subtitle: emailFallback };
}

export function buildCreatorProfileBasics(input: {
  summary: CreatorProfileSummary;
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile>;
}): CreatorProfileBasics {
  const nicheTags = parseNicheTags(input.summary.nicheTagsText);
  const platforms = syncPlatformsList(input.platformProfiles);
  const firstLinked = PRESET_PLATFORM_KEYS.find((key) => input.platformProfiles[key].status !== 'empty');
  const legacySlot = firstLinked ? input.platformProfiles[firstLinked] : undefined;

  return {
    displayName: input.summary.displayName.trim(),
    bio: input.summary.bio.trim(),
    niche: nicheTags.length ? nicheTags.join(' / ') : input.summary.bio.trim(),
    nicheTags,
    platforms,
    platformProfiles: input.platformProfiles,
    profileUrl: legacySlot?.profileUrl,
    platform: firstLinked ? PRESET_TO_SOCIAL_KEY[firstLinked] : undefined,
    platformLabel: firstLinked ? PRESET_PLATFORM_LABELS[firstLinked] : undefined,
    handle: legacySlot?.handle,
    followerCountLabel: legacySlot?.followerCountLabel,
    confidence: legacySlot?.confidence,
  };
}

export function isSummaryEmpty(summary: CreatorProfileSummary): boolean {
  return (
    !summary.displayName.trim() &&
    !summary.bio.trim() &&
    parseNicheTags(summary.nicheTagsText).length === 0
  );
}

export function summariesEqual(a: CreatorProfileSummary, b: CreatorProfileSummary): boolean {
  return (
    a.displayName.trim() === b.displayName.trim() &&
    a.bio.trim() === b.bio.trim() &&
    formatNicheTagsText(parseNicheTags(a.nicheTagsText)) ===
      formatNicheTagsText(parseNicheTags(b.nicheTagsText))
  );
}

export function buildProfileFactsSnapshot(input: {
  summary: CreatorProfileSummary;
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile>;
  locale: string;
}): ProfileFactsSnapshot {
  const connectedPlatforms = listConnectedPresetPlatformKeys(input.platformProfiles);
  const slots: ProfileFactsSnapshot['slots'] = {};

  for (const key of connectedPlatforms) {
    const slot = input.platformProfiles[key];
    slots[key] = {
      handle: slot.handle,
      displayName: slot.displayName,
      bio: slot.bio,
      nicheTags: slot.nicheTags,
      followerCount: slot.followerCount,
      avgViews: slot.avgViews,
      engagementRate: slot.engagementRate,
      confidence: slot.confidence,
    };
  }

  return {
    connectedPlatforms,
    slots,
    existingSummary: {
      displayName: input.summary.displayName.trim(),
      bio: input.summary.bio.trim(),
      nicheTags: parseNicheTags(input.summary.nicheTagsText),
    },
    locale: input.locale,
    intent: 'creator_positioning_for_brands',
  };
}

export function mergeSummarySuggestion(
  current: CreatorProfileSummary,
  suggestion: SummarySuggestion,
  options: SummaryAdoptOptions,
): CreatorProfileSummary {
  const next = { ...current };
  const replaceExisting = options.replaceExisting;

  const adoptField = (field: SummaryAdoptField, value: string | string[]) => {
    if (!options.fields.includes(field)) return;

    if (field === 'displayName') {
      const nextValue = String(value).trim();
      if (!nextValue) return;
      if (current.displayName.trim() && !replaceExisting) return;
      next.displayName = nextValue;
      return;
    }

    if (field === 'bio') {
      const nextValue = String(value).trim();
      if (!nextValue) return;
      if (current.bio.trim() && !replaceExisting) return;
      next.bio = nextValue;
      return;
    }

    if (field !== 'nicheTags') return;

    const tags = Array.isArray(value) ? value.filter(Boolean) : parseNicheTags(String(value));
    const hasExistingTags = parseNicheTags(current.nicheTagsText).length > 0;
    if (hasExistingTags && !replaceExisting) return;
    if (!tags.length) {
      if (replaceExisting) next.nicheTagsText = '';
      return;
    }
    next.nicheTagsText = formatNicheTagsText(tags);
  };

  adoptField('displayName', suggestion.suggestion.displayName);
  adoptField('bio', suggestion.suggestion.bio);
  adoptField('nicheTags', suggestion.suggestion.nicheTags);

  return next;
}
