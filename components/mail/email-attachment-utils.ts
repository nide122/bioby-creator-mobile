import type { EmailAttachment } from '@/src/api/mailbox-api';

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

export function isPdfAttachment(attachment: EmailAttachment): boolean {
  if ((attachment.mimeType ?? '').toLowerCase().includes('pdf')) return true;
  return attachment.filename.toLowerCase().endsWith('.pdf');
}
