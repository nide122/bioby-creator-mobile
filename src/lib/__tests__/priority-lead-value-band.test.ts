import {
  countPriorityLeadValueBands,
  isActiveEscrowDelivery,
  resolvePriorityLeadValueBand,
} from '@/src/lib/priority-lead-value-band';

describe('priority-lead-value-band', () => {
  it('maps active escrow delivery to the follow-up band', () => {
    expect(
      resolvePriorityLeadValueBand({
        leadValueBand: 'high_value',
        pipelinePhase: 'PRODUCTION',
        dealEscrowPhase: 'in_execution',
      })
    ).toBe('needs_negotiation');
  });

  it('keeps pre-deal high value in the high-value bucket', () => {
    expect(
      resolvePriorityLeadValueBand({
        leadValueBand: 'high_value',
        pipelinePhase: 'INQUIRY',
      })
    ).toBe('high_value');
  });

  it('counts escrow delivery threads in the follow-up bucket', () => {
    const counts = countPriorityLeadValueBands([
      { leadValueBand: 'high_value', pipelinePhase: 'INQUIRY' },
      { leadValueBand: 'high_value', pipelinePhase: 'PRODUCTION', dealEscrowPhase: 'escrowed' },
    ]);
    expect(counts).toEqual({ high_value: 1, needs_negotiation: 1 });
  });

  it('treats contracted pipeline as active delivery', () => {
    expect(
      isActiveEscrowDelivery({
        pipelinePhase: 'CONTRACTED',
        dealId: 'mock-deal-alpha',
      })
    ).toBe(true);
  });
});
