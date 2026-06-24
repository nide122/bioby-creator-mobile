import type { ReplyTemplateFieldKey } from '@/src/lib/reply-template-fields';

export type ReplyTemplate = {
  id: string;
  name: string;
  body: string;
  variables: string[];
  isDefault: boolean;
  sortOrder: number;
  updatedAtISO: string;
};

export type UpsertReplyTemplateInput = {
  name: string;
  body: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type RenderReplyTemplateInput = Partial<Record<ReplyTemplateFieldKey, string>> & {
  opportunityId?: string;
  /** When set, backend uses this package for ⟦recommendedPackage⟧ enrichment. */
  rateCardPackageId?: string;
};
