import { mapOpportunityToDetail } from '@/src/api/opportunity-mappers';
import type { OpportunityDetail, OpportunityTimeline } from '@/src/api/opportunity-types';

const baseDetail: OpportunityDetail = {
  id: '1',
  brandName: 'ClearSkin Lab',
  subject: 'Collab brief',
  preview: 'Budget signal',
  updatedAtISO: '2026-06-15T08:00:00Z',
  emailCategory: 'commercial',
  actionTier: 'DECIDE_NOW',
  leadStage: 'needs_reply',
};

describe('mapOpportunityToDetail messages', () => {
  it('maps direction and preserves inbound labels', () => {
    const timeline: OpportunityTimeline = {
      opportunityId: '1',
      messages: [
        {
          id: '10',
          fromLabel: 'Brand Team',
          direction: 'inbound',
          snippet: 'Initial pitch',
          sentAtISO: '2026-06-15T08:00:00Z',
        },
        {
          id: '11',
          fromLabel: 'You',
          direction: 'outbound',
          snippet: 'Thanks for reaching out.',
          sentAtISO: '2026-06-15T09:00:00Z',
        },
      ],
      events: [],
    };

    const detail = mapOpportunityToDetail(baseDetail, timeline);

    expect(detail.messages).toHaveLength(2);
    expect(detail.messages[0]?.direction).toBe('inbound');
    expect(detail.messages[0]?.fromLabel).toBe('Brand Team');
    expect(detail.messages[1]?.direction).toBe('outbound');
    expect(detail.messages[1]?.fromLabel).toBe('You');
  });

  it('infers outbound direction from legacy mock labels', () => {
    const timeline: OpportunityTimeline = {
      opportunityId: '1',
      messages: [
        {
          id: '12',
          fromLabel: 'You · Follow-up',
          snippet: 'Follow-up body',
          sentAtISO: '2026-06-15T09:30:00Z',
        },
      ],
      events: [],
    };

    const detail = mapOpportunityToDetail(baseDetail, timeline);

    expect(detail.messages[0]?.direction).toBe('outbound');
  });
});
