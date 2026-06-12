export type PlatformIconKey =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'xiaohongshu'
  | 'bilibili'
  | 'douyin'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'twitch'
  | 'pinterest';

const PLATFORM_ALIASES: Record<string, PlatformIconKey> = {
  youtube: 'youtube',
  yt: 'youtube',
  instagram: 'instagram',
  ig: 'instagram',
  insta: 'instagram',
  tiktok: 'tiktok',
  tt: 'tiktok',
  小红书: 'xiaohongshu',
  xiaohongshu: 'xiaohongshu',
  rednote: 'xiaohongshu',
  xhs: 'xiaohongshu',
  bilibili: 'bilibili',
  b站: 'bilibili',
  douyin: 'douyin',
  抖音: 'douyin',
  twitter: 'twitter',
  x: 'twitter',
  linkedin: 'linkedin',
  facebook: 'facebook',
  fb: 'facebook',
  meta: 'facebook',
  twitch: 'twitch',
  pinterest: 'pinterest',
};

/** Map a free-form platform label to a known icon key, if recognized. */
export function resolvePlatformIconKey(platform: string): PlatformIconKey | null {
  const trimmed = platform.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, '');
  if (PLATFORM_ALIASES[normalized]) {
    return PLATFORM_ALIASES[normalized];
  }

  // Preserve CJK labels that were lowercased incorrectly — check raw trimmed form too.
  if (PLATFORM_ALIASES[trimmed]) {
    return PLATFORM_ALIASES[trimmed];
  }

  return null;
}

/** Extract platform name from a "Platform · Format" service label. */
export function platformFromServiceLabel(service: string): string {
  const separator = ' · ';
  const index = service.indexOf(separator);
  if (index === -1) return service.trim();
  return service.slice(0, index).trim();
}
