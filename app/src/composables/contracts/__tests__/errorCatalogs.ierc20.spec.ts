import { describe, it, expect } from 'vitest'
import { resolveRevertMessage } from '../errorCatalogs'

// Split out from errorCatalogs.spec.ts, which is already at the repo's
// max-lines limit. Covers IERC20Errors (OZ v5's ERC20.sol) — bubbled
// unchanged through `SafeERC20.safeTransferFrom`, so any contract moving an
// ERC-20 (Bank.depositToken included) can surface these directly.
describe('resolveRevertMessage — IERC20Errors', () => {
  it('formats ERC20InsufficientBalance (sender, balance, needed)', () => {
    expect(resolveRevertMessage('ERC20InsufficientBalance', ['0xOWNER', 50n, 80n])).toBe(
      'Insufficient token balance — needs 80, only 50 available'
    )
  })

  it('formats ERC20InsufficientAllowance (spender, allowance, needed)', () => {
    expect(resolveRevertMessage('ERC20InsufficientAllowance', ['0xSPENDER', 10n, 25n])).toBe(
      'Token allowance too low — needs 25, only 10 approved'
    )
  })

  it('resolves the plain-string IERC20Errors entries', () => {
    expect(resolveRevertMessage('ERC20InvalidSender', ['0xZERO'])).toBe('Invalid token sender')
    expect(resolveRevertMessage('ERC20InvalidReceiver', ['0xZERO'])).toBe('Invalid token recipient')
  })
})
