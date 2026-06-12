import type { TFunction } from 'i18next';

import type { MediaKitDocument, MediaKitPreview, PublicProofItem, TrustMetricCard } from '@/src/types/domain';

export function trustMetricToPublicProofItem(metric: TrustMetricCard): PublicProofItem {
  return {
    id: `proof-${metric.id}`,
    trustMetricId: metric.id,
    label: metric.label,
    value: metric.value,
    trendNote: metric.trendNote,
    disclaimer: metric.disclaimer,
  };
}

/** Keep one row per trust metric when API/mock catalogs contain duplicate keys. */
export function dedupePublicProofCatalog(catalog: PublicProofItem[]): PublicProofItem[] {
  const seen = new Set<string>();
  const rows: PublicProofItem[] = [];
  for (const item of catalog) {
    const key = item.trustMetricId || item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(item);
  }
  return rows;
}

export function localizePublicProofItem(item: PublicProofItem, t: TFunction): PublicProofItem {
  const base = `trustMetrics.${item.trustMetricId}`;
  return {
    ...item,
    label: t(`${base}.label`, { defaultValue: item.label }),
    value: t(`${base}.value`, { defaultValue: item.value }),
    trendNote: item.trendNote
      ? t(`${base}.trendNote`, { defaultValue: item.trendNote })
      : undefined,
    disclaimer: item.disclaimer
      ? t(`${base}.disclaimer`, { defaultValue: item.disclaimer })
      : undefined,
  };
}

export function publicProofToggleHint(item: PublicProofItem): string {
  const parts = [item.value, item.trendNote ?? item.disclaimer].filter(Boolean);
  return parts.join(' · ');
}

function isPublicProofEnabled(item: PublicProofItem, enabled: Set<string>): boolean {
  return enabled.has(item.id) || enabled.has(item.trustMetricId);
}

export function mergeMediaKitPreviewPublicProofs(
  preview: MediaKitPreview,
  document: MediaKitDocument | undefined,
  catalog: PublicProofItem[] | undefined
): MediaKitPreview {
  return {
    ...preview,
    publicProofs: resolveMediaKitPublicProofs(catalog, document?.enabledPublicProofIds),
  };
}

export function resolveMediaKitPublicProofs(
  catalog: PublicProofItem[] | undefined,
  enabledIds: string[] | undefined
): PublicProofItem[] {
  if (!catalog?.length || !enabledIds?.length) return [];
  const enabled = new Set(enabledIds);
  const seen = new Set<string>();
  return dedupePublicProofCatalog(catalog).filter((item) => {
    if (!isPublicProofEnabled(item, enabled)) return false;
    const key = item.trustMetricId || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
