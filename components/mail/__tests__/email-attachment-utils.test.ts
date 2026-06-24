import { dedupeVisibleAttachments, isVisibleEmailAttachment } from '@/components/mail/email-attachment-utils';
import type { EmailAttachment } from '@/src/api/mailbox-api';

describe('email attachment utils', () => {
  it('shows pdf even when marked inline', () => {
    const attachment: EmailAttachment = {
      id: '1',
      filename: '合同.pdf',
      mimeType: 'application/pdf',
      inline: true,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(true);
  });

  it('hides inline images', () => {
    const attachment: EmailAttachment = {
      id: '2',
      filename: 'logo.png',
      mimeType: 'image/png',
      inline: true,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(false);
  });

  it('dedupes identical files', () => {
    const attachments: EmailAttachment[] = [
      { id: '1', filename: '合同.pdf', mimeType: 'application/pdf', sizeBytes: 100 },
      { id: '2', filename: '合同.pdf', mimeType: 'application/pdf', sizeBytes: 100 },
    ];
    expect(dedupeVisibleAttachments(attachments)).toHaveLength(1);
  });
});
