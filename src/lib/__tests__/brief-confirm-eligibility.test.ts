import {
  briefConfirmBlocker,
  canConfirmBrief,
  canProceedToConfirmBrief,
  hasUnacknowledgedDangerFlags,
  isLeadStageQuotedOrLater,
} from '@/src/lib/brief-confirm-eligibility';
import type { InboxRiskFlag, InboxThreadDetail } from '@/src/types/domain';

const baseDetail: Pick<
  InboxThreadDetail,
  'extractionStatus' | 'briefStage' | 'dealId' | 'leadStage' | 'riskFlags'
> = {
  extractionStatus: 'COMPLETE',
  briefStage: 'PROVISIONAL',
  leadStage: 'quoted',
  riskFlags: [],
};

describe('brief-confirm-eligibility', () => {
  it('requires quoted lead stage or later', () => {
    expect(isLeadStageQuotedOrLater('quoted')).toBe(true);
    expect(isLeadStageQuotedOrLater('needs_reply')).toBe(false);
  });

  it('blocks confirm when danger risks are unacknowledged', () => {
    const flags: InboxRiskFlag[] = [
      { id: 'rf-1', label: 'Usage', severity: 'danger', acknowledged: false },
    ];
    expect(hasUnacknowledgedDangerFlags(flags)).toBe(true);
    expect(canConfirmBrief({ ...baseDetail, riskFlags: flags })).toBe(false);
    expect(briefConfirmBlocker({ ...baseDetail, riskFlags: flags })).toBe('danger_risks');
  });

  it('draft_ready needs quote approval before confirm', () => {
    expect(briefConfirmBlocker({ ...baseDetail, leadStage: 'draft_ready' })).toBe('lead_stage_draft_ready');
  });

  it('allows proceed to confirm before danger risks are acknowledged', () => {
    const flags: InboxRiskFlag[] = [
      { id: 'rf-1', label: 'Usage', severity: 'danger', acknowledged: false },
    ];
    expect(canProceedToConfirmBrief({ ...baseDetail, riskFlags: flags })).toBe(true);
    expect(canConfirmBrief({ ...baseDetail, riskFlags: flags })).toBe(false);
  });

  it('allows confirm when brief is complete and risks are acknowledged', () => {
    const flags: InboxRiskFlag[] = [
      { id: 'rf-1', label: 'Usage', severity: 'danger', acknowledged: true },
    ];
    expect(canConfirmBrief({ ...baseDetail, riskFlags: flags })).toBe(true);
    expect(briefConfirmBlocker({ ...baseDetail, riskFlags: flags })).toBeNull();
  });
});
