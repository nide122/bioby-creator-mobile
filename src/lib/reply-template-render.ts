import {
  normalizeReplyTemplateFieldKey,
  type ReplyTemplateFieldKey,
} from '@/src/lib/reply-template-fields';

export type ReplyTemplateFieldValues = Partial<Record<ReplyTemplateFieldKey, string>>;

export type ReplyTemplateBodySegment =
  | { kind: 'text'; value: string }
  | { kind: 'field'; key: ReplyTemplateFieldKey };

const TOKEN_PATTERN = /⟦(\w+)⟧/g;
const LEGACY_TOKEN_PATTERN = /\{\{(\w+)\}\}/g;

export function normalizeReplyTemplateBody(body: string): string {
  if (!body) return '';
  return body.replace(LEGACY_TOKEN_PATTERN, (_, key: string) => {
    const normalized = normalizeReplyTemplateFieldKey(key);
    return normalized ? `⟦${normalized}⟧` : `⟦${key}⟧`;
  });
}

export function parseReplyTemplateBody(body: string): ReplyTemplateBodySegment[] {
  const normalized = normalizeReplyTemplateBody(body);
  const segments: ReplyTemplateBodySegment[] = [];
  let lastIndex = 0;

  for (const match of normalized.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: 'text', value: normalized.slice(lastIndex, index) });
    }
    const key = normalizeReplyTemplateFieldKey(match[1]);
    if (key) {
      segments.push({ kind: 'field', key });
    } else {
      segments.push({ kind: 'text', value: match[0] });
    }
    lastIndex = index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    segments.push({ kind: 'text', value: normalized.slice(lastIndex) });
  }
  if (segments.length === 0) {
    segments.push({ kind: 'text', value: '' });
  }
  return segments;
}

export function serializeReplyTemplateBody(segments: ReplyTemplateBodySegment[]): string {
  return segments
    .map((segment) => (segment.kind === 'field' ? `⟦${segment.key}⟧` : segment.value))
    .join('');
}

export function extractReplyTemplateVariables(body: string): string[] {
  const keys: ReplyTemplateFieldKey[] = [];
  for (const segment of parseReplyTemplateBody(body)) {
    if (segment.kind === 'field' && !keys.includes(segment.key)) {
      keys.push(segment.key);
    }
  }
  return keys;
}

type RenderOptions = {
  /** When a value is missing, show this label instead of keeping the token. */
  missingLabel?: (key: ReplyTemplateFieldKey) => string;
  /** When true, unresolved fields stay as storage tokens. */
  keepUnresolvedTokens?: boolean;
};

export function renderReplyTemplate(
  body: string,
  values: ReplyTemplateFieldValues,
  options: RenderOptions = {},
): string {
  const segments = parseReplyTemplateBody(body);
  return segments
    .map((segment) => {
      if (segment.kind === 'text') return segment.value;
      const value = values[segment.key]?.trim();
      if (value) return value;
      if (options.keepUnresolvedTokens) return `⟦${segment.key}⟧`;
      if (options.missingLabel) return options.missingLabel(segment.key);
      return `⟦${segment.key}⟧`;
    })
    .join('');
}

/** Plain text for mailbox send — only substitutes known values. */
export function renderReplyTemplateForSend(body: string, values: ReplyTemplateFieldValues): string {
  return renderReplyTemplate(body, values, { keepUnresolvedTokens: false, missingLabel: () => '' });
}

export function insertReplyTemplateFieldToken(body: string, key: ReplyTemplateFieldKey): string {
  const segments = parseReplyTemplateBody(body);
  const last = segments[segments.length - 1];
  if (last?.kind === 'text') {
    segments[segments.length - 1] = { kind: 'text', value: last.value };
    segments.push({ kind: 'field', key });
    segments.push({ kind: 'text', value: '' });
  } else {
    segments.push({ kind: 'field', key });
    segments.push({ kind: 'text', value: '' });
  }
  return serializeReplyTemplateBody(segments);
}
