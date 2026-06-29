import * as XLSX from 'xlsx';

import {
  isPdfPreviewAttachment,
  resolveAttachmentPreviewMode,
  type AttachmentPreviewMode,
} from '@/components/mail/email-attachment-utils';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import { convertDocxToHtml } from '@/src/lib/mammoth-browser';
export type AttachmentPreviewContent = {
  mode: AttachmentPreviewMode;
  /** PDF/image blob URL or file URI — unchanged for binary previews. */
  uri?: string | null;
  mimeType?: string | null;
  /** Plain text for text/* previews. */
  text?: string | null;
  /** HTML body for docx / html / spreadsheet previews. */
  html?: string | null;
};

export async function buildAttachmentPreviewContent(
  attachment: EmailAttachment,
  blob: Blob,
  uri: string,
  mimeType: string,
): Promise<AttachmentPreviewContent> {
  const mode = resolveAttachmentPreviewMode(attachment, mimeType);
  switch (mode) {
    case 'pdf':
    case 'image':
      return { mode, uri, mimeType };
    case 'text': {
      const text = await blob.text();
      return { mode, text };
    }
    case 'html-document': {
      const ext = extension(attachment.filename);
      if (ext === 'html' || ext === 'htm' || mimeType.includes('html')) {
        const html = await blob.text();
        return { mode, html: wrapPreviewHtml(html, attachment.filename) };
      }
      const arrayBuffer = await blob.arrayBuffer();
      const htmlBody = await convertDocxToHtml(arrayBuffer);
      return { mode, html: wrapPreviewHtml(htmlBody, attachment.filename) };    }
    case 'spreadsheet': {
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return { mode: 'unsupported' };
      }
      const tableHtml = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName]);
      return { mode, html: wrapPreviewHtml(tableHtml, attachment.filename, 'spreadsheet') };
    }
    default:
      if (isPdfPreviewAttachment(attachment)) {
        return { mode: 'pdf', uri, mimeType };
      }
      return { mode: 'unsupported' };
  }
}

function extension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

function wrapPreviewHtml(body: string, title: string, variant: 'document' | 'spreadsheet' = 'document'): string {
  const baseStyles =
    variant === 'spreadsheet'
      ? 'body{margin:0;padding:16px;font:14px/1.5 system-ui,sans-serif;color:#111;background:#fff;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top;}tr:nth-child(even){background:#fafafa;}'
      : 'body{margin:0;padding:20px;font:15px/1.6 Georgia,serif;color:#111;background:#fff;}img{max-width:100%;height:auto;}table{border-collapse:collapse;}td,th{border:1px solid #ddd;padding:6px 8px;}';
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${safeTitle}</title><style>${baseStyles}</style></head><body>${body}</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
