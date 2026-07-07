import { apiDownloadBlob } from '@/src/api/api-client';
import type { OpportunityListFilters } from '@/src/api/opportunities-api';

function buildPipelineExportQuery(filters: OpportunityListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.actionTier) params.set('actionTier', filters.actionTier);
  if (filters.emailCategory) params.set('emailCategory', filters.emailCategory);
  if (filters.leadStage) params.set('leadStage', filters.leadStage);
  if (filters.leadValueBand) params.set('leadValueBand', filters.leadValueBand);
  if (filters.needsAction) params.set('needsAction', 'true');
  if (filters.timeRange) params.set('timeRange', filters.timeRange);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortDirection) params.set('sortDirection', filters.sortDirection);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function downloadPipelineCsv(filters: OpportunityListFilters = {}): Promise<Blob> {
  return apiDownloadBlob(`/api/v1/pipeline/export.csv${buildPipelineExportQuery(filters)}`);
}
