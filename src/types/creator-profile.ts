import type { SocialPlatformKey } from '@/src/api/mock-creator-profile';

export type PresetPlatformKey = 'youtube' | 'tiktok' | 'instagram';

export type CreatorPlatformProfile = {
  platform: PresetPlatformKey;
  profileUrl?: string;
  handle?: string;
  displayName?: string;
  bio?: string;
  followerCountLabel?: string;
  /** Raw follower/subscriber count from CRM. */
  followerCount?: number;
  /** Average views per post/video from CRM (`aveView`). */
  avgViews?: number;
  /** Engagement rate from CRM (e.g. 0.05 = 5%). */
  engagementRate?: number;
  avatarUrl?: string;
  crmInfluencerId?: string;
  email?: string;
  minPrice?: unknown;
  maxPrice?: unknown;
  nicheTags?: string[];
  confidence?: 'high' | 'low';
  resolvedAtISO?: string;
  status: 'empty' | 'linked' | 'manual';
};

export type CreatorProfileSummary = {
  displayName: string;
  bio: string;
  nicheTagsText: string;
};

export const PRESET_PLATFORM_KEYS: PresetPlatformKey[] = ['youtube', 'tiktok', 'instagram'];

export const PRESET_PLATFORM_LABELS: Record<PresetPlatformKey, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

export const PRESET_TO_SOCIAL_KEY: Record<PresetPlatformKey, SocialPlatformKey> = {
  youtube: 'youtube',
  tiktok: 'tiktok',
  instagram: 'instagram',
};

export type PlatformCardMode = 'display' | 'input';

export type ProfileFactsSlot = {
  handle?: string;
  displayName?: string;
  bio?: string;
  nicheTags?: string[];
  followerCount?: number;
  avgViews?: number;
  engagementRate?: number;
  confidence?: 'high' | 'low';
};

export type ProfileFactsSnapshot = {
  connectedPlatforms: PresetPlatformKey[];
  slots: Partial<Record<PresetPlatformKey, ProfileFactsSlot>>;
  existingSummary: {
    displayName: string;
    bio: string;
    nicheTags: string[];
  };
  locale: string;
  intent: 'creator_positioning_for_brands';
};

export type SummaryFieldProvenance = {
  source: 'synthesized' | 'crm_prefill';
  fromPlatforms: PresetPlatformKey[];
};

export type SummarySuggestion = {
  suggestion: {
    displayName: string;
    bio: string;
    nicheTags: string[];
  };
  confidence: 'high' | 'low';
  fieldProvenance?: Partial<
    Record<'displayName' | 'bio' | 'nicheTags', SummaryFieldProvenance>
  >;
  reasons: string[];
};

export type SummaryAdoptField = 'displayName' | 'bio' | 'nicheTags';

export type SummaryAdoptOptions = {
  fields: SummaryAdoptField[];
  replaceExisting: boolean;
};
