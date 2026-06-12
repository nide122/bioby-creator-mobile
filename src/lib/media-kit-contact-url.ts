import { getPublicWebBaseUrl } from '@/src/lib/public-web-base-url';
import type { MediaKitPreview } from '@/src/types/domain';

export function slugifyDisplayName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildMediaKitContactUrl(slug: string): string {
  return `${getPublicWebBaseUrl()}/c/${slug}`;
}

export function parseContactSlug(contactUrl: string | undefined): string | null {
  if (!contactUrl) return null;
  const match = contactUrl.match(/\/c\/([^/?#]+)$/);
  const slug = match?.[1]?.trim();
  return slug || null;
}

/** Rebuild contactUrl with the current deployment origin (ignores stale server domains). */
export function resolveMediaKitContactUrl(
  contactUrl: string | undefined,
  displayName?: string | null
): string | undefined {
  const slug = parseContactSlug(contactUrl) ?? (displayName?.trim() ? slugifyDisplayName(displayName) : null);
  if (!slug) return contactUrl;
  return buildMediaKitContactUrl(slug);
}

export function withResolvedContactUrl(
  preview: MediaKitPreview,
  displayName?: string | null
): MediaKitPreview {
  const contactUrl = resolveMediaKitContactUrl(preview.contactUrl, displayName);
  if (!contactUrl || contactUrl === preview.contactUrl) return preview;
  return { ...preview, contactUrl };
}

export function isContactUrlCopyable(contactUrl: string | undefined): boolean {
  const slug = parseContactSlug(contactUrl);
  if (!slug) return false;
  const genericSlugs = new Set(['creator', '创作者']);
  return !genericSlugs.has(slug.toLowerCase());
}
