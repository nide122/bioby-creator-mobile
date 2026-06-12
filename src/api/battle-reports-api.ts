import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  fetchMockBattleReportById,
  fetchMockBattleReports,
  updateMockBattleReportShareable,
} from '@/src/api/mock-battle-reports';
import type { BattleReportSummary } from '@/src/types/domain';

type BattleReportDto = {
  id: string;
  title: string;
  metrics: string[];
  lesson: string;
  shareableToMediaKit: boolean;
};

function mapReport(dto: BattleReportDto): BattleReportSummary {
  return {
    id: dto.id,
    title: dto.title,
    metrics: dto.metrics ?? [],
    lesson: dto.lesson,
    shareableToMediaKit: dto.shareableToMediaKit,
  };
}

export async function fetchBattleReports(): Promise<BattleReportSummary[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockBattleReports();
  }
  const items = await apiRequest<BattleReportDto[]>('/api/v1/battle-reports');
  return items.map(mapReport);
}

export async function fetchBattleReportById(id: string): Promise<BattleReportSummary> {
  if (!shouldUseBackendApi()) {
    return fetchMockBattleReportById(id);
  }
  const item = await apiRequest<BattleReportDto>(`/api/v1/battle-reports/${id}`);
  return mapReport(item);
}

export async function updateBattleReportShareable(
  id: string,
  shareableToMediaKit: boolean
): Promise<BattleReportSummary> {
  if (!shouldUseBackendApi()) {
    return updateMockBattleReportShareable(id, shareableToMediaKit);
  }
  const item = await apiRequest<BattleReportDto>(`/api/v1/battle-reports/${id}`, {
    method: 'PATCH',
    body: { shareableToMediaKit },
  });
  return mapReport(item);
}
