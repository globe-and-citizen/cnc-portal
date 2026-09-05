import { describe, it, expect } from 'vitest'
import {
  BaseError,
  RawContractError,
  UserRejectedRequestError,
  encodeErrorResult,
  parseAbi
} from 'viem'
import { describeWidgetError } from '../errorMessage'

const IERC20_ERRORS_ABI = parseAbi([
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)'
])
const BANK_ERRORS_ABI = parseAbi(['error Bank__UnsupportedToken(address token)'])

describe('describeWidgetError', () => {
  it('never dumps a non-Error thrown value as text', () => {
    expect(describeWidgetError({ some: 'object' })).toBe('An unexpected error occurred.')
    expect(describeWidgetError(undefined)).toBe('An unexpected error occurred.')
    expect(describeWidgetError('a plain string')).toBe('An unexpected error occurred.')
  })

  it('reports a plain Error message unchanged when it carries no chain context', () => {
    expect(describeWidgetError(new Error('No active wallet connection after connect/switch'))).toBe(
      'No active wallet connection after connect/switch'
    )
  })

  it('reports a cancelled wallet prompt clearly', () => {
    const err = new BaseError('rejected', { cause: new UserRejectedRequestError(new Error('x')) })
    expect(describeWidgetError(err)).toBe('Transaction was cancelled.')
  })

  it('decodes an ERC20InsufficientBalance revert from a raw call() with no ABI context', () => {
    const data = encodeErrorResult({
      abi: IERC20_ERRORS_ABI,
      errorName: 'ERC20InsufficientBalance',
      args: ['0x1111111111111111111111111111111111111111', 50n, 80n]
    })
    const raw = new RawContractError({ data, message: 'execution reverted' })

    expect(describeWidgetError(raw)).toBe(
      'Insufficient token balance — needs 80, only 50 available'
    )
  })

  it('decodes a Bank__* revert the same way', () => {
    const data = encodeErrorResult({
      abi: BANK_ERRORS_ABI,
      errorName: 'Bank__UnsupportedToken',
      args: ['0x2222222222222222222222222222222222222222']
    })
    const raw = new RawContractError({ data, message: 'execution reverted' })

    expect(describeWidgetError(raw)).toBe(
      'Token 0x2222222222222222222222222222222222222222 is not supported'
    )
  })

  it('falls back to a clean generic message when the revert selector is unrecognized', () => {
    const raw = new RawContractError({ data: '0xdeadbeef', message: 'execution reverted' })

    const result = describeWidgetError(raw)

    expect(result).not.toContain('0xdeadbeef')
    expect(result).toBe('Bank action failed')
  })
})
