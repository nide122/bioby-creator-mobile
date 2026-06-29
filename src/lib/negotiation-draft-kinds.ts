import type { DraftKind } from '@/src/types/domain';

export const NEGOTIATION_DRAFT_KINDS = [
  'shrink_scope',
  'ask_more_money',
  'ask_extension',
  'request_usage_rights',
] as const satisfies readonly DraftKind[];

export type NegotiationDraftKind = (typeof NEGOTIATION_DRAFT_KINDS)[number];

export function isNegotiationDraftKind(kind: DraftKind): kind is NegotiationDraftKind {
  return (NEGOTIATION_DRAFT_KINDS as readonly DraftKind[]).includes(kind);
}
