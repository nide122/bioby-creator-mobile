import { apiRequest } from '@/src/api/api-client';

export type BrandThreadSummary = {
  id: string;
  title: string;
  pipelinePhase?: string | null;
  dealId?: string | null;
  lastActivityAtISO: string;
  messageCount: number;
};

export type BrandDealSummary = {
  id: string;
  title: string;
  escrowPhase: string;
  opportunityId?: string | null;
  updatedAtISO: string;
};

export type BrandDetail = {
  id: string;
  name: string;
  domain?: string | null;
  threadCount: number;
  dealCount: number;
  messageCount: number;
  threads: BrandThreadSummary[];
  deals: BrandDealSummary[];
};

export type BrandTimelineItem = {
  id: string;
  kind: 'email' | 'deal' | string;
  title: string;
  subtitle?: string | null;
  sentAtISO: string;
  opportunityId?: string | null;
  dealId?: string | null;
  direction?: 'inbound' | 'outbound' | null;
};

export type BrandTimeline = {
  brandId: string;
  items: BrandTimelineItem[];
};

export async function fetchBrandDetail(brandId: string): Promise<BrandDetail> {
  return apiRequest<BrandDetail>(`/api/v1/brands/${brandId}`);
}

export async function fetchBrandTimeline(brandId: string): Promise<BrandTimeline> {
  return apiRequest<BrandTimeline>(`/api/v1/brands/${brandId}/timeline`);
}
