import { describe, it, expect } from 'vitest'
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError
} from 'viem'
import { classifyError } from '@/utils/classifyError'

function makeRevert(errorName: string, args?: readonly unknown[]) {
  const inner = new ContractFunctionRevertedError({
    abi: [],
    data: `0x${'00'.repeat(4)}`,
    functionName: 'test'
  })
  // viem's ContractFunctionRevertedError exposes `data` with errorName/args;
  // assigning directly for the test shape.
  ;(inner as unknown as { data: { errorName: string; args?: readonly unknown[] } }).data = {
    errorName,
    args
  }
  return new BaseError('reverted', { cause: inner })
}

describe('classifyError', () => {
  it('returns user_rejected for wallet cancellations', () => {
    const base = new BaseError('rejected', { cause: new UserRejectedRequestError(new Error('x')) })
    const c = classifyError(base)
    expect(c.category).toBe('user_rejected')
    expect(c.userMessage).toBe('Transaction was cancelled.')
  })

  it('resolves a revert name from the common catalog', () => {
    const c = classifyError(makeRevert('ZeroAddress'))
    expect(c.category).toBe('contract_revert')
    expect(c.revertName).toBe('ZeroAddress')
    expect(c.userMessage).toBe('A required address is not set')
  })

  it('resolves OZ InsufficientBalance with args from common', () => {
    const c = classifyError(makeRevert('InsufficientBalance', [100n, 500n]))
    expect(c.userMessage).toContain('needs 500')
    expect(c.userMessage).toContain('only 100')
  })

  it('applies per-contract override for TokenNotSupported', () => {
    const router = classifyError(makeRevert('TokenNotSupported'), {
      contract: 'SafeDepositRouter'
    })
    const cash = classifyError(makeRevert('TokenNotSupported'), {
      contract: 'CashRemuneration'
    })
    expect(router.userMessage).toBe('This token is not supported by the router')
    expect(cash.userMessage).toBe('Add Token support: Token not supported')
  })

  it('falls back to per-contract fallback for unknown revert names', () => {
    const c = classifyError(makeRevert('SomethingNobodyMapped'), { contract: 'Bank' })
    expect(c.userMessage).toBe('Bank action failed')
  })

  it('falls back to default when no contract given and name unknown', () => {
    const c = classifyError(makeRevert('ReallyUnknownError'))
    expect(c.userMessage).toBe('Transaction failed')
  })
})
