import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OwnerTreasuryWithdrawAction from '../OwnerTreasuryWithdrawAction.vue'
import {
  mockBodAddAction,
  mockBodIsBodAction,
  mockCashRemunerationReads,
  mockCashRemunerationWrites,
  mockExpenseAccountReads,
  mockExpenseAccountWrites,
  mockTeamStore,
  mockUseChainId,
  mockUseContractBalance,
  mockUserStore,
  resetComposableMocks,
  resetContractMocks,
  useQueryClientFn
} from '@/tests/mocks'

const OWNER_ADDRESS = '0x00000000000000000000000000000000000000aa'
const NON_OWNER_ADDRESS = '0x00000000000000000000000000000000000000bb'
const CASH_ADDRESS = '0x6666666666666666666666666666666666666666'
const EXPENSE_ADDRESS = '0x5555555555555555555555555555555555555555'
const BUTTON = '[data-test="owner-withdraw-button"]'
const CONFIRM = '[data-test="owner-withdraw-modal-confirm-button"]'
const WARNING = '[data-test="owner-withdraw-modal-warning"]'

const makeBalance = (amount: number) => ({
  amount,
  token: {
    id: 'native',
    name: 'ETH',
    symbol: 'ETH',
    code: 'ETH',
    coingeckoId: 'ethereum',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000'
  },
  values: {
    USD: {
      value: amount,
      formated: `$${amount}`,
      id: 'usd',
      code: 'USD',
      symbol: '$',
      price: 1,
      formatedPrice: '$1'
    }
  }
})

const createWrapper = (
  contractType: 'CashRemunerationEIP712' | 'ExpenseAccountEIP712' = 'CashRemunerationEIP712'
) =>
  mount(OwnerTreasuryWithdrawAction, {
    props: { contractType },
    global: { stubs: { teleport: true } }
  })

const openModal = async (wrapper: ReturnType<typeof createWrapper>) => {
  await wrapper.get(BUTTON).trigger('click')
}

const submit = async (
  contractType: 'CashRemunerationEIP712' | 'ExpenseAccountEIP712' = 'CashRemunerationEIP712'
) => {
  const wrapper = createWrapper(contractType)
  await openModal(wrapper)
  await wrapper.get(CONFIRM).trigger('click')
  await flushPromises()
  return wrapper
}

const simulatePendingReceipt = (
  write: typeof mockCashRemunerationWrites.ownerWithdrawAllToBank
) => {
  write.executeWrite.mockImplementationOnce(async () => {
    write.receiptResult.isLoading.value = true
    return '0xhash'
  })
}

const simulateReturnedError = (error: unknown) => {
  mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite.mockImplementationOnce(
    async () => {
      mockCashRemunerationWrites.ownerWithdrawAllToBank.writeResult.error.value = error as Error
      return undefined
    }
  )
}

describe('OwnerTreasuryWithdrawAction', () => {
  const invalidateQueries = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    resetContractMocks()
    resetComposableMocks()
    vi.mocked(useQueryClientFn).mockReturnValue({
      invalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
    mockUseChainId.value = 11155111
    mockUserStore.address = OWNER_ADDRESS.toLowerCase()
    mockCashRemunerationReads.owner.data.value = OWNER_ADDRESS
    mockExpenseAccountReads.owner.data.value = OWNER_ADDRESS
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isActionAdded.value = false
    mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite.mockResolvedValue('0xhash')
    mockExpenseAccountWrites.ownerWithdrawAllToBank.executeWrite.mockResolvedValue('0xhash')
    mockTeamStore.getContractAddressByType = vi.fn((type) => {
      if (type === 'CashRemunerationEIP712') return CASH_ADDRESS
      if (type === 'ExpenseAccountEIP712') return EXPENSE_ADDRESS
      return '0x1111111111111111111111111111111111111111'
    })
    mockUseContractBalance.balances.value = [makeBalance(3)]
  })

  it('applies visibility and balance rules before any withdrawal', () => {
    mockUserStore.address = NON_OWNER_ADDRESS
    mockCashRemunerationReads.owner.data.value = '0x00000000000000000000000000000000000000cc'
    expect(createWrapper().find(BUTTON).exists()).toBe(false)

    mockUserStore.address = ''
    mockCashRemunerationReads.owner.data.value = OWNER_ADDRESS
    expect(createWrapper().find(BUTTON).exists()).toBe(false)

    mockUserStore.address = OWNER_ADDRESS.toLowerCase()
    mockUseContractBalance.balances.value = [makeBalance(0)]
    expect(createWrapper().get(BUTTON).attributes('disabled')).toBeDefined()

    mockUseContractBalance.balances.value = [makeBalance(3)]
    expect(createWrapper().get(BUTTON).attributes('disabled')).toBeUndefined()
  })

  it('opens and closes the modal through the UModal v-model', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)
    expect(wrapper.find(CONFIRM).exists()).toBe(true)
    await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', false)
    await flushPromises()
    expect(wrapper.find(CONFIRM).exists()).toBe(false)
  })

  it('closes the modal when a BOD action is added', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper()
    await openModal(wrapper)
    mockBodAddAction.isActionAdded.value = true
    await flushPromises()
    expect(wrapper.find(CONFIRM).exists()).toBe(false)
  })

  it('does not submit without a resolved contract address', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(
      () => undefined as unknown as string
    ) as unknown as typeof mockTeamStore.getContractAddressByType
    await submit()
    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).not.toHaveBeenCalled()
  })

  it('refreshes balances and closes the modal after a successful cash withdrawal', async () => {
    simulatePendingReceipt(mockCashRemunerationWrites.ownerWithdrawAllToBank)
    const wrapper = createWrapper()
    await openModal(wrapper)
    await wrapper.get(CONFIRM).trigger('click')
    await flushPromises()
    expect(wrapper.find(CONFIRM).exists()).toBe(true)

    mockCashRemunerationWrites.ownerWithdrawAllToBank.receiptResult.isLoading.value = false
    await flushPromises()

    expect(invalidateQueries).toHaveBeenCalled()
    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).toHaveBeenCalled()
    expect(wrapper.find(CONFIRM).exists()).toBe(false)
  })

  it('uses the expense account writer for direct expense withdrawals', async () => {
    await submit('ExpenseAccountEIP712')
    expect(mockExpenseAccountWrites.ownerWithdrawAllToBank.executeWrite).toHaveBeenCalledWith(
      [],
      undefined,
      { skipGasEstimation: true }
    )
    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).not.toHaveBeenCalled()
  })

  it.each([
    ['ExpenseAccountEIP712', EXPENSE_ADDRESS, mockExpenseAccountWrites.ownerWithdrawAllToBank],
    ['CashRemunerationEIP712', CASH_ADDRESS, mockCashRemunerationWrites.ownerWithdrawAllToBank]
  ] as const)(
    'routes %s withdrawals through BOD action creation',
    async (contractType, targetAddress, write) => {
      mockBodIsBodAction.isBodAction.value = true
      mockUserStore.address = NON_OWNER_ADDRESS
      mockBodAddAction.executeAddAction.mockResolvedValue(undefined)

      await submit(contractType)

      expect(mockBodAddAction.executeAddAction).toHaveBeenCalledWith(
        expect.objectContaining({
          targetAddress,
          userAddress: NON_OWNER_ADDRESS,
          description: expect.stringContaining('Owner Treasury Withdraw All to Bank'),
          data: expect.any(String)
        })
      )
      expect(write.executeWrite).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['returned message', () => simulateReturnedError({ message: 'User rejected the request' })],
    [
      'returned shortMessage',
      () => simulateReturnedError({ shortMessage: 'User denied transaction signature' })
    ],
    [
      'thrown shortMessage',
      () =>
        mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite.mockRejectedValueOnce({
          shortMessage: 'cancelled in MetaMask'
        })
    ]
  ])('shows an inline warning for %s user cancellations', async (_, setup) => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setup()
    const wrapper = await submit()
    expect(wrapper.find(WARNING).text()).toContain('Owner rejected the request.')
    consoleErrorSpy.mockRestore()
  })

  it.each([
    ['string response error', () => simulateReturnedError('rpc aborted')],
    ['object response error', () => simulateReturnedError({ code: 4001 })]
  ])('keeps the inline warning hidden for %s', async (_, setup) => {
    setup()
    const wrapper = await submit()
    expect(wrapper.find(WARNING).exists()).toBe(false)
    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).toHaveBeenCalled()
  })

  it('keeps the inline warning hidden for unexpected thrown errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite.mockRejectedValueOnce(
      new Error('RPC node unavailable')
    )
    const wrapper = await submit()
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(wrapper.find(WARNING).exists()).toBe(false)
    consoleErrorSpy.mockRestore()
  })
})
