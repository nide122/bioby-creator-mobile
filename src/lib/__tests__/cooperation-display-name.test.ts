import {
  cooperationLeadLine,
  isEmailLikeLabel,
  preferCooperationTitle,
  shouldShowCooperationBrandEyebrow,
} from '@/src/lib/cooperation-display-name';

describe('cooperation-display-name', () => {
  it('detects sender emails', () => {
    expect(isEmailLikeLabel('15770838310@163.com')).toBe(true);
    expect(isEmailLikeLabel('Glow Recipe')).toBe(false);
  });

  it('prefers cooperation title over sender email', () => {
    expect(
      preferCooperationTitle({
        brand: '15770838310@163.com',
        title: 'TikTok 种草合作',
      }),
    ).toBe('TikTok 种草合作');
  });

  it('keeps real brand names', () => {
    expect(
      preferCooperationTitle({
        brand: 'Glow Recipe',
        title: 'TikTok campaign',
      }),
    ).toBe('Glow Recipe');
  });

  it('builds lead line without duplicate email', () => {
    expect(cooperationLeadLine('15770838310@163.com', 'TikTok 种草合作')).toBe('TikTok 种草合作');
    expect(cooperationLeadLine('Glow Recipe', 'TikTok campaign')).toBe('Glow Recipe · TikTok campaign');
  });

  it('hides email brand eyebrow', () => {
    expect(shouldShowCooperationBrandEyebrow('15770838310@163.com', 'TikTok 种草合作')).toBe(false);
    expect(shouldShowCooperationBrandEyebrow('Glow Recipe', 'TikTok campaign')).toBe(true);
  });
});
