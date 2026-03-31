import { vi } from 'vitest'
import { mockLog, mockParseError } from '../mocks/utils.mock'

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
