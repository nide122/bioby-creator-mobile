import type { ProposalSkuLine } from '@/src/types/domain';

const PART_SPLIT = /\s*[,·;]\s*/u;

export function splitSkuDetailParts(text: string): string[] {
  return text
    .split(PART_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isProposalAddonLine(platform: string): boolean {
  const normalized = platform.trim().toLowerCase();
  return normalized === 'add-on' || normalized === 'addon' || normalized === '附加';
}

export type ProposalSkuDisplay = {
  title: string;
  chips: string[];
  footnote?: string;
  isAddon: boolean;
};

export function buildProposalSkuDisplay(line: ProposalSkuLine): ProposalSkuDisplay {
  const deliverableParts = splitSkuDetailParts(line.deliverable);
  const turnaroundParts = splitSkuDetailParts(line.turnaroundLabel);
  const isAddon = isProposalAddonLine(line.platform);

  const title =
    deliverableParts.length === 1
      ? deliverableParts[0]!
      : line.deliverable.trim() || line.platform;

  let chips: string[] = [];
  let footnote: string | undefined;

  if (turnaroundParts.length > 1) {
    chips = turnaroundParts;
  } else if (deliverableParts.length > 1) {
    chips = deliverableParts.slice(1);
  }

  const turnaround = line.turnaroundLabel.trim();
  if (turnaround && turnaroundParts.length === 1 && turnaround !== title && chips.length === 0) {
    footnote = turnaround;
  }

  return { title, chips, footnote, isAddon };
}
