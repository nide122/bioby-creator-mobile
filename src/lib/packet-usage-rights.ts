import type { TFunction } from 'i18next';

import type { DealTermRow } from '@/src/types/deal-workflow';

const USAGE_RIGHTS_API_LABEL = 'Usage rights';

export function isUsageRightsTermLabel(label: string, t: TFunction): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized === USAGE_RIGHTS_API_LABEL.toLowerCase() ||
    normalized === t('dealPacketScreen.termUsageRights').trim().toLowerCase()
  );
}

export function usageRightsValuesFromDeliverables(rows: DealTermRow[], t: TFunction): string[] {
  return rows.filter((row) => isUsageRightsTermLabel(row.label, t)).map((row) => row.value.trim()).filter(Boolean);
}

export function isUsageRightsConfirmed(confirmedAt?: string): boolean {
  return Boolean(confirmedAt?.trim());
}
