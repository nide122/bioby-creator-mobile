import { countEmailHtmlImages } from '@/src/lib/email-html-images';

describe('email-html-images', () => {
  it('counts img tags in html', () => {
    expect(countEmailHtmlImages('<p>Hi</p>')).toBe(0);
    expect(countEmailHtmlImages('<img src="a" /><img src="b" />')).toBe(2);
  });
});
