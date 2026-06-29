import type { EmailAttachment } from '@/src/api/mailbox-api';

export const PARSEABLE_DOCUMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'md',
  'markdown',
  'rtf',
  'log',
  'html',
  'htm',
  'json',
  'xml',
] as const;

const PARSEABLE_EXTENSION_SET = new Set<string>(PARSEABLE_DOCUMENT_EXTENSIONS);

const PARSEABLE_MIME_HINTS = [
  'pdf',
  'msword',
  'wordprocessingml',
  'spreadsheetml',
  'ms-excel',
  'presentationml',
  'ms-powerpoint',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/rtf',
  'text/html',
  'application/json',
  'application/xml',
  'text/xml',
];

export const PARSEABLE_DOCUMENT_ACCEPT = [
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.html,.htm,.json,.xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/rtf',
  'text/html',
  'application/json',
  'application/xml',
  'text/xml',
].join(',');

function extension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function isParseableDocumentAttachment(attachment: EmailAttachment): boolean {
  const ext = extension(attachment.filename);
  if (PARSEABLE_EXTENSION_SET.has(ext)) return true;
  const mime = (attachment.mimeType ?? '').toLowerCase();
  if (!mime) return false;
  return PARSEABLE_MIME_HINTS.some((hint) => mime.includes(hint));
}

export function isPdfPreviewAttachment(attachment: EmailAttachment): boolean {
  const mime = (attachment.mimeType ?? '').toLowerCase();
  if (mime.includes('pdf')) return true;
  return extension(attachment.filename) === 'pdf';
}

export type AttachmentPreviewMode = 'pdf' | 'image' | 'text' | 'html-document' | 'spreadsheet' | 'unsupported';

const TEXT_PREVIEW_EXTENSIONS = new Set(['txt', 'csv', 'md', 'markdown', 'log', 'json', 'xml', 'rtf']);
const HTML_PREVIEW_EXTENSIONS = new Set(['html', 'htm']);
const WORD_PREVIEW_EXTENSIONS = new Set(['doc', 'docx']);
const SPREADSHEET_PREVIEW_EXTENSIONS = new Set(['xls', 'xlsx']);

/** Any attachment shown in the list can be opened in the preview modal. */
export function isPreviewableAttachment(attachment: EmailAttachment): boolean {
  return isVisibleEmailAttachment(attachment);
}

export function resolveAttachmentPreviewMode(
  attachment: EmailAttachment,
  resolvedMimeType?: string | null,
): AttachmentPreviewMode {
  if (isPdfPreviewAttachment(attachment)) return 'pdf';
  const mime = (resolvedMimeType ?? attachment.mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension(attachment.filename))) {
    return 'image';
  }
  const ext = extension(attachment.filename);
  if (
    WORD_PREVIEW_EXTENSIONS.has(ext) ||
    mime.includes('msword') ||
    mime.includes('wordprocessingml')
  ) {
    return 'html-document';
  }
  if (
    SPREADSHEET_PREVIEW_EXTENSIONS.has(ext) ||
    mime.includes('spreadsheetml') ||
    mime.includes('ms-excel')
  ) {
    return 'spreadsheet';
  }
  if (HTML_PREVIEW_EXTENSIONS.has(ext) || mime.includes('html')) {
    return 'html-document';
  }
  if (
    TEXT_PREVIEW_EXTENSIONS.has(ext) ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'text/xml'
  ) {
    return 'text';
  }
  if (mime.startsWith('video/') || mime.startsWith('audio/')) {
    return 'unsupported';
  }
  if (isParseableDocumentAttachment(attachment)) {
    return 'unsupported';
  }
  return 'unsupported';
}

/** @deprecated Use {@link isParseableDocumentAttachment}. */
export function isPdfAttachment(attachment: EmailAttachment): boolean {
  return isParseableDocumentAttachment(attachment);
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);

function isImageAttachment(attachment: EmailAttachment): boolean {
  const mime = (attachment.mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/')) {
    return true;
  }
  if (mime === 'application/octet-stream' && (attachment.inline || attachment.contentId)) {
    return true;
  }
  return IMAGE_EXTENSIONS.has(extension(attachment.filename));
}

function looksLikeGarbledFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  if (lower.includes('charset=utf-8') || lower.includes('charset=gb2312') || lower.includes('name*0=') || lower.includes('filename*0=')) {
    return true;
  }
  if (/;\s*charset=/i.test(filename)) {
    return true;
  }
  if (lower.startsWith('attachment.octet-stream') && lower.includes(';')) {
    return true;
  }
  if (filename.startsWith('=?') && !filename.endsWith('?=')) {
    return true;
  }
  return /^[A-F0-9]{6,}@[A-F0-9.]+(?:\.[a-z0-9]+)?$/i.test(filename);
}

function looksLikeGenericFallbackFilename(filename: string): boolean {
  return /^attachment\.(octet-stream|pdf|png|jpe?g|gif|webp|bmp|bin)$/i.test(filename.trim());
}

export function isVisibleEmailAttachment(attachment: EmailAttachment): boolean {
  if (attachment.inline) {
    if (attachment.contentId) {
      return false;
    }
    if (looksLikeGarbledFilename(attachment.filename)) {
      return false;
    }
    if (looksLikeGenericFallbackFilename(attachment.filename)) {
      return false;
    }
    if (/^[A-F0-9]{6,}@[A-F0-9.]+/i.test(attachment.filename)) {
      return false;
    }
    return isParseableDocumentAttachment(attachment);
  }
  if (looksLikeGarbledFilename(attachment.filename)) {
    return isParseableDocumentAttachment(attachment);
  }
  if (looksLikeGenericFallbackFilename(attachment.filename)) {
    return isParseableDocumentAttachment(attachment);
  }
  if (/^[A-F0-9]{6,}@[A-F0-9.]+/i.test(attachment.filename)) {
    return false;
  }
  return true;
}

export function dedupeVisibleAttachments(items: EmailAttachment[]): EmailAttachment[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!isVisibleEmailAttachment(item)) return false;
    const key = `${item.filename}|${item.sizeBytes ?? 0}|${item.mimeType ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
