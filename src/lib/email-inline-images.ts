import { Platform } from 'react-native';

import type { EmailAttachment } from '@/src/api/mailbox-api';
import { downloadEmailAttachment } from '@/src/api/mailbox-api';
import { isAttachmentMailboxConnectionError } from '@/src/lib/email-attachment-errors';

const CID_SRC_RE = /\bsrc\s*=\s*(["'])cid:([^"']+)\1/gi;

export type InlineImageUrlMode = 'blob' | 'data';

export function defaultInlineImageUrlMode(): InlineImageUrlMode {
  return Platform.OS === 'web' ? 'blob' : 'data';
}

function decodeHtmlEntities(value: string): string {
  const HTML_ENTITY_MAP: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (key.startsWith('#')) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return HTML_ENTITY_MAP[key] ?? match;
  });
}

export function normalizeContentId(value: string): string {
  return decodeHtmlEntities(value)
    .trim()
    .replace(/^cid:/i, '')
    .replace(/^<|>$/g, '')
    .toLowerCase();
}

function filenameStem(filename: string): string {
  const lower = filename.trim().toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot > 0 ? lower.slice(0, dot) : lower;
}

function isImageAttachment(attachment: EmailAttachment): boolean {
  const mime = (attachment.mimeType ?? '').toLowerCase();
  if (/^image\//i.test(mime)) {
    return true;
  }
  if (mime === 'application/octet-stream' && (attachment.inline || attachment.contentId)) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.filename);
}

export function resolveAttachmentForCid(
  cid: string,
  attachments: EmailAttachment[],
): EmailAttachment | null {
  const normalized = normalizeContentId(cid);
  if (!normalized) return null;

  for (const attachment of attachments) {
    if (attachment.contentId && normalizeContentId(attachment.contentId) === normalized) {
      return attachment;
    }
  }

  for (const attachment of attachments) {
    if (!isImageAttachment(attachment)) continue;
    const filename = attachment.filename.trim().toLowerCase();
    const stem = filenameStem(attachment.filename);
    if (filename === normalized || stem === normalized) {
      return attachment;
    }
  }

  const imageAttachments = attachments.filter(isImageAttachment);
  if (imageAttachments.length === 1) {
    return imageAttachments[0];
  }

  return null;
}

export function extractCidReferences(html: string): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(CID_SRC_RE)) {
    const raw = match[2]?.trim();
    if (!raw) continue;
    const normalized = normalizeContentId(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    refs.push(raw);
  }
  return refs;
}

export function replaceCidSrcInHtml(html: string, cidToUrl: ReadonlyMap<string, string>): string {
  if (cidToUrl.size === 0) return html;
  return html.replace(CID_SRC_RE, (full, quote: string, rawCid: string) => {
    const url = cidToUrl.get(normalizeContentId(rawCid));
    return url ? `src=${quote}${url}${quote}` : full;
  });
}

export type ResolveInlineImagesResult = {
  html: string;
  objectUrls: string[];
  mailboxConnectionFailed: boolean;
};

export async function resolveInlineImagesInHtml(
  html: string,
  messageId: string,
  attachments: EmailAttachment[],
  urlMode: InlineImageUrlMode = defaultInlineImageUrlMode(),
): Promise<ResolveInlineImagesResult> {
  const cidRefs = extractCidReferences(html);
  if (cidRefs.length === 0) {
    return { html, objectUrls: [], mailboxConnectionFailed: false };
  }

  const cidToUrl = new Map<string, string>();
  const objectUrls: string[] = [];
  let mailboxConnectionFailed = false;

  await Promise.all(
    cidRefs.map(async (rawCid) => {
      const attachment = resolveAttachmentForCid(rawCid, attachments);
      if (!attachment) return;
      try {
        const blob = await downloadEmailAttachment(messageId, attachment.id);
        const url =
          urlMode === 'blob'
            ? URL.createObjectURL(blob)
            : await blobToDataUrl(blob, attachment.mimeType ?? 'image/png');
        if (urlMode === 'blob') {
          objectUrls.push(url);
        }
        cidToUrl.set(normalizeContentId(rawCid), url);
      } catch (error) {
        if (isAttachmentMailboxConnectionError(error)) {
          mailboxConnectionFailed = true;
        }
      }
    }),
  );

  return {
    html: replaceCidSrcInHtml(html, cidToUrl),
    objectUrls,
    mailboxConnectionFailed,
  };
}

async function blobToDataUrl(blob: Blob, mimeType: string): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  if (dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  const type = mimeType.split(';')[0].trim() || 'image/png';
  return `data:${type};base64,${dataUrl}`;
}
