import { useQuery } from '@tanstack/react-query';

import { fetchMockBattleReportById, fetchMockBattleReports } from '@/src/api/mock-battle-reports';

export function useMockBattleReports() {
  return useQuery({
    queryKey: ['battle-reports'],
    queryFn: fetchMockBattleReports,
  });
}

export function useMockBattleReport(id: string | undefined) {
  return useQuery({
    queryKey: ['battle-report', id],
    queryFn: () => fetchMockBattleReportById(id as string),
    enabled: !!id,
  });
}
