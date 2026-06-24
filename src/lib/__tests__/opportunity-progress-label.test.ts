import {
  commercialProgressDetailAccent,
  resolveCommercialProgressLabel,
  type CommercialProgressLabels,
} from '@/src/lib/opportunity-progress-label';

const labels: CommercialProgressLabels = {
  leadStage: {
    new: '新线索',
    needs_reply: '待回复',
    draft_ready: '草稿就绪',
    quoted: '已报价',
    negotiating: '谈判中',
  },
  escrow: {
    awaiting_prepay: '待预付',
    escrowed: '已托管',
    in_execution: '交付中',
    pending_verification: '待存证',
    settled: '已结算',
    remediation: '需修改',
    disputed: '争议中',
  },
  pipeline: {
    INQUIRY: '询盘中',
    NEGOTIATION: '谈判中',
    CONTRACTED: '已签约',
    PRODUCTION: '制作交付',
    BRAND_REVIEW: '品牌审核',
    REVISION: '修改中',
    SCHEDULED: '待发布',
    LIVE: '已发布',
    INVOICING: '验收结算',
    CLOSED: '已结案',
  },
};

describe('opportunity-progress-label', () => {
  it('prefers escrow phase for active deals', () => {
    expect(
      resolveCommercialProgressLabel(
        {
          category: 'commercial',
          leadStage: 'quoted',
          pipelinePhase: 'CONTRACTED',
          dealEscrowPhase: 'in_execution',
          dealId: 'mock-deal-beta',
        },
        labels,
      ),
    ).toBe('交付中');
  });

  it('falls back to lead stage before a deal exists', () => {
    expect(
      resolveCommercialProgressLabel(
        {
          category: 'commercial',
          leadStage: 'draft_ready',
          pipelinePhase: 'INQUIRY',
          dealEscrowPhase: undefined,
          dealId: undefined,
        },
        labels,
      ),
    ).toBe('草稿就绪');
  });

  it('shows settled for closed opportunities', () => {
    expect(
      resolveCommercialProgressLabel(
        {
          category: 'commercial',
          leadStage: 'quoted',
          pipelinePhase: 'CLOSED',
          dealEscrowPhase: 'settled',
          dealId: 'mock-deal',
        },
        labels,
      ),
    ).toBe('已结算');
  });

  it('accents active commercial progress', () => {
    expect(
      commercialProgressDetailAccent({
        category: 'commercial',
        pipelinePhase: 'PRODUCTION',
        dealEscrowPhase: 'in_execution',
        dealId: 'mock-deal-beta',
      }),
    ).toBe(true);
    expect(
      commercialProgressDetailAccent({
        category: 'commercial',
        pipelinePhase: 'INQUIRY',
        dealEscrowPhase: undefined,
        dealId: undefined,
      }),
    ).toBe(false);
  });
});
