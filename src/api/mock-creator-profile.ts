import { mockDelay } from '@/src/lib/mock-delay';

export type SocialPlatformKey =
  | 'douyin'
  | 'xiaohongshu'
  | 'bilibili'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'other';

export type CreatorProfileResolved = {
  platform: SocialPlatformKey;
  platformLabel: string;
  rawInputUrl: string;
  canonicalUrl: string;
  handle: string;
  displayName: string;
  bio: string;
  followerCountLabel: string;
  nicheTags: string[];
  confidence: 'high' | 'low';
  fetchedAtISO: string;
};

type PlatformMeta = {
  platform: SocialPlatformKey;
  platformLabel: string;
  hosts: string[];
  defaultHandle: string;
  displayName: string;
  bio: string;
  followerCountLabel: string;
  nicheTags: string[];
};

const PLATFORM_FIXTURES: PlatformMeta[] = [
  {
    platform: 'xiaohongshu',
    platformLabel: 'RedNote',
    hosts: ['xiaohongshu.com', 'xhslink.com'],
    defaultHandle: 'skin.notes',
    displayName: 'Mia Skin Notes',
    bio: 'Skincare creator focused on sensitive-skin trials and clear ingredient stories.',
    followerCountLabel: '128K followers',
    nicheTags: ['Skincare reviews', 'Sensitive skin', 'Ingredients'],
  },
  {
    platform: 'douyin',
    platformLabel: 'Douyin',
    hosts: ['douyin.com', 'iesdouyin.com'],
    defaultHandle: 'beauty-lab',
    displayName: 'Bea Beauty Lab',
    bio: 'Short-form beauty creator who breaks down new product claims quickly.',
    followerCountLabel: '364K followers',
    nicheTags: ['Beauty', 'Short video', 'Product launches'],
  },
  {
    platform: 'bilibili',
    platformLabel: 'Bilibili',
    hosts: ['bilibili.com', 'b23.tv'],
    defaultHandle: 'tech-creator',
    displayName: 'Archi Desk Setup',
    bio: 'Tech, productivity tools, and desk setup reviews for long-form audiences.',
    followerCountLabel: '86K followers',
    nicheTags: ['Tech reviews', 'Desk setup', 'Productivity'],
  },
  {
    platform: 'instagram',
    platformLabel: 'Instagram',
    hosts: ['instagram.com'],
    defaultHandle: 'daily.fit.creator',
    displayName: 'Mia Daily Fit',
    bio: 'Lifestyle creator focused on fitness routines and everyday wellness.',
    followerCountLabel: '94K followers',
    nicheTags: ['Fitness', 'Lifestyle', 'Wellness'],
  },
  {
    platform: 'tiktok',
    platformLabel: 'TikTok',
    hosts: ['tiktok.com'],
    defaultHandle: 'home.finds',
    displayName: 'Home Finds',
    bio: 'Short-form home gadgets and affordable room upgrades.',
    followerCountLabel: '210K followers',
    nicheTags: ['Home', 'Gadgets', 'Short video'],
  },
  {
    platform: 'youtube',
    platformLabel: 'YouTube',
    hosts: ['youtube.com', 'youtu.be'],
    defaultHandle: 'calmstudio',
    displayName: 'Calm Studio',
    bio: 'Long-form creator for travel, slow living and camera gear.',
    followerCountLabel: '58K subscribers',
    nicheTags: ['Travel', 'Slow living', 'Camera gear'],
  },
];

function toUrl(input: string): URL {
  const trimmed = input.trim();
  return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
}

function getHandle(url: URL, fallback: string) {
  const parts = url.pathname.split('/').filter(Boolean);
  const raw = parts.find((part) => !['user', 'profile', 'channel', 'c'].includes(part.toLowerCase()));
  return (raw ?? fallback).replace(/^@/, '');
}

export async function resolveCreatorProfileFromUrl(inputUrl: string): Promise<CreatorProfileResolved> {
  await mockDelay(420);

  let url: URL;
  try {
    url = toUrl(inputUrl);
  } catch {
    throw new Error('This link does not look valid. Paste a full creator profile URL.');
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const matched = PLATFORM_FIXTURES.find((item) =>
    item.hosts.some((fixtureHost) => host === fixtureHost || host.endsWith(`.${fixtureHost}`)),
  );

  if (!matched) {
    throw new Error('We do not recognize this platform yet. Try another profile URL or enter details manually.');
  }

  const handle = getHandle(url, matched.defaultHandle);

  return {
    platform: matched.platform,
    platformLabel: matched.platformLabel,
    rawInputUrl: inputUrl.trim(),
    canonicalUrl: `${url.protocol}//${url.host}${url.pathname}`,
    handle,
    displayName: matched.displayName,
    bio: matched.bio,
    followerCountLabel: matched.followerCountLabel,
    nicheTags: matched.nicheTags,
    confidence: handle === matched.defaultHandle ? 'low' : 'high',
    fetchedAtISO: new Date().toISOString(),
  };
}

