import type { MediaKitDocument, MediaKitPreview, MediaKitSectionId } from '@/src/types/domain';

export type { MediaKitSectionId };

export const DEFAULT_MEDIA_KIT_SECTION_ORDER: MediaKitSectionId[] = [
  'about',
  'stats',
  'trust_proof',
  'audience',
  'channels',
  'rates',
  'services',
  'partnerships',
  'cases',
  'contact',
];

const ALL_SECTION_IDS = new Set<MediaKitSectionId>(DEFAULT_MEDIA_KIT_SECTION_ORDER);

export function resolveSectionOrder(order?: MediaKitSectionId[]): MediaKitSectionId[] {
  if (!order?.length) return [...DEFAULT_MEDIA_KIT_SECTION_ORDER];
  const seen = new Set<MediaKitSectionId>();
  const resolved: MediaKitSectionId[] = [];
  for (const id of order) {
    if (ALL_SECTION_IDS.has(id) && !seen.has(id)) {
      resolved.push(id);
      seen.add(id);
    }
  }
  for (const id of DEFAULT_MEDIA_KIT_SECTION_ORDER) {
    if (!seen.has(id)) resolved.push(id);
  }
  return resolved;
}

export function resolveSectionOrderFromDocument(document?: MediaKitDocument | null): MediaKitSectionId[] {
  return resolveSectionOrder(document?.sectionOrder);
}

export function isMediaKitSectionVisible(id: MediaKitSectionId, data: MediaKitPreview): boolean {
  switch (id) {
    case 'about':
      return true;
    case 'stats':
      return Boolean(data.heroStats?.length);
    case 'trust_proof':
      return Boolean(data.publicProofs?.length);
    case 'audience':
      return Boolean(
        data.audience?.topLocations || data.audience?.genderAge || data.audience?.postingCadence
      );
    case 'channels':
      return true;
    case 'rates':
      return Boolean(data.rateSummaries?.length);
    case 'services':
      return Boolean(data.servicesTable?.length);
    case 'partnerships':
      return Boolean(data.partnerships?.length);
    case 'cases':
      return true;
    case 'contact':
      return true;
    default:
      return false;
  }
}

export function moveSectionOrder(
  order: MediaKitSectionId[],
  index: number,
  direction: -1 | 1
): MediaKitSectionId[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= order.length) return order;
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}
