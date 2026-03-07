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
