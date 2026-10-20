/** Application-wide TanStack Query cache shared by Vue hooks and imperative immutable reads. */
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import { captureWeb3Error, SENTRY_WEB3_BOUNDARY_META_KEY } from '@/lib/sentry'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const queryName = query.queryKey[0]
      captureWeb3Error(error, {
        operation: 'query',
        queryName: typeof queryName === 'string' ? queryName : undefined
      })
    }
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
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
