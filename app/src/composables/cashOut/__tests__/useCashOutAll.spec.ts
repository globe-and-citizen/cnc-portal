import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BaseError, UserRejectedRequestError } from 'viem'
import { useCashOutAll } from '../useCashOutAll'
import { useTransfer, useTransferToken } from '@/composables/bank/writes'
import { useOwnerWithdrawAllToBank as useExpenseOwnerWithdrawAll } from '@/composables/expenseAccount/writes'
import { useOwnerWithdrawAllToBank as useCashOwnerWithdrawAll } from '@/composables/cashRemuneration/writes'
import {
  mockBankWrites,
  mockCashRemunerationWrites,
  mockExpenseAccountWrites,
  mockTeamStore,
  mockUserStore,
  mockWagmiCore,
  useQueryClientFn
} from '@/tests/mocks'
import { buildCashOutPlan } from '../plan'

const BANK_ADDRESS = '0x1111111111111111111111111111111111111111'
const RECIPIENT = '0x00000000000000000000000000000000000000aa'
const LEGACY_BANK = '0x00000000000000000000000000000000000000b1'
const LEGACY_EXPENSE = '0x00000000000000000000000000000000000000b2'
const LEGACY_CASH_REM = '0x00000000000000000000000000000000000000b3'

const fullPlan = () => buildCashOutPlan({ cashRemuneration: 5, expense: 5, bank: 5 })

const nativeBalance = (value: bigint) => ({
  value,
  decimals: 18,
  formatted: '0',
  symbol: 'ETH'
})

describe('useCashOutAll', () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateQueries.mockClear()
    useQueryClientFn.mockReturnValue({
      invalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
    mockUserStore.address = RECIPIENT
    mockTeamStore.getContractAddressByType = vi.fn((type) =>
      type === 'Bank' ? BANK_ADDRESS : '0x2222222222222222222222222222222222222222'
    )
    mockCashRemunerationWrites.ownerWithdrawAllToBank.mutateAsync.mockResolvedValue(undefined)
    mockExpenseAccountWrites.ownerWithdrawAllToBank.mutateAsync.mockResolvedValue(undefined)
    mockBankWrites.transfer.mutateAsync.mockResolvedValue(undefined)
    mockBankWrites.transferToken.mutateAsync.mockResolvedValue(undefined)
    mockWagmiCore.getBalance.mockResolvedValue(nativeBalance(5n))
    mockWagmiCore.readContract.mockResolvedValue(1000n)
  })

  it('runs the three accounts in order and ends complete', async () => {
    const flow = useCashOutAll()
    await flow.start(fullPlan())

    expect(flow.steps.value.map((s) => s.status)).toEqual(['success', 'success', 'success'])
    expect(flow.isComplete.value).toBe(true)
    expect(flow.hasFailed.value).toBe(false)
    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.mutateAsync).toHaveBeenCalledWith({
      args: []
    })
    expect(mockExpenseAccountWrites.ownerWithdrawAllToBank.mutateAsync).toHaveBeenCalledWith({
      args: []
    })
    expect(invalidateQueries).toHaveBeenCalledTimes(1)
  })

  it('forwards the Bank native balance then every held ERC-20 to the owner', async () => {
    const flow = useCashOutAll()
    await flow.start(fullPlan())

    expect(mockBankWrites.transfer.mutateAsync).toHaveBeenCalledWith({ args: [RECIPIENT, 5n] })
    // Two supported ERC-20 tokens (USDC, USDCe), each with a positive balance.
    expect(mockBankWrites.transferToken.mutateAsync).toHaveBeenCalledTimes(2)
    expect(mockBankWrites.transferToken.mutateAsync).toHaveBeenCalledWith({
      args: [expect.any(String), RECIPIENT, 1000n]
    })
  })

  it('skips Bank assets that have a zero balance', async () => {
    mockWagmiCore.getBalance.mockResolvedValue(nativeBalance(0n))
    mockWagmiCore.readContract.mockResolvedValue(0n)

    const flow = useCashOutAll()
    await flow.start(fullPlan())

    expect(mockBankWrites.transfer.mutateAsync).not.toHaveBeenCalled()
    expect(mockBankWrites.transferToken.mutateAsync).not.toHaveBeenCalled()
    expect(flow.isComplete.value).toBe(true)
  })

  it('stops on a failing step, marks it failed and leaves the rest pending', async () => {
    mockExpenseAccountWrites.ownerWithdrawAllToBank.mutateAsync.mockRejectedValueOnce(
      new Error('RPC node unavailable')
    )

    const flow = useCashOutAll()
    await flow.start(fullPlan())

    expect(flow.steps.value.map((s) => s.status)).toEqual(['success', 'failed', 'pending'])
    expect(flow.failedStep.value?.key).toBe('expense')
    expect(flow.steps.value[1].error).toContain('RPC node unavailable')
    expect(mockBankWrites.transfer.mutateAsync).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('shows a friendly message when the wallet rejects the request', async () => {
    mockCashRemunerationWrites.ownerWithdrawAllToBank.mutateAsync.mockRejectedValueOnce(
      new BaseError('rejected', { cause: new UserRejectedRequestError(new Error('rejected')) })
    )

    const flow = useCashOutAll()
    await flow.start(fullPlan())

    expect(flow.steps.value[0].status).toBe('failed')
    expect(flow.steps.value[0].error).toBe('You rejected the request.')
  })

  it('resumes from the failed step on retry and completes', async () => {
    mockExpenseAccountWrites.ownerWithdrawAllToBank.mutateAsync
      .mockRejectedValueOnce(new Error('RPC node unavailable'))
      .mockResolvedValueOnce(undefined)

    const flow = useCashOutAll()
    await flow.start(fullPlan())
    expect(flow.hasFailed.value).toBe(true)

    await flow.retry()

    expect(flow.steps.value.map((s) => s.status)).toEqual(['success', 'success', 'success'])
    expect(flow.isComplete.value).toBe(true)
    // Cash step is not re-run on retry — only expense (1 fail + 1 success) and bank.
    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.mutateAsync).toHaveBeenCalledTimes(1)
    expect(mockExpenseAccountWrites.ownerWithdrawAllToBank.mutateAsync).toHaveBeenCalledTimes(2)
  })

  it('does nothing for an empty plan', async () => {
    const flow = useCashOutAll()
    await flow.start([])

    expect(flow.steps.value).toEqual([])
    expect(flow.isComplete.value).toBe(false)
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('reset clears the run state', async () => {
    const flow = useCashOutAll()
    await flow.start(fullPlan())
    flow.reset()

    expect(flow.steps.value).toEqual([])
    expect(flow.currentIndex.value).toBe(0)
    expect(flow.isRunning.value).toBe(false)
  })

  describe('with an explicit generation and recipient', () => {
    const legacyFlow = () =>
      useCashOutAll({
        sources: {
          bank: LEGACY_BANK,
          expense: LEGACY_EXPENSE,
          cashRemuneration: LEGACY_CASH_REM
        },
        to: BANK_ADDRESS
      })

    it('points every contract write at the supplied generation', () => {
      legacyFlow()

      const addressOf = (mock: { mock: { calls: unknown[][] } }) => mock.mock.calls[0][0]
      expect(addressOf(vi.mocked(useCashOwnerWithdrawAll))).toBe(LEGACY_CASH_REM)
      expect(addressOf(vi.mocked(useExpenseOwnerWithdrawAll))).toBe(LEGACY_EXPENSE)
      // Bank writes resolve the address through a computed, so assert its value.
      expect(vi.mocked(useTransfer).mock.calls[0][0]).toHaveProperty('value', LEGACY_BANK)
      expect(vi.mocked(useTransferToken).mock.calls[0][0]).toHaveProperty('value', LEGACY_BANK)
    })

    it('reads the supplied Bank balances and forwards them to the recipient', async () => {
      await legacyFlow().start(fullPlan())

      expect(mockWagmiCore.getBalance).toHaveBeenCalledWith(expect.anything(), {
        address: LEGACY_BANK
      })
      expect(mockWagmiCore.readContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ functionName: 'balanceOf', args: [LEGACY_BANK] })
      )
      expect(mockBankWrites.transfer.mutateAsync).toHaveBeenCalledWith({
        args: [BANK_ADDRESS, 5n]
      })
      expect(mockBankWrites.transferToken.mutateAsync).toHaveBeenCalledWith({
        args: [expect.any(String), BANK_ADDRESS, 1000n]
      })
    })

    it('never touches the current generation or the connected wallet', async () => {
      await legacyFlow().start(fullPlan())

      expect(mockWagmiCore.getBalance).not.toHaveBeenCalledWith(expect.anything(), {
        address: BANK_ADDRESS
      })
      expect(mockBankWrites.transfer.mutateAsync).not.toHaveBeenCalledWith({
        args: [RECIPIENT, 5n]
      })
    })
  })
})
