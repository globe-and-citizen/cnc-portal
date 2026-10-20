import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseError, UserRejectedRequestError } from 'viem'

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  setTag: vi.fn(),
  withScope: vi.fn()
}))

vi.mock('@sentry/vue', () => sentryMocks)

import { captureWeb3Error, shouldCaptureWeb3Error } from '../sentry'

describe('Web3 Sentry capture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sentryMocks.withScope.mockImplementation((callback) => callback({ setTag: sentryMocks.setTag }))
  })

  it('captures unexpected viem failures with Web3 context tags', () => {
    const error = new BaseError('RPC unavailable')

    captureWeb3Error(error, {
      operation: 'contract-write',
      contractAddress: '0x1111111111111111111111111111111111111111',
      functionName: 'pause',
      chainId: 31337
    })

    expect(sentryMocks.captureException).toHaveBeenCalledWith(error)
    expect(sentryMocks.setTag).toHaveBeenCalledWith('runtime', 'frontend')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('error.source', 'wagmi')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('error.operation', 'contract-write')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('web3.error_category', 'unknown')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('web3.function_name', 'pause')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('web3.chain_id', '31337')
  })

  it('does not capture an explicit wallet rejection', () => {
    const error = new BaseError('Transaction rejected', {
      cause: new UserRejectedRequestError(new Error('User rejected the request'))
    })

    expect(shouldCaptureWeb3Error(error)).toBe(false)
    captureWeb3Error(error, { operation: 'contract-write', force: true })

    expect(sentryMocks.captureException).not.toHaveBeenCalled()
  })

  it('does not capture a plain application error without a Web3 boundary', () => {
    const error = new Error('Validation failed')

    expect(shouldCaptureWeb3Error(error)).toBe(false)
    captureWeb3Error(error, { operation: 'mutation' })

    expect(sentryMocks.captureException).not.toHaveBeenCalled()
  })

  it('captures a plain error when it comes from a known Web3 boundary', () => {
    const error = new Error('Transaction receipt was unsuccessful')

    captureWeb3Error(error, { operation: 'native-transfer', force: true })

    expect(sentryMocks.captureException).toHaveBeenCalledWith(error)
    expect(sentryMocks.setTag).toHaveBeenCalledWith('error.operation', 'native-transfer')
  })

  it('captures the same error instance only once across Web3 boundaries', () => {
    const error = new BaseError('RPC unavailable')

    captureWeb3Error(error, { operation: 'contract-write', force: true })
    captureWeb3Error(error, { operation: 'mutation' })

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1)
  })
})
