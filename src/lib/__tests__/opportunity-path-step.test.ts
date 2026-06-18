import { resolveOpportunityPathStep } from '@/src/lib/opportunity-path-step';
import type { InboxThreadDetail } from '@/src/types/domain';

function detail(overrides: Partial<InboxThreadDetail> = {}): InboxThreadDetail {
  return {
    id: '1',
    subject: 'Test',
    preview: 'Preview',
    updatedAtISO: '2026-06-01T00:00:00Z',
    brandName: 'Brand',
    category: 'commercial',
    leadStage: 'new',
    messages: [],
    riskFlags: [],
    recommendedActions: [],
    suggestedDraftIds: { aiReply: '', quote: '' },
    ...overrides,
  };
}

describe('resolveOpportunityPathStep', () => {
  it('marks settled opportunities as completed', () => {
    expect(
      resolveOpportunityPathStep(
        detail({
          leadStage: 'quoted',
          pipelinePhase: 'CLOSED',
          dealEscrowPhase: 'settled',
          dealId: 'deal-1',
          briefStage: 'CONFIRMED',
        })
      )
    ).toBe('completed');
  });

  it('marks closed pipeline without deal linkage as completed', () => {
    expect(
      resolveOpportunityPathStep(
        detail({
          leadStage: 'draft_ready',
          pipelinePhase: 'CLOSED',
        })
      )
    ).toBe('completed');
  });

  it('shows deal step after brief confirmation', () => {
    expect(
      resolveOpportunityPathStep(
        detail({
          leadStage: 'quoted',
          briefStage: 'CONFIRMED',
          dealId: 'deal-1',
          pipelinePhase: 'PRODUCTION',
          dealEscrowPhase: 'in_execution',
        })
      )
    ).toBe('deal');
  });

  it('shows draft step for quoted leads before confirmation', () => {
    expect(
      resolveOpportunityPathStep(
        detail({
          leadStage: 'quoted',
        })
      )
    ).toBe('draft');
  });
});
