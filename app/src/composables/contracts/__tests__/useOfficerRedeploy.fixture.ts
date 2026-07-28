import type { Address } from 'viem'

// vi.mock() factories are hoisted above even `import` statements, so the
// mutation refs + mocks they close over can't live here — they must be
// re-declared via vi.hoisted() in each spec file. This fixture only holds
// what plain imports can safely share: constants and a plain helper fn.

export const NEW_OFFICER = '0xdddd000000000000000000000000000000000000' as Address
export const PREV_OFFICER = '0xcccc000000000000000000000000000000000000' as Address
export const NEW_INVESTOR = '0xaaaa000000000000000000000000000000000000' as Address

export const resetMutation = (m: {
  mutateAsync: { mockReset: () => void }
  reset: { mockReset: () => void }
  isPending: { value: boolean }
  isSuccess: { value: boolean }
  error: { value: Error | null }
}) => {
  m.mutateAsync.mockReset()
  m.reset.mockReset()
  m.isPending.value = false
  m.isSuccess.value = false
  m.error.value = null
}
