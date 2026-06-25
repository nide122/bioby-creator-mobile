import {
  dedupeVisibleAttachments,
  isParseableDocumentAttachment,
  isVisibleEmailAttachment,
} from '@/components/mail/email-attachment-utils';
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

  it('treats docx attachments as parseable', () => {
    const attachment: EmailAttachment = {
      id: '3',
      filename: '合作方案.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    expect(isParseableDocumentAttachment(attachment)).toBe(true);
  });

  it('rejects image attachments for parsing', () => {
    const attachment: EmailAttachment = {
      id: '4',
      filename: 'logo.png',
      mimeType: 'image/png',
    };
    expect(isParseableDocumentAttachment(attachment)).toBe(false);
  });
});
