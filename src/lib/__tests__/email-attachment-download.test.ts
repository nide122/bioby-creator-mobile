import { resolveAttachmentMimeType } from '@/src/lib/email-attachment-download';

describe('email-attachment-download', () => {
  it('forces pdf mime when server returns octet-stream', () => {
    expect(resolveAttachmentMimeType('contract.pdf', 'application/octet-stream', 'application/octet-stream')).toBe(
      'application/pdf',
    );
  });

  it('keeps declared image mime types', () => {
    expect(resolveAttachmentMimeType('scan.png', 'image/png', 'application/octet-stream')).toBe('image/png');
  });
});
