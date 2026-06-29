import {
  dedupeVisibleAttachments,
  isParseableDocumentAttachment,
  isPreviewableAttachment,
  isVisibleEmailAttachment,
  resolveAttachmentPreviewMode,
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

  it('shows non-inline images even with contentId', () => {
    const attachment: EmailAttachment = {
      id: '5',
      filename: 'logo.png',
      mimeType: 'image/png',
      contentId: 'logo@abc',
      inline: false,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(true);
  });

  it('hides inline images even when mime is octet-stream', () => {
    const attachment: EmailAttachment = {
      id: '8',
      filename: 'C351C19C@7C9BA537.8EDE3D6A00000000.png',
      mimeType: 'application/octet-stream',
      inline: true,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(false);
  });

  it('hides content-id style embedded filenames', () => {
    const attachment: EmailAttachment = {
      id: '6',
      filename: 'C351C19C@7C9BA537.8EDE3D6A00000000.png',
      mimeType: 'image/png',
      inline: false,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(false);
  });

  it('hides garbled mime header filenames for inline only', () => {
    const attachment: EmailAttachment = {
      id: '7',
      filename: 'attachment.OCTET-STREAM; charset=utf-8; name*0="abc"',
      mimeType: 'application/octet-stream',
      inline: true,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(false);
  });

  it('shows non-inline pdf even with garbled filename', () => {
    const attachment: EmailAttachment = {
      id: '9',
      filename: 'attachment.OCTET-STREAM; charset=utf-8; name*0="abc"',
      mimeType: 'application/pdf',
      inline: false,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(true);
  });

  it('hides inline octet-stream embedded image', () => {
    const attachment: EmailAttachment = {
      id: '11',
      filename: 'attachment.octet-stream',
      mimeType: 'application/octet-stream',
      contentId: 'abc@def',
      inline: true,
    };
    expect(isVisibleEmailAttachment(attachment)).toBe(false);
  });

  it('hides generic fallback octet-stream placeholder', () => {
    const attachment: EmailAttachment = {
      id: '10',
      filename: 'attachment.octet-stream',
      mimeType: 'application/octet-stream',
      inline: false,
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

  it('treats visible attachments as previewable', () => {
    expect(
      isPreviewableAttachment({
        id: '1',
        filename: 'contract.pdf',
        mimeType: 'application/pdf',
      }),
    ).toBe(true);
    expect(
      isPreviewableAttachment({
        id: '2',
        filename: 'scan.png',
        mimeType: 'image/png',
      }),
    ).toBe(true);
    expect(
      isPreviewableAttachment({
        id: '3',
        filename: 'brief.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe(true);
    expect(
      isPreviewableAttachment({
        id: '4',
        filename: '2026-06-24.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe(true);
  });

  it('resolves preview modes for common attachment types', () => {
    expect(
      resolveAttachmentPreviewMode({
        id: '1',
        filename: 'contract.pdf',
        mimeType: 'application/pdf',
      }),
    ).toBe('pdf');
    expect(
      resolveAttachmentPreviewMode({
        id: '2',
        filename: 'brief.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe('html-document');
    expect(
      resolveAttachmentPreviewMode({
        id: '3',
        filename: 'notes.txt',
        mimeType: 'text/plain',
      }),
    ).toBe('text');
    expect(
      resolveAttachmentPreviewMode({
        id: '4',
        filename: 'budget.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ).toBe('spreadsheet');
  });
});
