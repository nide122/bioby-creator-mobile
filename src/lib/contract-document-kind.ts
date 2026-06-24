import type { DocumentKind } from '@/src/types/domain';

export function isContractDocumentKind(kind?: DocumentKind | string | null): boolean {
  return !kind || kind === 'CONTRACT';
}

const DOCUMENT_KIND_LABEL_KEYS: Record<DocumentKind, string> = {
  CONTRACT: 'contractSummary.documentKind.CONTRACT',
  CREATOR_BRIEF: 'contractSummary.documentKind.CREATOR_BRIEF',
  INVOICE: 'contractSummary.documentKind.INVOICE',
  PROPOSAL: 'contractSummary.documentKind.PROPOSAL',
  MEDIA_KIT: 'contractSummary.documentKind.MEDIA_KIT',
  CORRESPONDENCE: 'contractSummary.documentKind.CORRESPONDENCE',
  OTHER: 'contractSummary.documentKind.OTHER',
};

export function documentKindLabelKey(kind?: DocumentKind | string | null): string {
  const safe = (kind ?? 'OTHER') as DocumentKind;
  return DOCUMENT_KIND_LABEL_KEYS[safe] ?? DOCUMENT_KIND_LABEL_KEYS.OTHER;
}
