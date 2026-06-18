import {
  commercialAttentionFallback,
  meaningfulRecommendedActions,
  mergeDetailSignals,
  resolveAttentionCount,
  translateDetailSignal,
  attentionItemText,
  buildAttentionList,
  filterSignalsApartFromAttention,
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

  it('builds a deduplicated attention list from actions and risk flags', () => {
    const items = buildAttentionList(
      ['Ask for budget range before quoting.'],
      [
        {
          id: 'rf-missing_budget',
          label: 'Budget unclear',
          hint: 'Ask for a clear budget or rate before sending a quote.',
          severity: 'warning',
        },
      ],
      t
    );
    expect(items).toHaveLength(2);
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

  it('counts attention items from risks and meaningful actions', () => {
    expect(
      resolveAttentionCount(
        undefined,
        [{ id: 'rf-usage', label: 'Usage scope unclear', severity: 'warning' }],
        ['Confirm which package applies.', 'Review and reply']
      )
    ).toBe(2);
    expect(meaningfulRecommendedActions(['Review and reply', 'Ask for budget range before quoting.'])).toEqual([
      'Ask for budget range before quoting.',
    ]);
    expect(resolveAttentionCount(undefined, [], [], true)).toBe(1);
    expect(commercialAttentionFallback(true, true, [], [], undefined)).toBe(true);
  });
});
