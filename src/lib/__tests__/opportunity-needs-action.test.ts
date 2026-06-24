import { isOpportunityNeedsAction } from '@/src/lib/opportunity-needs-action';

describe('isOpportunityNeedsAction', () => {
  it('excludes closed pipeline opportunities', () => {
    expect(
      isOpportunityNeedsAction({
        leadValueBand: 'high_value',
        pipelinePhase: 'CLOSED',
        dealEscrowPhase: 'settled',
      })
    ).toBe(false);
  });

  it('excludes settled deals even when the value band was not archived', () => {
    expect(
      isOpportunityNeedsAction({
        leadValueBand: 'needs_negotiation',
        pipelinePhase: 'PRODUCTION',
        dealEscrowPhase: 'settled',
      })
    ).toBe(false);
  });

  it('includes active escrow delivery opportunities', () => {
    expect(
      isOpportunityNeedsAction({
        leadValueBand: 'archived',
        pipelinePhase: 'PRODUCTION',
        dealEscrowPhase: 'in_execution',
      })
    ).toBe(true);
  });

  it('includes open high-value opportunities', () => {
    expect(
      isOpportunityNeedsAction({
        leadValueBand: 'high_value',
        pipelinePhase: 'INQUIRY',
      })
    ).toBe(true);
  });
});
