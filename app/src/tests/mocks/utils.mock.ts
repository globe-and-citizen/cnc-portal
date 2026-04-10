import { vi } from 'vitest'

export const mockLog = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
}

export const mockParseError = vi.fn(() => 'Parsed error message')

export const resetUtilsMocks = () => {
  mockLog.error.mockClear()
  mockLog.warn.mockClear()
  mockLog.info.mockClear()
  mockLog.debug.mockClear()
  mockParseError.mockClear()
}
