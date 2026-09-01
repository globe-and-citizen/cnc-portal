import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  call,
  connect,
  getConnection,
  readContract,
  sendTransaction,
  simulateContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract
} from '@wagmi/core'
import { payWithWidget } from '../payment'
import { widgetChain } from '../wagmiConfig'

// `@wagmi/core` is globally mocked (src/tests/setup/wagmi.vue.setup.ts) —
// these are that same shared mock, configured per test.

const BANK_ADDRESS = '0x1111111111111111111111111111111111111111'
const TOKEN_ADDRESS = '0x2222222222222222222222222222222222222222'
const ACCOUNT = '0x3333333333333333333333333333333333333333'
const AMOUNT = 10_000_000n

const baseParams = {
  bankAddress: BANK_ADDRESS,
  tokenAddress: TOKEN_ADDRESS,
  amount: AMOUNT,
  factureId: 'order_1'
} as const

function mockConnected(address: string) {
  vi.mocked(getConnection).mockReturnValue({
    isConnected: true,
    address,
    chainId: widgetChain.id
  } as never)
}

function mockConnectedWithNoAddress() {
  vi.mocked(getConnection).mockReturnValue({
    isConnected: true,
    address: undefined,
    chainId: widgetChain.id
  } as never)
}

describe('payWithWidget', () => {
  beforeEach(() => {
    mockConnected(ACCOUNT)
    // No existing allowance by default — forces the approve branch; tests
    // that don't care about approve behavior still exercise it, same as a
    // first-time payer would.
    vi.mocked(readContract).mockResolvedValue(0n as never)
    vi.mocked(simulateContract).mockResolvedValue({ request: {} } as never)
    vi.mocked(writeContract).mockResolvedValue('0xapprovehash' as never)
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({ status: 'success' } as never)
    vi.mocked(call).mockResolvedValue({} as never)
    vi.mocked(sendTransaction).mockResolvedValue('0xpayhash' as never)
  })

  it('walks through connecting -> approving -> paying -> success and submits the payment', async () => {
    const onStatus = vi.fn()

    const result = await payWithWidget(baseParams, onStatus)

    expect(onStatus.mock.calls.map((call) => call[0])).toEqual([
      'connecting',
      'approving',
      'paying',
      'success'
    ])
    expect(switchChain).toHaveBeenCalledWith(expect.anything(), { chainId: widgetChain.id })
    expect(simulateContract).toHaveBeenCalled()
    expect(writeContract).toHaveBeenCalled()
    expect(sendTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ account: ACCOUNT, to: BANK_ADDRESS, chainId: widgetChain.id })
    )
    expect(result).toEqual({ hash: '0xpayhash' })
  })

  it('does not call connect when the wallet is already connected', async () => {
    await payWithWidget(baseParams)

    expect(connect).not.toHaveBeenCalled()
  })

  it('connects first when the wallet is not yet connected', async () => {
    vi.mocked(getConnection)
      .mockReturnValueOnce({ isConnected: false } as never)
      .mockReturnValue({ isConnected: true, address: ACCOUNT, chainId: widgetChain.id } as never)

    await payWithWidget(baseParams)

    expect(connect).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chainId: widgetChain.id })
    )
  })

  it('skips the approve step when the existing allowance already covers the amount', async () => {
    vi.mocked(readContract).mockResolvedValue(AMOUNT as never)

    await payWithWidget(baseParams)

    expect(simulateContract).not.toHaveBeenCalled()
    expect(writeContract).not.toHaveBeenCalled()
  })

  it('throws when no address is available after connect/switch', async () => {
    mockConnectedWithNoAddress()

    await expect(payWithWidget(baseParams)).rejects.toThrow(
      'No active wallet connection after connect/switch'
    )
  })

  it('reports failed and throws without returning a result when the transaction reverts on-chain', async () => {
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({ status: 'reverted' } as never)
    const onStatus = vi.fn()

    await expect(payWithWidget(baseParams, onStatus)).rejects.toThrow(
      'Payment transaction reverted on-chain'
    )

    expect(onStatus).toHaveBeenCalledWith('failed')
    expect(onStatus).not.toHaveBeenCalledWith('success')
  })
})
