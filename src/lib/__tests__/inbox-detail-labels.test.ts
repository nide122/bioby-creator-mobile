import {
  buildAttentionList,
  buildReplySuggestionList,
  buildRiskNoteList,
  buildSystemHintList,
  meaningfulRecommendedActions,
  mergeDetailSignals,
  resolveRiskCount,
  attentionItemText,
  filterSignalsApartFromAttention,
  translateDetailSignal,
  translateMissingField,
  translateRecommendedAction,
  translateRiskFlagLabel,
  translateRiskLabelText,
  visibleMissingFields,
  visibleRiskFlags,
  visibleRiskLabel,
} from '@/src/lib/inbox-detail-labels';

describe('inbox-detail-labels', () => {
  const t = (key: string) => key;

  it('translates known recommended actions', () => {
    expect(translateRecommendedAction(t, 'Ask for budget range before quoting.')).toBe(
      'inboxThreadDetail.recommendedActions.askBudget'
    );
  });

  it('merges brief and classification signals without duplicates', () => {
    expect(
      mergeDetailSignals(['Budget mentioned', 'paid campaign'], ['paid campaign', 'Usage scope'])
    ).toEqual(['Budget mentioned', 'paid campaign', 'Usage scope']);
  });

  it('translates missing field codes', () => {
    expect(translateMissingField(t, 'budget')).toBe('inboxThreadDetail.missingField.budget');
  });

  it('hides budget missing hint when budget label is populated', () => {
    expect(visibleMissingFields(['budget', 'usageRights'], '$4,000')).toEqual(['usageRights']);
  });

  it('hides deliverables missing hint when packages have items', () => {
    expect(
      visibleMissingFields(['deliverables', 'usageRights'], null, {
        packages: [
          {
            items: [{ name: '1 TikTok', platform: 'tiktok', contentFormat: 'short_video', quantity: 1 }],
            budgetDisplay: '$2,500',
          },
        ],
      }),
    ).toEqual(['usageRights']);
  });

  it('hides stale budget unclear risk when budget label is populated', () => {
    expect(visibleRiskLabel('Budget unclear', '$4,000 USD + CNY 2,000')).toBeUndefined();
    expect(
      visibleRiskFlags(
        [{ id: 'rf-missing_budget', label: 'Budget unclear', severity: 'warning' }],
        '$4,000 USD + CNY 2,000'
      )
    ).toEqual([]);
  });

  it('translates mixed-language detail signals to locale keys', () => {
    expect(translateDetailSignal(t, 'paid campaign')).toBe('inboxThreadDetail.signals.paidCampaign');
    expect(translateDetailSignal(t, '提及预算')).toBe('inboxThreadDetail.signals.budgetMentioned');
    expect(translateDetailSignal(t, 'Deliverable: 1 TikTok integration')).toBe(
      'inboxThreadDetail.signals.deliverable'
    );
  });

  it('translates backend risk labels to locale keys', () => {
    expect(translateRiskLabelText(t, 'Risky usage language')).toBe('inboxThreadDetail.riskLabels.dangerUsage');
    expect(translateRiskFlagLabel(t, '授权条款有风险')).toBe('inboxThreadDetail.riskLabels.dangerUsage');
  });

  it('keeps suggestions and risks in separate lists', () => {
    const systemHints = buildSystemHintList(
      ['发送报价前先确认明确预算或费率。', '报价前确认自然流/付费投放、地域与时长。'],
      t
    );
    const suggestions = buildReplySuggestionList(['先核对档期与报价再回复。'], t);
    const risks = buildRiskNoteList(['合同要求永久授权，需核实。']);
    expect(systemHints.map((item) => item.text)).toEqual([
      'inboxThreadDetail.riskHints.missingBudget',
      'inboxThreadDetail.riskHints.usageScopeUnclear',
    ]);
    expect(suggestions.map((item) => item.text)).toEqual(['先核对档期与报价再回复。']);
    expect(risks.map((item) => item.text)).toEqual(['合同要求永久授权，需核实。']);
  });

  it('builds reply suggestions without risk notes', () => {
    const items = buildReplySuggestionList(['先核对档期与报价再回复。'], t);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe('先核对档期与报价再回复。');
  });

  it('filters classification signals that duplicate attention items', () => {
    const attention = [{ id: 'a', text: '先确认预算区间再报价。' }];
    expect(
      filterSignalsApartFromAttention(['先确认预算区间再报价。', '提及预算'], attention)
    ).toEqual(['提及预算']);
  });

  it('uses actionable hint text for attention items', () => {
    expect(
      attentionItemText(
        {
          id: 'rf-multiple_packages',
          label: '多个报价方案',
          hint: '回复前确认适用哪条交付与报价。',
          severity: 'warning',
        },
        t
      )
    ).toBe('inboxThreadDetail.riskHints.multiplePackages');
  });

  it('filters rule-template recommended actions from reply suggestions', () => {
    expect(meaningfulRecommendedActions(['Ask for budget range before quoting.', '先核对排期再回复。'])).toEqual([
      '先核对排期再回复。',
    ]);
  });

  it('counts hub risks from LLM clause notes only', () => {
    expect(resolveRiskCount(['合同要求永久授权，需核实。'])).toBe(1);
    expect(resolveRiskCount([])).toBe(0);
    expect(resolveRiskCount(undefined)).toBe(0);
  });
});
