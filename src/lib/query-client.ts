import { QueryClient } from '@tanstack/react-query';

import { isAuthApiError } from '@/src/api/api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isAuthApiError(error)) return false;
        return failureCount < 1;
      },
      staleTime: 30_000,
    },
  },
});
