import { vi } from 'vitest'

export const mockRouterPush = vi.fn()
export const mockRouterReplace = vi.fn()
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
// Returning a stable reference (rather than a fresh object per call) means an
// override applied before mount is reliably visible to the component under test.
export const mockRoute: MockRoute = defaultRoute()

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
