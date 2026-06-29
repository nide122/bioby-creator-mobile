import type { ReplyTemplate } from '@/src/types/reply-template';

const NEGOTIATION_TEMPLATE_NAMES = new Set([
  'Reduce scope',
  'Ask for higher rate',
  'Request extension',
  'Written usage rights',
]);

const NEGOTIATION_TEMPLATE_IDS = new Set([
  'tpl-shrink-scope',
  'tpl-ask-more-money',
  'tpl-ask-extension',
  'tpl-request-usage-rights',
]);

export type ReplyTemplatePickerSection = 'negotiation' | 'general';

export type ReplyTemplateVisual = {
  icon: keyof typeof import('@expo/vector-icons/Ionicons').default.glyphMap;
  accent: string;
  iconColor: string;
};

const VISUALS_BY_NAME: Record<string, ReplyTemplateVisual> = {
  'Quote follow-up': { icon: 'mail-outline', accent: '#D1FAE5', iconColor: '#047857' },
  'Clarify scope': { icon: 'help-circle-outline', accent: '#E0F2FE', iconColor: '#0369A1' },
  'Reduce scope': { icon: 'contract-outline', accent: '#FEF3C7', iconColor: '#B45309' },
  'Ask for higher rate': { icon: 'trending-up-outline', accent: '#EDE9FE', iconColor: '#6D28D9' },
  'Request extension': { icon: 'time-outline', accent: '#FFE4E6', iconColor: '#BE123C' },
  'Written usage rights': { icon: 'document-text-outline', accent: '#E2E8F0', iconColor: '#334155' },
};

const VISUALS_BY_ID: Record<string, ReplyTemplateVisual> = {
  'tpl-quote-follow': VISUALS_BY_NAME['Quote follow-up'],
  'tpl-scope-clarify': VISUALS_BY_NAME['Clarify scope'],
  'tpl-shrink-scope': VISUALS_BY_NAME['Reduce scope'],
  'tpl-ask-more-money': VISUALS_BY_NAME['Ask for higher rate'],
  'tpl-ask-extension': VISUALS_BY_NAME['Request extension'],
  'tpl-request-usage-rights': VISUALS_BY_NAME['Written usage rights'],
};

const DEFAULT_VISUAL: ReplyTemplateVisual = {
  icon: 'document-text-outline',
  accent: '#E2E8F0',
  iconColor: '#475569',
};

export function resolveReplyTemplateVisual(template: Pick<ReplyTemplate, 'id' | 'name'>): ReplyTemplateVisual {
  return VISUALS_BY_NAME[template.name] ?? VISUALS_BY_ID[template.id] ?? DEFAULT_VISUAL;
}

export function replyTemplatePickerSection(template: Pick<ReplyTemplate, 'id' | 'name'>): ReplyTemplatePickerSection {
  if (NEGOTIATION_TEMPLATE_NAMES.has(template.name) || NEGOTIATION_TEMPLATE_IDS.has(template.id)) {
    return 'negotiation';
  }
  return 'general';
}

/** Plain-text snippet for list preview (tokens shown as ellipsis). */
export function plainReplyTemplatePreview(body: string, maxLength = 88): string {
  const collapsed = body
    .replace(/⟦[^⟧]+⟧/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
  if (!collapsed) return '';
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength).trim()}…`;
}

export function groupReplyTemplatesForPicker(templates: ReplyTemplate[]): {
  negotiation: ReplyTemplate[];
  general: ReplyTemplate[];
} {
  const sorted = [...templates].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const negotiation: ReplyTemplate[] = [];
  const general: ReplyTemplate[] = [];
  for (const template of sorted) {
    if (replyTemplatePickerSection(template) === 'negotiation') {
      negotiation.push(template);
    } else {
      general.push(template);
    }
  }
  return { negotiation, general };
}
