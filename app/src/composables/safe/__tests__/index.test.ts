import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReads = { foo: 'reads' }
const mockWrites = { bar: 'writes' }

vi.mock('../reads', () => ({
  useSafeReads: vi.fn(() => mockReads),
  useSafeAppUrls: vi.fn(() => ({ baz: 'urls' }))
}))

vi.mock('../writes', () => ({
  useSafeWrites: vi.fn(() => mockWrites)
}))

describe('safe index exports', () => {
  let module: typeof import('../index')

  beforeEach(async () => {
    vi.resetModules()
    module = await import('../index')
  })

  it('exposes combined useSafe composable', () => {
    const safe = module.useSafe()
    expect(safe).toMatchObject({ ...mockReads, ...mockWrites })
  })

  it('re-exports individual composables', () => {
    expect(typeof module.useSafeReads).toBe('function')
    expect(typeof module.useSafeWrites).toBe('function')
  })
})
