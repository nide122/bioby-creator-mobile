export const REPLY_TEMPLATE_FIELD_KEYS = [
  'brandName',
  'cooperationTitle',
  'creatorName',
  'budgetDisplay',
  'deliverables',
  'postingSchedule',
  'usageRights',
  'packagesSummary',
  'primaryRisk',
  'recommendedPackage',
  'rateCardFloor',
] as const;

export type ReplyTemplateFieldKey = (typeof REPLY_TEMPLATE_FIELD_KEYS)[number];

export type ReplyTemplateFieldTone = 'sky' | 'amber' | 'violet' | 'mint' | 'rose' | 'slate';

export type ReplyTemplateFieldMeta = {
  i18nKey: string;
  tone: ReplyTemplateFieldTone;
};

export const REPLY_TEMPLATE_FIELD_META: Record<ReplyTemplateFieldKey, ReplyTemplateFieldMeta> = {
  brandName: { i18nKey: 'replyTemplateFields.brandName', tone: 'sky' },
  cooperationTitle: { i18nKey: 'replyTemplateFields.cooperationTitle', tone: 'amber' },
  creatorName: { i18nKey: 'replyTemplateFields.creatorName', tone: 'violet' },
  budgetDisplay: { i18nKey: 'replyTemplateFields.budgetDisplay', tone: 'mint' },
  deliverables: { i18nKey: 'replyTemplateFields.deliverables', tone: 'rose' },
  postingSchedule: { i18nKey: 'replyTemplateFields.postingSchedule', tone: 'slate' },
  usageRights: { i18nKey: 'replyTemplateFields.usageRights', tone: 'slate' },
  packagesSummary: { i18nKey: 'replyTemplateFields.packagesSummary', tone: 'mint' },
  primaryRisk: { i18nKey: 'replyTemplateFields.primaryRisk', tone: 'rose' },
  recommendedPackage: { i18nKey: 'replyTemplateFields.recommendedPackage', tone: 'amber' },
  rateCardFloor: { i18nKey: 'replyTemplateFields.rateCardFloor', tone: 'violet' },
};

const LEGACY_KEY_ALIASES: Record<string, ReplyTemplateFieldKey> = {
  threadSubject: 'cooperationTitle',
  ['budget' + 'Label']: 'budgetDisplay',
};

export function isReplyTemplateFieldKey(value: string): value is ReplyTemplateFieldKey {
  return (REPLY_TEMPLATE_FIELD_KEYS as readonly string[]).includes(value);
}

export function normalizeReplyTemplateFieldKey(value: string): ReplyTemplateFieldKey | null {
  const aliased = LEGACY_KEY_ALIASES[value] ?? value;
  return isReplyTemplateFieldKey(aliased) ? aliased : null;
}

export function replyTemplateFieldLabel(key: ReplyTemplateFieldKey, t: (key: string) => string): string {
  return t(REPLY_TEMPLATE_FIELD_META[key].i18nKey);
}

export function replyTemplateFieldChipColors(
  key: ReplyTemplateFieldKey,
  colorScheme: 'light' | 'dark',
): { backgroundColor: string; color: string } {
  const palettes: Record<ReplyTemplateFieldTone, { light: { bg: string; fg: string }; dark: { bg: string; fg: string } }> = {
    sky: { light: { bg: '#E0F2FE', fg: '#0369A1' }, dark: { bg: '#0C4A6E', fg: '#BAE6FD' } },
    amber: { light: { bg: '#FEF3C7', fg: '#B45309' }, dark: { bg: '#78350F', fg: '#FDE68A' } },
    violet: { light: { bg: '#EDE9FE', fg: '#6D28D9' }, dark: { bg: '#4C1D95', fg: '#DDD6FE' } },
    mint: { light: { bg: '#D1FAE5', fg: '#047857' }, dark: { bg: '#064E3B', fg: '#A7F3D0' } },
    rose: { light: { bg: '#FFE4E6', fg: '#BE123C' }, dark: { bg: '#881337', fg: '#FECDD3' } },
    slate: { light: { bg: '#E2E8F0', fg: '#334155' }, dark: { bg: '#1E293B', fg: '#CBD5E1' } },
  };
  const tone = REPLY_TEMPLATE_FIELD_META[key].tone;
  const palette = palettes[tone][colorScheme];
  return { backgroundColor: palette.bg, color: palette.fg };
}
