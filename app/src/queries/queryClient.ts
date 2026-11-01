/** Application-wide TanStack Query cache shared by Vue hooks and imperative immutable reads. */
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import {
  captureHttpNotFound,
  captureWeb3Error,
  resetHttpNotFound,
  SENTRY_WEB3_BOUNDARY_META_KEY
} from '@/lib/sentry'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const queryName = query.queryKey[0]
      captureHttpNotFound(error, query, {
        operation: 'query',
        queryName: typeof queryName === 'string' ? queryName : undefined,
        hasData: query.state.dataUpdatedAt > 0
      })
      captureWeb3Error(error, {
        operation: 'query',
        queryName: typeof queryName === 'string' ? queryName : undefined
      })
    },
    onSuccess: (_data, query) => resetHttpNotFound(query)
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      captureHttpNotFound(error, mutation, { operation: 'mutation' })
      if (mutation.meta?.[SENTRY_WEB3_BOUNDARY_META_KEY] === true) return

      captureWeb3Error(error, { operation: 'mutation' })
    }
  }),
  defaultOptions: {
    queries: {
      // Refetch every 200 seconds (200,000 ms).
      refetchInterval: 200_000,
      refetchOnWindowFocus: true,
      retry: 3
    }
  }
})
