import { buildProposalSkuDisplay, splitSkuDetailParts } from '@/src/lib/proposal-sku-display';
import type { ProposalSkuLine } from '@/src/types/domain';

describe('proposal-sku-display', () => {
  it('splits detail parts on comma and middle dot', () => {
    expect(splitSkuDetailParts('1 × 脚本 · 1 × 粗剪 · 1 × 成片')).toEqual([
      '1 × 脚本',
      '1 × 粗剪',
      '1 × 成片',
    ]);
  });

  it('uses turnaround parts as chips when present', () => {
    const line: ProposalSkuLine = {
      id: 'sku-primary',
      platform: 'Package',
      deliverable: '1 × 短视频',
      turnaroundLabel: '1 × 脚本 · 1 × 粗剪 · 1 × 成片',
      priceLabel: '$1k–$1.5k',
    };

    expect(buildProposalSkuDisplay(line)).toEqual({
      title: '1 × 短视频',
      chips: ['1 × 脚本', '1 × 粗剪', '1 × 成片'],
      footnote: undefined,
      isAddon: false,
    });
  });

  it('marks add-on rows', () => {
    const line: ProposalSkuLine = {
      id: 'sku-addon',
      platform: 'Add-on',
      deliverable: 'Paid usage extension',
      turnaroundLabel: 'Scoped separately',
      priceLabel: 'Quoted separately',
    };

    expect(buildProposalSkuDisplay(line).isAddon).toBe(true);
    expect(buildProposalSkuDisplay(line).footnote).toBe('Scoped separately');
  });
});
