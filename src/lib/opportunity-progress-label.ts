import type {
  EscrowLifecyclePhase,
  InboxEmailCategory,
  InboxLeadStage,
  InboxThread,
  OpportunityPipelinePhase,
} from '@/src/types/domain';

export type CommercialProgressLabels = {
  leadStage: Record<InboxLeadStage, string>;
  escrow: Record<EscrowLifecyclePhase, string>;
  pipeline: Record<OpportunityPipelinePhase, string>;
};

const ACTIVE_ESCROW_PHASES: EscrowLifecyclePhase[] = [
  'escrowed',
  'in_execution',
  'pending_verification',
  'remediation',
  'disputed',
];

const ACTIVE_PIPELINE_PHASES: OpportunityPipelinePhase[] = [
  'NEGOTIATION',
  'CONTRACTED',
  'PRODUCTION',
  'BRAND_REVIEW',
  'REVISION',
  'SCHEDULED',
  'LIVE',
  'INVOICING',
];

export function resolveCommercialProgressLabel(
  item: Pick<
    InboxThread,
    'category' | 'leadStage' | 'pipelinePhase' | 'dealEscrowPhase' | 'dealId'
  >,
  labels: CommercialProgressLabels,
): string | undefined {
  if (item.category !== 'commercial') return undefined;

  if (item.pipelinePhase === 'CLOSED' || item.dealEscrowPhase === 'settled') {
    return item.dealEscrowPhase === 'settled'
      ? labels.escrow.settled
      : labels.pipeline.CLOSED;
  }

  if (item.dealEscrowPhase) {
    return labels.escrow[item.dealEscrowPhase];
  }

  if (item.dealId && item.pipelinePhase) {
    return labels.pipeline[item.pipelinePhase];
  }

  if (item.pipelinePhase && item.pipelinePhase !== 'INQUIRY') {
    return labels.pipeline[item.pipelinePhase];
  }

  return labels.leadStage[item.leadStage];
}

export function commercialProgressDetailAccent(
  item: Pick<InboxThread, 'category' | 'pipelinePhase' | 'dealEscrowPhase' | 'dealId'>,
): boolean {
  if (item.category !== 'commercial') return false;
  if (item.dealEscrowPhase && ACTIVE_ESCROW_PHASES.includes(item.dealEscrowPhase)) {
    return true;
  }
  if (item.pipelinePhase && ACTIVE_PIPELINE_PHASES.includes(item.pipelinePhase)) {
    return true;
  }
  return false;
}
