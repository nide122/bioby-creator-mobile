import {
  extractCidReferences,
  normalizeContentId,
  replaceCidSrcInHtml,
  resolveAttachmentForCid,
} from '@/src/lib/email-inline-images';
import type { EmailAttachment } from '@/src/api/mailbox-api';

describe('email-inline-images', () => {
  it('normalizes cid values', () => {
    expect(normalizeContentId('cid:D8380C37@5CE3744A.82D43D6A00000000')).toBe(
      'd8380c37@5ce3744a.82d43d6a00000000',
    );
    expect(normalizeContentId('<image001.png@01DBF772.05A34480>')).toBe('image001.png@01dbf772.05a34480');
  });

  it('extracts cid references from html', () => {
    const html = '<p>Hi</p><img src="cid:logo@abc" alt="logo" />';
    expect(extractCidReferences(html)).toEqual(['logo@abc']);
  });

  it('matches attachments by contentId', () => {
    const attachments: EmailAttachment[] = [
      {
        id: '1',
        filename: 'logo.png',
        mimeType: 'image/png',
        contentId: 'logo@abc',
      },
    ];
    expect(resolveAttachmentForCid('cid:logo@abc', attachments)?.id).toBe('1');
  });

  it('matches attachments by outlook-style filename stem', () => {
    const attachments: EmailAttachment[] = [
      {
        id: '2',
        filename: 'D8380C37@5CE3744A.82D43D6A00000000.png',
        mimeType: 'image/png',
      },
    ];
    expect(resolveAttachmentForCid('cid:D8380C37@5CE3744A.82D43D6A00000000', attachments)?.id).toBe('2');
  });

  it('replaces cid src values with blob urls', () => {
    const html = '<img src="cid:logo@abc" />';
    const replaced = replaceCidSrcInHtml(
      html,
      new Map([['logo@abc', 'blob:http://localhost/abc']]),
    );
    expect(replaced).toBe('<img src="blob:http://localhost/abc" />');
  });
});
