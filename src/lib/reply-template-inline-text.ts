import {
  REPLY_TEMPLATE_FIELD_KEYS,
  replyTemplateFieldLabel,
  type ReplyTemplateFieldKey,
} from '@/src/lib/reply-template-fields';
import { normalizeReplyTemplateBody } from '@/src/lib/reply-template-render';

export type TextSelection = { start: number; end: number };

const TOKEN_PATTERN = /⟦(\w+)⟧/g;

export function formatInlineFieldLabel(key: ReplyTemplateFieldKey, t: (key: string) => string): string {
  return `【${replyTemplateFieldLabel(key, t)}】`;
}

export function bodyToDisplayText(body: string, t: (key: string) => string): string {
  const normalized = normalizeReplyTemplateBody(body);
  return normalized.replace(TOKEN_PATTERN, (_, rawKey: string) => {
    const key = REPLY_TEMPLATE_FIELD_KEYS.find((item) => item === rawKey);
    return key ? formatInlineFieldLabel(key, t) : `【${rawKey}】`;
  });
}

export function displayTextToBody(display: string, t: (key: string) => string): string {
  let body = display;
  const labels = [...REPLY_TEMPLATE_FIELD_KEYS]
    .map((key) => ({ key, label: formatInlineFieldLabel(key, t) }))
    .sort((a, b) => b.label.length - a.label.length);
  for (const { key, label } of labels) {
    body = body.split(label).join(`⟦${key}⟧`);
  }
  return body;
}

export function insertInlineFieldAt(
  display: string,
  selection: TextSelection,
  key: ReplyTemplateFieldKey,
  t: (key: string) => string,
): { text: string; selection: TextSelection } {
  const label = formatInlineFieldLabel(key, t);
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);
  const text = `${display.slice(0, start)}${label}${display.slice(end)}`;
  const cursor = start + label.length;
  return { text, selection: { start: cursor, end: cursor } };
}

export function findInlineFieldSpanAt(
  display: string,
  index: number,
  t: (key: string) => string,
): { start: number; end: number; key: ReplyTemplateFieldKey } | null {
  for (const key of REPLY_TEMPLATE_FIELD_KEYS) {
    const label = formatInlineFieldLabel(key, t);
    let fromIndex = 0;
    while (fromIndex < display.length) {
      const start = display.indexOf(label, fromIndex);
      if (start < 0) break;
      const end = start + label.length;
      if (index > start && index <= end) {
        return { start, end, key };
      }
      fromIndex = start + 1;
    }
  }
  return null;
}

export function findInlineFieldEndingAt(
  display: string,
  cursor: number,
  t: (key: string) => string,
): { start: number; end: number; key: ReplyTemplateFieldKey } | null {
  for (const key of REPLY_TEMPLATE_FIELD_KEYS) {
    const label = formatInlineFieldLabel(key, t);
    if (display.slice(cursor - label.length, cursor) === label) {
      return { start: cursor - label.length, end: cursor, key };
    }
  }
  return null;
}

export function removeInlineFieldSpan(
  display: string,
  span: { start: number; end: number },
): { text: string; selection: TextSelection } {
  const text = `${display.slice(0, span.start)}${display.slice(span.end)}`;
  return { text, selection: { start: span.start, end: span.start } };
}

export function removeFieldKeyFromBody(body: string, key: ReplyTemplateFieldKey): string {
  return body.split(`⟦${key}⟧`).join('');
}

export function listInlineFieldsInBody(body: string): ReplyTemplateFieldKey[] {
  const keys: ReplyTemplateFieldKey[] = [];
  for (const match of normalizeReplyTemplateBody(body).matchAll(TOKEN_PATTERN)) {
    const key = match[1] as ReplyTemplateFieldKey;
    if (REPLY_TEMPLATE_FIELD_KEYS.includes(key) && !keys.includes(key)) {
      keys.push(key);
    }
  }
  return keys;
}

function firstDiffIndex(before: string, after: string): number {
  const limit = Math.min(before.length, after.length);
  for (let index = 0; index < limit; index += 1) {
    if (before[index] !== after[index]) return index;
  }
  return limit;
}

/** Expands a partial backspace/delete into removing the whole inline field token. */
export function normalizeInlineDelete(
  previousDisplay: string,
  nextDisplay: string,
  previousSelection: TextSelection,
  t: (key: string) => string,
): { text: string; selection: TextSelection } | null {
  if (nextDisplay.length >= previousDisplay.length) return null;

  const collapsed = previousSelection.start === previousSelection.end;
  if (!collapsed) return null;

  const endingToken = findInlineFieldEndingAt(previousDisplay, previousSelection.start, t);
  if (endingToken && nextDisplay.length === previousDisplay.length - 1) {
    return removeInlineFieldSpan(previousDisplay, endingToken);
  }

  const diffIndex = firstDiffIndex(previousDisplay, nextDisplay);
  const containingToken = findInlineFieldSpanAt(previousDisplay, diffIndex + 1, t);
  if (containingToken) {
    return removeInlineFieldSpan(previousDisplay, containingToken);
  }

  return null;
}
