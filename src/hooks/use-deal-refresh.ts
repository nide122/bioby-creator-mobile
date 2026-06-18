import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useTabRefresh } from '@/src/hooks/use-tab-refresh';
import { refetchDealListQueries, refetchDealWorkspaceQueries } from '@/src/lib/invalidate-deal-queries';

export function useDealListRefresh() {
  const queryClient = useQueryClient();
  const refresh = useCallback(() => refetchDealListQueries(queryClient), [queryClient]);
  return useTabRefresh(refresh);
}

/** Refetch deal list whenever the Deals tab regains focus (e.g. navigating back). */
export function useDealListFocusRefresh() {
  const queryClient = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      void refetchDealListQueries(queryClient);
    }, [queryClient]),
  );
}

export function useDealWorkspaceRefresh(dealId: string | undefined) {
  const queryClient = useQueryClient();
  const refresh = useCallback(async () => {
    if (!dealId) return;
    await refetchDealWorkspaceQueries(queryClient, dealId);
  }, [dealId, queryClient]);
  return useTabRefresh(refresh);
}

/** Refetch deal detail + packet when a deal workspace screen regains focus. */
export function useDealWorkspaceFocusRefresh(dealId: string | undefined) {
  const queryClient = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      if (!dealId) return;
      void refetchDealWorkspaceQueries(queryClient, dealId);
    }, [dealId, queryClient]),
  );
}
