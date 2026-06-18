import { stripQuotedEmailContent, stripQuotedHtml, stripQuotedPlainText } from '@/src/lib/email-body';

describe('email-body quote stripping', () => {
  it('removes Gmail-style plain text quotes', () => {
    const raw = `Thanks for the update.\n\nOn Tue, Jun 17, 2026 at 10:00 Brand <brand@example.com> wrote:\n> Original pitch`;

    expect(stripQuotedPlainText(raw)).toBe('Thanks for the update.');
  });

  it('removes lines prefixed with >', () => {
    const raw = 'Sounds good.\n\n> quoted line one\n> quoted line two';

    expect(stripQuotedPlainText(raw)).toBe('Sounds good.');
  });

  it('removes gmail_quote html blocks', () => {
    const raw =
      '<p>New reply body</p><div class="gmail_quote"><blockquote>Old thread</blockquote></div>';

    expect(stripQuotedHtml(raw)).toBe('<p>New reply body</p>');
  });

  it('prefers stripped text over html when both exist', () => {
    const result = stripQuotedEmailContent(
      'Reply only\n\nOn Mon wrote:\n> old',
      '<p>Reply only</p><div class="gmail_quote">old</div>',
    );

    expect(result.text).toBe('Reply only');
    expect(result.html).toBe('<p>Reply only</p>');
  });
});
