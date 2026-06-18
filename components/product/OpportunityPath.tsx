import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { FlowSteps, type FlowStepState } from '@/components/product/FlowSteps';
import { buildFlowSteps } from '@/src/lib/inbox-opportunity-flow';
import type { OpportunityPathStep } from '@/src/lib/opportunity-path-step';

export type { OpportunityPathStep } from '@/src/lib/opportunity-path-step';

type OpportunityPathStepId = 'inbox' | 'draft' | 'deal';

function opportunityPathStepStates(step: OpportunityPathStep): Record<OpportunityPathStepId, FlowStepState> {
  switch (step) {
    case 'inbox':
      return { inbox: 'current', draft: 'upcoming', deal: 'upcoming' };
    case 'draft':
      return { inbox: 'done', draft: 'current', deal: 'upcoming' };
    case 'deal':
      return { inbox: 'done', draft: 'done', deal: 'current' };
    case 'completed':
      return { inbox: 'done', draft: 'done', deal: 'done' };
  }
}

export function OpportunityPath({ currentStep }: { currentStep: OpportunityPathStep }) {
  const { t } = useTranslation();
  const states = opportunityPathStepStates(currentStep);
  const completed = currentStep === 'completed';

  const steps = useMemo(
    () =>
      buildFlowSteps(
        [
          { id: 'inbox', label: t('opportunityPath.inboxLabel'), hint: t('opportunityPath.inboxHint') },
          { id: 'draft', label: t('opportunityPath.draftLabel'), hint: t('opportunityPath.draftHint') },
          {
            id: 'deal',
            label: t('opportunityPath.dealLabel'),
            hint: completed ? t('opportunityPath.dealHintCompleted') : t('opportunityPath.dealHint'),
          },
        ],
        states
      ),
    [completed, states, t]
  );

  return (
    <FlowSteps title={completed ? t('opportunityPath.titleCompleted') : t('opportunityPath.title')} steps={steps} />
  );
}
