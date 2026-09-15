/** Application-wide TanStack Query cache shared by Vue hooks and imperative immutable reads. */
import { QueryClient } from '@tanstack/vue-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch every 200 seconds (200,000 ms).
      refetchInterval: 200_000,
      refetchOnWindowFocus: true,
      retry: 2
    }
  }
})
