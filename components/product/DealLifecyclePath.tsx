import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { FlowSteps } from '@/components/product/FlowSteps';
import { buildFlowSteps, dealLifecycleStepStates } from '@/src/lib/inbox-opportunity-flow';
import type { EscrowLifecyclePhase } from '@/src/types/domain';

export function DealLifecyclePath({ phase }: { phase: EscrowLifecyclePhase }) {
  const { t } = useTranslation();
  const states = dealLifecycleStepStates(phase);

  const steps = useMemo(
    () =>
      buildFlowSteps(
        [
          { id: 'prepay', label: t('dealLifecyclePath.prepayLabel'), hint: t('dealLifecyclePath.prepayHint') },
          { id: 'delivery', label: t('dealLifecyclePath.deliveryLabel'), hint: t('dealLifecyclePath.deliveryHint') },
          {
            id: 'verification',
            label: t('dealLifecyclePath.verificationLabel'),
            hint: t('dealLifecyclePath.verificationHint'),
          },
          { id: 'settled', label: t('dealLifecyclePath.settledLabel'), hint: t('dealLifecyclePath.settledHint') },
        ],
        states
      ),
    [states, t]
  );

  return <FlowSteps title={t('dealLifecyclePath.title')} steps={steps} />;
}
