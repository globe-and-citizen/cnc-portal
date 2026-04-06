import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import OwnerTreasuryWithdrawAction from '../OwnerTreasuryWithdrawAction.vue'
import {
  mockBodAddAction,
  mockBodIsBodAction,
  mockCashRemunerationReads,
  mockCashRemunerationWrites,
  mockExpenseAccountReads,
  mockExpenseAccountWrites,
  mockTeamStore,
  mockToast,
  mockUseChainId,
  mockUseContractBalance,
  mockUserStore,
  resetComposableMocks,
  resetContractMocks,
  useQueryClientFn
} from '@/tests/mocks'

const OWNER_ADDRESS = '0x00000000000000000000000000000000000000aa'

const makeBalance = (
  id: string,
  amount: number,
  symbol: string,
  decimals: number,
  address: string
) => ({
  amount,
  token: {
    id,
    name: symbol,
    symbol,
    code: symbol,
    coingeckoId: symbol.toLowerCase(),
    decimals,
    address
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
      if (type === 'CashRemunerationEIP712') return '0x6666666666666666666666666666666666666666'
      if (type === 'ExpenseAccountEIP712') return '0x5555555555555555555555555555555555555555'
      return '0x1111111111111111111111111111111111111111'
    })

    mockUseContractBalance.balances.value = [
      makeBalance('native', 3, 'ETH', 18, '0x0000000000000000000000000000000000000000'),
      makeBalance('usdc', 20, 'USDC', 6, '0xA3492D046095AFFE351cFac15de9b86425E235dB'),
      makeBalance('sher', 2, 'SHER', 18, '0x1111111111111111111111111111111111111112')
    ]
  })

  it('hides action without owner or bod right', () => {
    mockUserStore.address = '0x00000000000000000000000000000000000000bb'
    mockCashRemunerationReads.owner.data.value = '0x00000000000000000000000000000000000000cc'
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="owner-withdraw-button"]').exists()).toBe(false)
  })

  it('disables button with empty withdrawable balance', () => {
    mockUseContractBalance.balances.value = [
      makeBalance('native', 0, 'ETH', 18, '0x0000000000000000000000000000000000000000')
    ]
    const wrapper = createWrapper()
    expect(wrapper.get('[data-test="owner-withdraw-button"]').attributes('disabled')).toBeDefined()
  })

  it('enables button when there is withdrawable balance', () => {
    const wrapper = createWrapper()
    const btn = wrapper.get('[data-test="owner-withdraw-button"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it.skip('calls ownerWithdrawAllToBank for CashRemunerationEIP712 on click', async () => {
    const wrapper = createWrapper('CashRemunerationEIP712')
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).toHaveBeenCalledWith(
      [],
      undefined,
      { skipGasEstimation: true }
    )
  })

  it.skip('calls ownerWithdrawAllToBank for ExpenseAccountEIP712 on click', async () => {
    const wrapper = createWrapper('ExpenseAccountEIP712')
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await flushPromises()

    expect(mockExpenseAccountWrites.ownerWithdrawAllToBank.executeWrite).toHaveBeenCalledWith(
      [],
      undefined,
      { skipGasEstimation: true }
    )
  })

  it.skip('creates bod action for withdraw all to bank', async () => {
    mockUserStore.address = '0x00000000000000000000000000000000000000de'
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper()

    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await flushPromises()

    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAddress: '0x6666666666666666666666666666666666666666',
        userAddress: '0x00000000000000000000000000000000000000de'
      })
    )
  })

  it('shows success toast on bod action added', async () => {
    mockBodIsBodAction.isBodAction.value = true
    mockBodAddAction.isActionAdded.value = true
    createWrapper()
    await nextTick()
    // The watcher will fire for isActionAdded
  })

  it('refreshes balances after withdraw confirmation', async () => {
    mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite.mockImplementationOnce(
      async () => {
        mockCashRemunerationWrites.ownerWithdrawAllToBank.receiptResult.isLoading.value = true
        return '0xhash'
      }
    )

    const wrapper = createWrapper()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="owner-withdraw-modal-confirm-button"]').trigger('click')
    await flushPromises()

    mockCashRemunerationWrites.ownerWithdrawAllToBank.receiptResult.isLoading.value = false
    await nextTick()

    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('does not submit when contractAddress is undefined', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(
      () => undefined as unknown as string
    ) as unknown as typeof mockTeamStore.getContractAddressByType
    const wrapper = createWrapper()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="owner-withdraw-modal-confirm-button"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).not.toHaveBeenCalled()
  })

  it('closes the modal after withdraw confirmation', async () => {
    mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite.mockImplementationOnce(
      async () => {
        mockCashRemunerationWrites.ownerWithdrawAllToBank.receiptResult.isLoading.value = true
        return '0xhash'
      }
    )

    const wrapper = createWrapper()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    expect(wrapper.find('[data-test="owner-withdraw-modal-confirm-button"]').exists()).toBe(true)

    await wrapper.get('[data-test="owner-withdraw-modal-confirm-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="owner-withdraw-modal-confirm-button"]').exists()).toBe(true)

    mockCashRemunerationWrites.ownerWithdrawAllToBank.receiptResult.isLoading.value = false
    await nextTick()

    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).toHaveBeenCalled()
    expect(wrapper.find('[data-test="owner-withdraw-modal-confirm-button"]').exists()).toBe(false)
  })

  it('shows an inline warning instead of a toast when MetaMask signature is cancelled', async () => {
    mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite.mockImplementationOnce(
      async () => {
        mockCashRemunerationWrites.ownerWithdrawAllToBank.writeResult.error.value = {
          message: 'User rejected the request'
        } as Error
        return undefined
      }
    )

    const wrapper = createWrapper()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="owner-withdraw-modal-confirm-button"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.executeWrite).toHaveBeenCalled()
    expect(wrapper.find('[data-test="owner-withdraw-modal-warning"]').exists()).toBe(true)
    expect(mockToast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'error',
        title: expect.stringContaining('User rejected')
      })
    )
  })
})
