import { beforeEach, vi } from 'vitest'
import { mockGetTokens, mockLog, resetUtilsMocks } from '../mocks/utils.mock'

// Clear the shared log spies before every test (call history only;
// implementations are preserved).
beforeEach(() => {
  resetUtilsMocks()
})

// `classifyError` is deliberately left un-mocked: specs assert the message a
// user actually sees, which is the whole point of routing through the catalog.
vi.mock('@/lib/logging', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const actualLog = (actual.log as Record<string, unknown> | undefined) ?? {}

  return {
    ...actual,
    log: {
      ...actualLog,
      ...mockLog
    }
  }
})

vi.mock('@/utils/expenses/model', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getTokens: mockGetTokens
  }
})
