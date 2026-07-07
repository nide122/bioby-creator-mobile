import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  fetchMockBattleReportById,
  fetchMockBattleReports,
  updateMockBattleReportShareable,
} from '@/src/api/mock-battle-reports';
import type { BattleReportView } from '@/src/types/api';
import type { BattleReportSummary } from '@/src/types/domain';

function mapReport(view: BattleReportView): BattleReportSummary {
  return {
    id: view.id ?? '',
    title: view.title ?? '',
    metrics: view.metrics ?? [],
    lesson: view.lesson ?? '',
    shareableToMediaKit: view.shareableToMediaKit ?? false,
  };
}

export async function fetchBattleReports(): Promise<BattleReportSummary[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockBattleReports();
  }
  const items = await apiRequest<BattleReportView[]>('/api/v1/battle-reports');
  return items.map(mapReport);
}

export async function fetchBattleReportById(id: string): Promise<BattleReportSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockBattleReportById(id);
  }
  const item = await apiRequest<BattleReportView>(`/api/v1/battle-reports/${id}`);
  return mapReport(item);
}

export async function updateBattleReportShareable(
  id: string,
  shareableToMediaKit: boolean
): Promise<BattleReportSummary> {
  if (!shouldUseBackendApi()) {
    return updateMockBattleReportShareable(id, shareableToMediaKit);
  }
  const item = await apiRequest<BattleReportView>(`/api/v1/battle-reports/${id}`, {
    method: 'PATCH',
    body: { shareableToMediaKit },
  });
  return mapReport(item);
}
