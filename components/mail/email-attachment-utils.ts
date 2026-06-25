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

/** @deprecated Use {@link isParseableDocumentAttachment}. */
export function isPdfAttachment(attachment: EmailAttachment): boolean {
  return isParseableDocumentAttachment(attachment);
}

export function isVisibleEmailAttachment(attachment: EmailAttachment): boolean {
  if (!attachment.inline) return true;
  return !/^image\/|^text\//i.test(attachment.mimeType ?? '');
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
