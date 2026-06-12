import { moveSectionOrder, resolveSectionOrder } from '@/src/lib/media-kit-sections';

describe('media-kit-sections', () => {
  it('fills missing ids with defaults', () => {
    expect(resolveSectionOrder(['contact', 'about'])).toEqual([
      'contact',
      'about',
      'stats',
      'trust_proof',
      'audience',
      'channels',
      'rates',
      'services',
      'partnerships',
      'cases',
    ]);
  });

  it('moves sections up and down', () => {
    const order = resolveSectionOrder(['about', 'stats', 'contact']);
    expect(moveSectionOrder(order, 1, -1).slice(0, 3)).toEqual(['stats', 'about', 'contact']);
    expect(moveSectionOrder(order, 0, 1).slice(0, 3)).toEqual(['stats', 'about', 'contact']);
  });
});
