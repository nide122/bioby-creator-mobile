import {
  PRESET_PLATFORM_KEYS,
  PRESET_PLATFORM_LABELS,
  type CreatorPlatformProfile,
  type PresetPlatformKey,
} from '@/src/types/creator-profile';
import { resolvePlatformIconKey } from '@/src/lib/platform-icon-key';
import type { MediaKitPlatformRow } from '@/src/types/domain';

function nicheNoteFromSlot(slot: CreatorPlatformProfile): string {
  if (slot.bio?.trim()) return slot.bio.trim();
  if (slot.nicheTags?.length) return slot.nicheTags.join(' · ');
  return '';
}

function trimTrailingZero(value: number): string {
  const formatted = value.toFixed(1);
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
}

export function formatCompactCount(count: number): string {
  if (count >= 1_000_000) return `${trimTrailingZero(count / 1_000_000)}M`;
  if (count >= 1_000) return `${trimTrailingZero(count / 1_000)}K`;
  return String(count);
}

/** CRM `aveView` → Media Kit monthlyViews label, e.g. "~50K views / mo". */
export function formatAvgViewsLabel(avgViews?: number): string | undefined {
  if (avgViews == null || avgViews <= 0) return undefined;
  return `~${formatCompactCount(avgViews)} views / mo`;
}

/** CRM engagement rate → display label, e.g. "5.2% engagement". */
export function formatEngagementRateLabel(engagementRate?: number): string | undefined {
  if (engagementRate == null || engagementRate <= 0) return undefined;
  const pct = engagementRate <= 1 ? engagementRate * 100 : engagementRate;
  const rounded = pct >= 10 ? Math.round(pct).toString() : trimTrailingZero(pct);
  return `${rounded}% engagement`;
}

/** Resolve a Media Kit platform name to a preset profile slot key, if recognized. */
export function resolvePresetPlatformKeyFromName(name: string): PresetPlatformKey | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const iconKey = resolvePlatformIconKey(trimmed);
  if (iconKey === 'youtube' || iconKey === 'tiktok' || iconKey === 'instagram') {
    return iconKey;
  }

  const normalized = trimmed.toLowerCase();
  return (
    PRESET_PLATFORM_KEYS.find((key) => PRESET_PLATFORM_LABELS[key].toLowerCase() === normalized) ?? null
  );
}

/** Map a linked profile slot to a Media Kit platform matrix row (one-way source). */
export function platformSlotToMediaKitRow(slot: CreatorPlatformProfile): MediaKitPlatformRow | null {
  if (slot.status === 'empty') return null;

  const name = PRESET_PLATFORM_LABELS[slot.platform];
  return {
    name,
    handle: slot.handle,
    followersRange: slot.followerCountLabel?.trim() || '—',
    nicheNote: nicheNoteFromSlot(slot),
    monthlyViews: formatAvgViewsLabel(slot.avgViews),
    profileSource: slot.platform,
    visibleInPreview: true,
  };
}

/**
 * One-way prefill: copy empty matrix fields from a matching linked profile slot.
 * Matrix edits are never written back to profile; filled matrix fields are not overwritten.
 */
export function applyProfilePrefillToMediaKitRow(
  row: MediaKitPlatformRow,
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile> | undefined,
): MediaKitPlatformRow {
  if (!platformProfiles || row.profileSource) return row;

  const presetKey = resolvePresetPlatformKeyFromName(row.name);
  if (!presetKey) return row;

  const fromProfile = platformSlotToMediaKitRow(platformProfiles[presetKey]);
  if (!fromProfile) return row;

  return {
    name: row.name.trim() ? row.name : fromProfile.name,
    handle: row.handle?.trim() ? row.handle : fromProfile.handle,
    followersRange: row.followersRange.trim() ? row.followersRange : fromProfile.followersRange,
    nicheNote: row.nicheNote.trim() ? row.nicheNote : fromProfile.nicheNote,
    monthlyViews: row.monthlyViews?.trim() ? row.monthlyViews : fromProfile.monthlyViews,
    visibleInPreview: row.visibleInPreview ?? true,
  };
}

/** First linked preset platform in profile that is not already present in the matrix (by name). */
export function findProfilePlatformMissingFromMatrix(
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile> | undefined,
  rows: MediaKitPlatformRow[],
): PresetPlatformKey | null {
  if (!platformProfiles) return null;

  const existing = new Set(
    rows
      .flatMap((row) => [row.profileSource, resolvePresetPlatformKeyFromName(row.name)])
      .filter(Boolean) as PresetPlatformKey[],
  );

  return PRESET_PLATFORM_KEYS.find((key) => platformProfiles[key].status !== 'empty' && !existing.has(key)) ?? null;
}

/** Create a new matrix row prefilled from profile for the given preset platform. */
export function createMediaKitRowFromProfileSlot(
  presetKey: PresetPlatformKey,
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile>,
): MediaKitPlatformRow {
  const fromProfile = platformSlotToMediaKitRow(platformProfiles[presetKey]);
  return (
    fromProfile ?? {
      name: PRESET_PLATFORM_LABELS[presetKey],
      followersRange: '',
      nicheNote: '',
      profileSource: presetKey,
      visibleInPreview: true,
    }
  );
}

function mergeProfileRowWithExisting(
  fromProfile: MediaKitPlatformRow,
  existing: MediaKitPlatformRow | undefined,
): MediaKitPlatformRow {
  return {
    ...fromProfile,
    visibleInPreview: existing?.visibleInPreview ?? true,
    profileSource: fromProfile.profileSource,
  };
}

/**
 * Sync profile-linked preset platforms into the matrix: one row per connected slot,
 * facts from profile, visibility + brand fields preserved from saved document.
 */
export function mergeProfileChannelsWithMatrix(
  existingRows: MediaKitPlatformRow[],
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile> | undefined,
): MediaKitPlatformRow[] {
  if (!platformProfiles) return existingRows;

  const existingBySource = new Map<PresetPlatformKey, MediaKitPlatformRow>();
  for (const row of existingRows) {
    const source = row.profileSource ?? resolvePresetPlatformKeyFromName(row.name);
    if (source && platformProfiles[source]?.status !== 'empty') {
      existingBySource.set(source, { ...row, profileSource: source });
    }
  }

  const manualRows = existingRows.filter((row) => {
    if (row.profileSource) return false;
    const key = resolvePresetPlatformKeyFromName(row.name);
    return !(key && platformProfiles[key]?.status !== 'empty');
  });

  const profileRows: MediaKitPlatformRow[] = [];
  for (const key of PRESET_PLATFORM_KEYS) {
    const slot = platformProfiles[key];
    if (slot.status === 'empty') continue;
    const fromProfile = platformSlotToMediaKitRow(slot);
    if (!fromProfile) continue;
    profileRows.push(mergeProfileRowWithExisting(fromProfile, existingBySource.get(key)));
  }

  if (profileRows.length === 0 && manualRows.length === 0) {
    return [{ name: '', followersRange: '', nicheNote: '', visibleInPreview: true }];
  }

  return [...profileRows, ...manualRows];
}

/** Rows shown on brand-facing Media Kit preview. */
export function filterVisibleMediaKitPlatforms(rows: MediaKitPlatformRow[] | undefined): MediaKitPlatformRow[] {
  return (rows ?? []).filter((row) => row.name.trim() && row.visibleInPreview !== false);
}

/** Merge profile-linked channels into saved matrix rows, then keep only brand-visible rows. */
export function resolveMediaKitPreviewPlatforms(
  documentPlatforms: MediaKitPlatformRow[] | undefined,
  platformProfiles: Record<PresetPlatformKey, CreatorPlatformProfile> | undefined,
): MediaKitPlatformRow[] {
  return filterVisibleMediaKitPlatforms(
    mergeProfileChannelsWithMatrix(documentPlatforms ?? [], platformProfiles),
  );
}

export function countVisibleMediaKitPlatforms(rows: MediaKitPlatformRow[]): number {
  return filterVisibleMediaKitPlatforms(rows).length;
}

export function isProfileSourcedPlatformRow(row: MediaKitPlatformRow): boolean {
  return Boolean(row.profileSource);
}
