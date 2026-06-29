import {
  resolveAttachmentPreviewMode,
} from '@/components/mail/email-attachment-utils';
import { buildAttachmentPreviewContent } from '@/src/lib/email-attachment-preview-content';

jest.mock('@/src/lib/mammoth-browser', () => ({
  convertDocxToHtml: jest.fn(async () => '<p>Hello docx</p>'),
}));

describe('email attachment preview content', () => {
  it('converts docx attachments to html preview content', async () => {
    const attachment = {
      id: '1',
      filename: '2026-06-24.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    expect(resolveAttachmentPreviewMode(attachment)).toBe('html-document');

    const blob = new Blob(['fake-docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const content = await buildAttachmentPreviewContent(attachment, blob, 'blob:preview', blob.type);
    expect(content.mode).toBe('html-document');
    expect(content.html).toContain('Hello docx');
  });

  it('returns text preview for plain text attachments', async () => {
    const attachment = { id: '2', filename: 'notes.txt', mimeType: 'text/plain' };
    const blob = new Blob(['line one\nline two'], { type: 'text/plain' });
    const content = await buildAttachmentPreviewContent(attachment, blob, 'blob:preview', blob.type);
    expect(content.mode).toBe('text');
    expect(content.text).toBe('line one\nline two');
  });
});
