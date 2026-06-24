import type { TFunction } from 'i18next';

export const PRICE_AMOUNTS = [
  '500',
  '1000',
  '1500',
  '2000',
  '2800',
  '4800',
  '6000',
  '8000',
  '10000',
  '15000',
] as const;

export type PriceAmountId = (typeof PRICE_AMOUNTS)[number];
export const PRICE_CUSTOM = 'custom' as const;

/** 达人常用交付物 */
export const DELIVERABLE_TYPE_IDS = [
  'short_video',
  'long_video',
  'static_post',
  'carousel',
  'story',
  'live',
  'mention',
] as const;
export type DeliverableTypeId = (typeof DELIVERABLE_TYPE_IDS)[number];
export const DELIVERABLE_CUSTOM = 'custom' as const;

export const REVISION_TYPE_IDS = ['script', 'rough_cut', 'final_cut'] as const;
export type RevisionTypeId = (typeof REVISION_TYPE_IDS)[number];

export const QUANTITY_OPTIONS = ['1', '2', '3', '4', '5'] as const;
export type QuantityId = (typeof QUANTITY_OPTIONS)[number];

/** 使用权边界：单选预设 + 可选手填补充 */
export const USAGE_PRESET_IDS = [
  'natural_feed_90',
  'natural_feed_180',
  'paid_boost_30',
  'no_paid_media',
  'whitelist_extra',
  'custom',
] as const;
export type UsagePresetId = (typeof USAGE_PRESET_IDS)[number];
export const USAGE_CUSTOM = 'custom' as const;

export const PREPAY_PRESET_IDS = ['none', '30', '50', '100', 'custom'] as const;
export type PrepayPresetId = (typeof PREPAY_PRESET_IDS)[number];

export type DeliverableRow = {
  type: DeliverableTypeId | typeof DELIVERABLE_CUSTOM | '';
  customType: string;
  quantity: QuantityId;
};

export type RevisionRow = {
  type: RevisionTypeId | '';
  quantity: QuantityId;
};

export type PriceBoundState = {
  preset: PriceAmountId | typeof PRICE_CUSTOM | '';
  customAmount: string;
};

export type PriceRangeState = {
  min: PriceBoundState;
  max: PriceBoundState;
};

export type UsageRightsState = {
  preset: UsagePresetId | '';
  custom: string;
};

export type PrepayState = {
  preset: PrepayPresetId;
  customPercent: string;
};

export function deliverableTypeLabel(type: DeliverableTypeId, t: TFunction): string {
  const key: Record<DeliverableTypeId, string> = {
    short_video: 'pricingEditScreen.deliverableShortVideo',
    long_video: 'pricingEditScreen.deliverableLongVideo',
    static_post: 'pricingEditScreen.deliverableStaticPost',
    carousel: 'pricingEditScreen.deliverableCarousel',
    story: 'pricingEditScreen.deliverableStory',
    live: 'pricingEditScreen.deliverableLive',
    mention: 'pricingEditScreen.deliverableMention',
  };
  return t(key[type]);
}

export function revisionTypeLabel(type: RevisionTypeId, t: TFunction): string {
  const key: Record<RevisionTypeId, string> = {
    script: 'pricingEditScreen.revisionScript',
    rough_cut: 'pricingEditScreen.revisionRoughCut',
    final_cut: 'pricingEditScreen.revisionFinalCut',
  };
  return t(key[type]);
}

export function deliverableRowLabel(row: DeliverableRow, t: TFunction): string {
  if (row.type === DELIVERABLE_CUSTOM) return row.customType.trim();
  if (row.type) return deliverableTypeLabel(row.type, t);
  return '';
}

export function revisionRowLabel(row: RevisionRow, t: TFunction): string {
  return row.type ? revisionTypeLabel(row.type, t) : '';
}

export function usagePresetLabel(id: UsagePresetId, t: TFunction): string {
  if (id === USAGE_CUSTOM) return t('pricingEditScreen.usageCustomOption');
  const key: Record<Exclude<UsagePresetId, typeof USAGE_CUSTOM>, string> = {
    natural_feed_90: 'pricingEditScreen.usageNaturalFeed90',
    natural_feed_180: 'pricingEditScreen.usageNaturalFeed180',
    paid_boost_30: 'pricingEditScreen.usagePaidBoost30',
    no_paid_media: 'pricingEditScreen.usageNoPaidMedia',
    whitelist_extra: 'pricingEditScreen.usageWhitelistExtra',
  };
  return t(key[id]);
}

export function formatPriceAmount(amount: number | string): string {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 1000 && value % 1000 === 0) {
    return `$${value / 1000}k`;
  }
  if (value >= 1000) {
    const compact = (value / 1000).toFixed(1).replace(/\.0$/, '');
    return `$${compact}k`;
  }
  return `$${value.toLocaleString('en-US')}`;
}

export function resolvePriceBound(bound: PriceBoundState): number | null {
  if (!bound.preset) return null;
  if (bound.preset === PRICE_CUSTOM) {
    const digits = bound.customAmount.replace(/[^\d]/g, '');
    const value = Number(digits);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  return Number(bound.preset);
}

export function formatPriceRangeFromState(range: PriceRangeState): string {
  const min = resolvePriceBound(range.min);
  const max = resolvePriceBound(range.max);
  if (min == null || max == null) return '';
  return `${formatPriceAmount(min)}–${formatPriceAmount(max)}`;
}

export function isPriceRangeValid(range: PriceRangeState): boolean {
  const min = resolvePriceBound(range.min);
  const max = resolvePriceBound(range.max);
  if (min == null || max == null) return false;
  return min <= max;
}

function closestPriceAmount(value: number): PriceAmountId {
  let closest: PriceAmountId = PRICE_AMOUNTS[0];
  let smallestDelta = Math.abs(Number(closest) - value);
  for (const amount of PRICE_AMOUNTS) {
    const delta = Math.abs(Number(amount) - value);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = amount;
    }
  }
  return closest;
}

function parseAmountToken(raw: string): PriceBoundState {
  const token = raw.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!token) return { preset: '', customAmount: '' };
  const kMatch = token.match(/^([\d.]+)\s*k$/i);
  if (kMatch) {
    const value = Math.round(parseFloat(kMatch[1]) * 1000);
    const preset = PRICE_AMOUNTS.find((amount) => Number(amount) === value);
    if (preset) return { preset, customAmount: '' };
    return { preset: PRICE_CUSTOM, customAmount: String(value) };
  }
  const plain = token.match(/^(\d+)$/);
  if (plain) {
    const value = Number(plain[1]);
    const preset = PRICE_AMOUNTS.find((amount) => Number(amount) === value);
    if (preset) return { preset, customAmount: '' };
    return { preset: PRICE_CUSTOM, customAmount: plain[1] };
  }
  return { preset: '', customAmount: '' };
}

export function parsePriceLabel(label: string): PriceRangeState {
  const trimmed = label.trim();
  if (!trimmed) {
    return {
      min: { preset: '', customAmount: '' },
      max: { preset: '', customAmount: '' },
    };
  }
  const parts = trimmed.split(/\s*[–—-]\s*/);
  if (parts.length >= 2) {
    return { min: parseAmountToken(parts[0]), max: parseAmountToken(parts[1]) };
  }
  const single = parseAmountToken(trimmed);
  return { min: single, max: single };
}

export function formatDeliverableLine(row: DeliverableRow, t: TFunction): string {
  const typeLabel =
    row.type === DELIVERABLE_CUSTOM
      ? row.customType.trim()
      : row.type
        ? deliverableTypeLabel(row.type, t)
        : '';
  if (!typeLabel) return '';
  return t('pricingEditScreen.deliverableLine', {
    count: row.quantity,
    type: typeLabel,
  });
}

export function formatRevisionLine(row: RevisionRow, t: TFunction): string {
  if (!row.type) return '';
  return t('pricingEditScreen.revisionLine', {
    count: row.quantity,
    type: revisionTypeLabel(row.type, t),
  });
}

export function serializeDeliverables(rows: DeliverableRow[], t: TFunction): string[] {
  return rows.map((row) => formatDeliverableLine(row, t)).filter(Boolean);
}

export function serializeRevisionRounds(rows: RevisionRow[], t: TFunction): string {
  return rows.map((row) => formatRevisionLine(row, t)).filter(Boolean).join(' · ');
}

function matchDeliverableType(label: string, t: TFunction): DeliverableTypeId | '' {
  const normalized = label.trim().toLowerCase();
  for (const type of DELIVERABLE_TYPE_IDS) {
    if (normalized === deliverableTypeLabel(type, t).trim().toLowerCase()) {
      return type;
    }
  }
  return '';
}

function matchRevisionType(label: string, t: TFunction): RevisionTypeId | '' {
  const normalized = label.trim().toLowerCase();
  for (const type of REVISION_TYPE_IDS) {
    if (normalized === revisionTypeLabel(type, t).trim().toLowerCase()) {
      return type;
    }
  }
  return '';
}

function parseQuantity(value: string): QuantityId {
  const match = value.match(/(\d+)/);
  if (!match) return '1';
  const qty = match[1];
  return QUANTITY_OPTIONS.includes(qty as QuantityId) ? (qty as QuantityId) : '1';
}

export function parseDeliverableLine(line: string, t: TFunction): DeliverableRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s*[×x]\s*(.+)$/u);
  if (match) {
    const type = matchDeliverableType(match[2], t);
    if (type) {
      return { type, customType: '', quantity: parseQuantity(match[1]) };
    }
    return {
      type: DELIVERABLE_CUSTOM,
      customType: match[2].trim(),
      quantity: parseQuantity(match[1]),
    };
  }
  for (const type of DELIVERABLE_TYPE_IDS) {
    if (trimmed.toLowerCase().includes(deliverableTypeLabel(type, t).toLowerCase())) {
      return { type, customType: '', quantity: parseQuantity(trimmed) };
    }
  }
  return null;
}

export function parseDeliverables(values: string[], t: TFunction): DeliverableRow[] {
  return values
    .map((line) => parseDeliverableLine(line, t))
    .filter((row): row is DeliverableRow => row != null && (row.type !== '' || row.customType.trim().length > 0));
}

export function parseRevisionLine(line: string, t: TFunction): RevisionRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s*[×x]\s*(.+)$/u);
  if (match) {
    const type = matchRevisionType(match[2], t);
    if (type) {
      return { type, quantity: parseQuantity(match[1]) };
    }
  }
  for (const type of REVISION_TYPE_IDS) {
    if (trimmed.toLowerCase().includes(revisionTypeLabel(type, t).toLowerCase())) {
      return { type, quantity: parseQuantity(trimmed) };
    }
  }
  return null;
}

export function parseRevisionRounds(value: string, t: TFunction): RevisionRow[] {
  return value
    .split(/\s*[·;|]\s*|\n/u)
    .map((line) => parseRevisionLine(line, t))
    .filter((row): row is RevisionRow => row != null && row.type !== '');
}

export function serializeUsageRights(state: UsageRightsState, t: TFunction): string {
  if (state.preset === USAGE_CUSTOM) return state.custom.trim();
  const presetLabel = state.preset ? usagePresetLabel(state.preset, t) : '';
  const custom = state.custom.trim();
  return [presetLabel, custom].filter(Boolean).join(' · ');
}

function matchUsagePreset(segment: string, t: TFunction): UsagePresetId | '' {
  const normalized = segment.trim().toLowerCase();
  const matched = USAGE_PRESET_IDS.find(
    (id) => usagePresetLabel(id, t).trim().toLowerCase() === normalized
  );
  if (matched) return matched;
  // Backward compat with old "organic" labels
  if (/90.*有机|90.*自然|90-day organic/i.test(segment)) return 'natural_feed_90';
  if (/180.*有机|180.*自然|180-day organic/i.test(segment)) return 'natural_feed_180';
  if (/30.*付费|30-day paid/i.test(segment)) return 'paid_boost_30';
  if (/不含付费|no paid/i.test(segment)) return 'no_paid_media';
  if (/白名单|whitelist/i.test(segment)) return 'whitelist_extra';
  return '';
}

export function parseUsageRights(value: string, t: TFunction): UsageRightsState {
  const trimmed = value.trim();
  if (!trimmed) return { preset: '', custom: '' };
  if (trimmed === t('pricingEditScreen.usageCustomOption')) {
    return { preset: USAGE_CUSTOM, custom: '' };
  }

  const segments = trimmed.split(/\s*·\s*/);
  let preset: UsagePresetId | '' = '';
  const customParts: string[] = [];

  for (const segment of segments) {
    const normalized = segment.trim();
    if (!normalized) continue;
    const matched = matchUsagePreset(normalized, t);
    if (matched && !preset) {
      preset = matched;
    } else if (!matched) {
      customParts.push(normalized);
    }
  }

  if (!preset && customParts.length > 0) {
    return { preset: USAGE_CUSTOM, custom: customParts.join(' · ') };
  }

  return { preset, custom: customParts.join(' · ') };
}

export function defaultPrepayState(): PrepayState {
  return { preset: '50', customPercent: '' };
}

export function formatPrepayLabel(state: PrepayState, t: TFunction): string {
  if (state.preset === 'none') return t('pricingEditScreen.prepayNone');
  if (state.preset === 'custom') {
    const percent = state.customPercent.trim().replace(/[^\d]/g, '');
    if (!percent) return t('pricingEditScreen.prepayPresetCustom');
    return t('pricingEditScreen.prepayPercent', { percent });
  }
  return t('pricingEditScreen.prepayPercent', { percent: state.preset });
}

export function parsePrepayLabel(value: string, t: TFunction): PrepayState {
  const trimmed = value.trim();
  if (!trimmed) return defaultPrepayState();
  if (trimmed === t('pricingEditScreen.prepayNone') || /no prepay|无需预付|无预付/i.test(trimmed)) {
    return { preset: 'none', customPercent: '' };
  }
  if (trimmed === t('pricingEditScreen.prepayPresetCustom')) {
    return { preset: 'custom', customPercent: '' };
  }
  const percentMatch = trimmed.match(/(\d+)\s*%/);
  if (percentMatch) {
    const percent = percentMatch[1];
    if (percent === '30' || percent === '50' || percent === '100') {
      return { preset: percent as PrepayPresetId, customPercent: '' };
    }
    return { preset: 'custom', customPercent: percent };
  }
  return { preset: 'custom', customPercent: '' };
}

export function createEmptyDeliverableRow(): DeliverableRow {
  return { type: '', customType: '', quantity: '1' };
}

export function createEmptyRevisionRow(): RevisionRow {
  return { type: '', quantity: '1' };
}

export function createEmptyPriceBound(): PriceBoundState {
  return { preset: '', customAmount: '' };
}
