export type DealTermRow = { label: string; value: string };

export type DealDeliveryStep = {
  id: string;
  title: string;
  due: string;
  status: 'done' | 'current' | 'blocked' | 'upcoming';
  owner: string;
  note: string;
};

export type DealUploadRow = { id: string; title: string; state: string };

export type DealDeliveryWorkflow = {
  timeline: DealDeliveryStep[];
  uploads: DealUploadRow[];
  feedbackNote?: string;
};

export type DealVerificationEvidence = {
  id: string;
  status: 'done' | 'reviewing' | 'missing';
};

export type DealVerificationChecklistItem = { id: string; passed: boolean };

export type DealVerificationWorkflow = {
  evidence: DealVerificationEvidence[];
  checklist: DealVerificationChecklistItem[];
  payoutHint?: string;
  submittedAt?: string;
  brandReviewStatus?: 'pending' | 'approved';
  brandApprovedAt?: string;
};

export type DealPacketContent = {
  summary?: string;
  deliverables: DealTermRow[];
  delivery?: DealDeliveryWorkflow;
  verification?: DealVerificationWorkflow;
};

export type DealPacketView = {
  dealId: string;
  title: string;
  brandPlaceholder: string;
  packet: DealPacketContent;
  fulfillmentStatus?: DealFulfillmentStatusView;
};

export type DealFulfillmentStatusPhase = 'done' | 'active' | 'waiting' | 'blocked';

export type DealFulfillmentStatusBlock = {
  id: 'payment' | 'revision' | 'brandReview' | string;
  phase: DealFulfillmentStatusPhase;
  statusKey: string;
  nextStepKey: string;
  revisionCount?: number | null;
};

export type DealFulfillmentStatusView = {
  payment: DealFulfillmentStatusBlock;
  revision: DealFulfillmentStatusBlock;
  brandReview: DealFulfillmentStatusBlock;
};
