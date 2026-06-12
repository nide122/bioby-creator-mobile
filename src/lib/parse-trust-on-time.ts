import type { TrustMetricCard } from '@/src/types/domain';

/** Parses on-time publish percentage from trust metrics (e.g. "96%"). */
export function parseOnTimeRatePercent(metrics: TrustMetricCard[] | undefined): number | null {
  if (!metrics?.length) return null;
  const row =
    metrics.find((m) => /on-?time|publish/i.test(m.label)) ??
    metrics.find((m) => m.id === 'tm-punctual');
  if (!row?.value) return null;
  const match = row.value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) ? Math.round(n) : null;
}
