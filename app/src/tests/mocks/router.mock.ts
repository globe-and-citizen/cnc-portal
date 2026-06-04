import { vi } from 'vitest'
import { reactive } from 'vue'

export interface MockRoute {
  params: Record<string, string>
  query: Record<string, string>
  path: string
  fullPath: string
  name: string | undefined
  meta: Record<string, unknown>
}

const defaultRoute = (): MockRoute => ({
  params: { id: '1' },
  query: {},
  path: '/teams/1',
  fullPath: '/teams/1',
  name: undefined,
  meta: { name: 'Team View' }
})

// Shared, mutable route object returned by the globally-mocked `useRoute`.
// Reactive so that route-bound state (e.g. `usePagination`) recomputes when a
// component navigates via the mock router within a test. Returning a stable
// reference (rather than a fresh object per call) means an override applied
// before mount is reliably visible to the component under test.
export const mockRoute: MockRoute = reactive(defaultRoute())

export const mockRouterPush = vi.fn()
// `replace` simulates query-only navigation so route-bound reads reflect writes
// within a test (used by `usePagination`). Only the query is updated — path,
// name and params are left untouched — and `resetMockRoute()` in the global
// `beforeEach` clears it between tests so nothing leaks.
export const mockRouterReplace = vi.fn((to?: { query?: Record<string, unknown> } | string) => {
  if (to && typeof to === 'object' && 'query' in to) {
    mockRoute.query = { ...((to.query as Record<string, string>) ?? {}) }
  }
})
export const mockRouterBack = vi.fn()
export const mockRouterGo = vi.fn()

export const mockRouter = {
  push: mockRouterPush,
  replace: mockRouterReplace,
  back: mockRouterBack,
  go: mockRouterGo,
  beforeEach: vi.fn(),
  afterEach: vi.fn()
}

// Override the route for a single test. Unspecified keys fall back to defaults,
// so callers only declare what they care about (e.g. `{ params: { id: '42' } }`).
export const setMockRoute = (route: Partial<MockRoute>): void => {
  Object.assign(mockRoute, defaultRoute(), route)
}

// Restore the default route. Called from the global `beforeEach` so per-test
// overrides never leak across tests.
export const resetMockRoute = (): void => {
  Object.assign(mockRoute, defaultRoute())
}
