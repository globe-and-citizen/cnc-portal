import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

/**
 * Opt-in TanStack Vue Query test helpers (#1845).
 *
 * The global mock in `src/tests/setup/tanstack.setup.ts` replaces `useQuery`,
 * `useMutation` and `useQueryClient` for every spec. To exercise the *real*
 * library instead, a spec must:
 *
 * 1. Opt out of the global mock at the top of the file:
 *
 *    ```ts
 *    vi.unmock('@tanstack/vue-query')
 *    ```
 *
 * 2. Mount the component with a real `QueryClient` provided in context, using
 *    the `global.plugins` returned by `withQueryClient()`:
 *
 *    ```ts
 *    const wrapper = mount(MyComponent, {
 *      global: { plugins: [...withQueryClient()] }
 *    })
 *    ```
 *
 * Retries are disabled by default so failing queries surface immediately
 * instead of being retried under fake timers.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false }
    }
  })
}

/**
 * Returns Vue plugins that install a fresh real `QueryClient` for a test mount.
 * Pass-through to `global.plugins` in `@vue/test-utils`.
 */
export function withQueryClient(
  queryClient: QueryClient = createTestQueryClient()
): [[typeof VueQueryPlugin, { queryClient: QueryClient }]] {
  return [[VueQueryPlugin, { queryClient }]]
}
