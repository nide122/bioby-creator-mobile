import { mediaKitRatesSyncedFromPackages, slugifyDisplayName } from '@/src/lib/media-kit-preview';
import type { MediaKitDocument } from '@/src/types/domain';
import type { TFunction } from 'i18next';

export type MediaKitMissingField =
  | 'contactEmail'
  | 'inviteCta'
  | 'platforms'
  | 'displayName'
  | 'cases';

export type MediaKitCompletion = {
  status: 'needs_work' | 'ready';
  missingField?: MediaKitMissingField;
  caseCount: number;
  linkCopyable: boolean;
  /** True when package pricing is actually shown (sync on and no platform rates). */
  pricingSyncedVisible: boolean;
};

const GENERIC_SLUGS = new Set(['creator', '创作者']);

function isLinkCopyable(displayName?: string | null): boolean {
  const slug = displayName?.trim() ? slugifyDisplayName(displayName.trim()) : '';
  return Boolean(slug && !GENERIC_SLUGS.has(slug.toLowerCase()));
}

export function assessMediaKitCompletion(
  document: MediaKitDocument | undefined,
  displayName?: string | null
): MediaKitCompletion {
  const caseCount = document?.cases?.length ?? 0;
  const pricingSyncedVisible = mediaKitRatesSyncedFromPackages(document);
  const linkCopyable = isLinkCopyable(displayName);

  if (!document) {
    return {
      status: 'needs_work',
      missingField: 'contactEmail',
      caseCount: 0,
      linkCopyable: false,
      pricingSyncedVisible: false,
    };
  }

  const hasEmail = Boolean(document.contactEmail?.trim().includes('@'));
  const hasInviteCta = (document.inviteCta?.trim().length ?? 0) >= 8;
  const hasPlatforms = (document.platforms ?? []).some((row) => row.name.trim());

  if (!hasEmail) {
    return { status: 'needs_work', missingField: 'contactEmail', caseCount, linkCopyable, pricingSyncedVisible };
  }
  if (!hasInviteCta) {
    return { status: 'needs_work', missingField: 'inviteCta', caseCount, linkCopyable, pricingSyncedVisible };
  }
  if (!hasPlatforms) {
    return { status: 'needs_work', missingField: 'platforms', caseCount, linkCopyable, pricingSyncedVisible };
  }
  if (!linkCopyable) {
    return { status: 'needs_work', missingField: 'displayName', caseCount, linkCopyable, pricingSyncedVisible };
  }
  if (caseCount === 0) {
    return { status: 'needs_work', missingField: 'cases', caseCount, linkCopyable, pricingSyncedVisible };
  }

  return { status: 'ready', caseCount, linkCopyable, pricingSyncedVisible };
}

function appendPricingSynced(base: string, completion: MediaKitCompletion, t: TFunction): string {
  if (!completion.pricingSyncedVisible) return base;
  const suffix = t('assetsScreen.summaries.mediaKitPricingSynced');
  return base.includes(suffix) ? base : `${base} · ${suffix}`;
}

export function formatMediaKitHubDetail(completion: MediaKitCompletion, t: TFunction): string {
  if (completion.status === 'needs_work' && completion.missingField) {
    const key = {
      contactEmail: 'assetsScreen.summaries.mediaKitMissingEmail',
      inviteCta: 'assetsScreen.summaries.mediaKitMissingInvite',
      platforms: 'assetsScreen.summaries.mediaKitMissingPlatforms',
      displayName: 'assetsScreen.summaries.mediaKitMissingDisplayName',
      cases: 'assetsScreen.summaries.mediaKitNoCases',
    }[completion.missingField];
    return appendPricingSynced(t(key), completion, t);
  }

  const base =
    completion.caseCount > 0
      ? t('assetsScreen.summaries.mediaKitReadyDetail', { count: completion.caseCount })
      : t('assetsScreen.summaries.mediaKitLinkReady');

  return appendPricingSynced(base, completion, t);
}

export function mediaKitHubNeedsAttention(completion: MediaKitCompletion): boolean {
  return completion.status === 'needs_work';
}
