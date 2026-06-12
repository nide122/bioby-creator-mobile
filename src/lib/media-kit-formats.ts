import type { ContentFormatKey, PlatformRateEntry } from '@/src/types/domain';

export const CONTENT_FORMAT_KEYS: ContentFormatKey[] = [
  'image_post',
  'carousel',
  'short_video',
  'long_video',
  'story',
  'live',
  'mention',
];

export const PLATFORM_RATE_SUGGESTIONS = ['YouTube', 'Instagram', 'TikTok', '小红书', 'Bilibili'] as const;

export function formatI18nKey(formatKey: ContentFormatKey): string {
  return `mediaKitFormats.${formatKey}`;
}

export function createPlatformRateId(): string {
  return `rate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultPlatformRates(): PlatformRateEntry[] {
  return [
    { id: 'yt-long', platform: 'YouTube', formatKey: 'long_video', priceLabel: '$800+' },
    { id: 'yt-mention', platform: 'YouTube', formatKey: 'mention', priceLabel: '$550+' },
    { id: 'ig-image', platform: 'Instagram', formatKey: 'image_post', priceLabel: '$250+' },
    { id: 'ig-reel', platform: 'Instagram', formatKey: 'short_video', priceLabel: '$400+' },
    { id: 'tt-short', platform: 'TikTok', formatKey: 'short_video', priceLabel: '$1,800+' },
    { id: 'tt-live', platform: 'TikTok', formatKey: 'live', priceLabel: '$2,500+' },
  ];
}

export function ensurePlatformRates(rows: PlatformRateEntry[] | undefined): PlatformRateEntry[] {
  if (rows?.length) return rows;
  return defaultPlatformRates();
}
