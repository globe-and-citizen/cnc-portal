/** Application-wide TanStack Query cache shared by Vue hooks and imperative immutable reads. */
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import { captureWeb3Error } from '@/lib/sentry'

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
    onError: (error) => {
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
