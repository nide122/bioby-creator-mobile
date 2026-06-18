import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { DraftKind, EscrowLifecyclePhase, InboxEmailCategory, InboxLeadStage, LeadValueBand, OpportunityPipelinePhase } from '@/src/types/domain';

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
      spam: t('labels.inboxCategory.spam'),
      other: t('labels.inboxCategory.other'),
    }),
    [t]
  );

  const leadValueBandLabel = useMemo(
    (): Record<LeadValueBand, string> => ({
      high_value: t('labels.leadValueBand.high_value'),
      needs_negotiation: t('labels.leadValueBand.needs_negotiation'),
      archived: t('labels.leadValueBand.archived'),
    }),
    [t]
  );

  const draftKindLabel = useMemo(
    (): Record<DraftKind, string> => ({
      ai_reply: t('labels.draftKind.ai_reply'),
      quote: t('labels.draftKind.quote'),
      follow_up: t('labels.draftKind.follow_up'),
      clarify_budget: t('labels.draftKind.clarify_budget'),
      counter_offer: t('labels.draftKind.counter_offer'),
      ack_and_schedule: t('labels.draftKind.ack_and_schedule'),
    }),
    [t]
  );

  const opportunityPipelinePhaseLabel = useMemo(
    (): Record<OpportunityPipelinePhase, string> => ({
      INQUIRY: t('labels.pipelinePhase.INQUIRY'),
      NEGOTIATION: t('labels.pipelinePhase.NEGOTIATION'),
      CONTRACTED: t('labels.pipelinePhase.CONTRACTED'),
      PRODUCTION: t('labels.pipelinePhase.PRODUCTION'),
      BRAND_REVIEW: t('labels.pipelinePhase.BRAND_REVIEW'),
      REVISION: t('labels.pipelinePhase.REVISION'),
      SCHEDULED: t('labels.pipelinePhase.SCHEDULED'),
      LIVE: t('labels.pipelinePhase.LIVE'),
      INVOICING: t('labels.pipelinePhase.INVOICING'),
      CLOSED: t('labels.pipelinePhase.CLOSED'),
    }),
    [t],
  );

  return {
    escrowLifecycleLabel,
    inboxLeadStageLabel,
    inboxCategoryLabel,
    leadValueBandLabel,
    draftKindLabel,
    opportunityPipelinePhaseLabel,
  };
}
