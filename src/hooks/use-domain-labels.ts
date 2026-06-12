import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { DraftKind, EscrowLifecyclePhase, InboxEmailCategory, InboxLeadStage } from '@/src/types/domain';

export function useDomainLabels() {
  const { t } = useTranslation();

  const escrowLifecycleLabel = useMemo(
    (): Record<EscrowLifecyclePhase, string> => ({
      awaiting_prepay: t('labels.escrow.awaiting_prepay'),
      escrowed: t('labels.escrow.escrowed'),
      in_execution: t('labels.escrow.in_execution'),
      pending_verification: t('labels.escrow.pending_verification'),
      settled: t('labels.escrow.settled'),
      remediation: t('labels.escrow.remediation'),
      disputed: t('labels.escrow.disputed'),
    }),
    [t]
  );

  const inboxLeadStageLabel = useMemo(
    (): Record<InboxLeadStage, string> => ({
      new: t('labels.inboxLead.new'),
      needs_reply: t('labels.inboxLead.needs_reply'),
      draft_ready: t('labels.inboxLead.draft_ready'),
      quoted: t('labels.inboxLead.quoted'),
      negotiating: t('labels.inboxLead.negotiating'),
    }),
    [t]
  );

  const inboxCategoryLabel = useMemo(
    (): Record<InboxEmailCategory, string> => ({
      commercial: t('labels.inboxCategory.commercial'),
      pr_sample: t('labels.inboxCategory.pr_sample'),
      media: t('labels.inboxCategory.media'),
      personal: t('labels.inboxCategory.personal'),
      other: t('labels.inboxCategory.other'),
    }),
    [t]
  );

  const draftKindLabel = useMemo(
    (): Record<DraftKind, string> => ({
      ai_reply: t('labels.draftKind.ai_reply'),
      quote: t('labels.draftKind.quote'),
      follow_up: t('labels.draftKind.follow_up'),
    }),
    [t]
  );

  return { escrowLifecycleLabel, inboxLeadStageLabel, inboxCategoryLabel, draftKindLabel };
}
