import { vi } from 'vitest'
import { useQueryClientFn, useQueryFn, useMutationFn } from '@/tests/mocks/composables.mock'

/**
 * Global TanStack Vue Query mock.
 *
 * Replaces `useQuery`, `useMutation` and `useQueryClient` with shared mocks so
 * specs don't need a real `QueryClient` in context.
 *
 * NOTE (#1845): this global mock is the main blocker to exercising real TanStack
 * flows. The target is to remove it and make query mocking opt-in per spec.
 * Specs that want to drive the real library should mount with the opt-in helper
 * `mountWithQueryClient` from `@/tests/helpers/queryClient` and locally
 * `vi.unmock('@tanstack/vue-query')`. See `app/src/tests/README.md`.
 */
vi.mock('@tanstack/vue-query', async () => {
  const actual: object = await vi.importActual('@tanstack/vue-query')
  return {
    ...actual,
    useQueryClient: useQueryClientFn,
    useQuery: useQueryFn,
    useMutation: useMutationFn
  }
})
