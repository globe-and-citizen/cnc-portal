import { beforeEach, vi } from 'vitest'
import { mockLog, mockParseError, resetUtilsMocks } from '../mocks/utils.mock'

// Clear the shared log / parseError spies before every test (call history only;
// implementations are preserved).
beforeEach(() => {
  resetUtilsMocks()
})

vi.mock('@/utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const actualLog = (actual.log as Record<string, unknown> | undefined) ?? {}

  return {
    ...actual,
    log: {
      ...actualLog,
      ...mockLog
    },
    parseError: mockParseError
  }
})
