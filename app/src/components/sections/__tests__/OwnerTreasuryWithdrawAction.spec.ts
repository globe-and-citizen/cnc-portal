import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import OwnerTreasuryWithdrawAction from '../OwnerTreasuryWithdrawAction.vue'
import {
  mockBodAddAction,
  mockBodIsBodAction,
  mockCashRemunerationReads,
  mockCashRemunerationWrites,
  mockExpenseAccountReads,
  mockExpenseAccountWrites,
  mockTeamStore,
  // mockToast,
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

const stubs = {
  teleport: true,
  TokenAmount: defineComponent({
    emits: ['update:modelValue', 'validation'],
    data() {
      return {
        model: { amount: '0', tokenId: 'native' }
      }
    },
    methods: {
      emitModel() {
        this.$emit('update:modelValue', { ...this.model })
      },
      setToken(tokenId: string) {
        this.model.tokenId = tokenId
        this.emitModel()
      },
      setAmount(amount: string) {
        this.model.amount = amount
        this.emitModel()
      }
    },
    template: `
      <div>
        <button data-test="token-amount-valid" @click="$emit('validation', true)" />
        <button data-test="token-amount-native" @click="setToken('native')" />
        <button data-test="token-amount-usdc" @click="setToken('usdc')" />
        <button data-test="token-amount-sher" @click="setToken('sher')" />
        <button data-test="token-amount-unknown" @click="setToken('unknown')" />
        <button data-test="token-amount-amount-1" @click="setAmount('1')" />
        <slot name="label" />
      </div>
    `
  })
}

const createWrapper = (
  contractType: 'CashRemunerationEIP712' | 'ExpenseAccountEIP712' = 'CashRemunerationEIP712'
) => mount(OwnerTreasuryWithdrawAction, { props: { contractType }, global: { stubs } })

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

    mockCashRemunerationWrites.ownerWithdrawNative.executeWrite.mockResolvedValue('0xhash')
    mockCashRemunerationWrites.ownerWithdrawToken.executeWrite.mockResolvedValue('0xhash')
    mockExpenseAccountWrites.ownerWithdrawNative.executeWrite.mockResolvedValue('0xhash')
    mockExpenseAccountWrites.ownerWithdrawToken.executeWrite.mockResolvedValue('0xhash')

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

  it.skip('auto-selects first valid token when current one disappears', async () => {
    mockUseContractBalance.balances.value = [
      makeBalance('native', 5, 'ETH', 18, '0x0000000000000000000000000000000000000000')
    ]
    const wrapper = createWrapper('ExpenseAccountEIP712')
    mockUseContractBalance.balances.value = [
      makeBalance('usdc', 10, 'USDC', 6, '0xA3492D046095AFFE351cFac15de9b86425E235dB')
    ]
    await nextTick()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    expect(wrapper.text()).toContain('Balance: 10 USDC')
  })

  it.skip('opens and resets modal from emitted events', async () => {
    const wrapper = createWrapper()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="modal-close"]').trigger('click')
    await wrapper.get('[data-test="modal-reset"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="owner-withdraw-modal"]').exists()).toBe(false)
  })

  it.skip('submits native owner withdraw and handles confirmation refresh', async () => {
    const wrapper = createWrapper()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="token-amount-valid"]').trigger('click')
    await wrapper.get('[data-test="token-amount-amount-1"]').trigger('click')
    await wrapper.get('[data-test="owner-withdraw-submit"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.ownerWithdrawNative.executeWrite).toHaveBeenCalledWith(
      [1000000000000000000n],
      undefined,
      { skipGasEstimation: true }
    )
    mockCashRemunerationWrites.ownerWithdrawNative.receiptResult.isLoading.value = true
    await nextTick()
    mockCashRemunerationWrites.ownerWithdrawNative.receiptResult.isLoading.value = false
    await nextTick()
    // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Withdraw successful', color: 'success' })
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it.skip('submits token withdraw for expense and cash paths', async () => {
    const expense = createWrapper('ExpenseAccountEIP712')
    await expense.get('[data-test="owner-withdraw-button"]').trigger('click')
    await expense.get('[data-test="token-amount-valid"]').trigger('click')
    await expense.get('[data-test="token-amount-usdc"]').trigger('click')
    await expense.get('[data-test="token-amount-amount-1"]').trigger('click')
    await expense.get('[data-test="owner-withdraw-submit"]').trigger('click')

    const cash = createWrapper('CashRemunerationEIP712')
    await cash.get('[data-test="owner-withdraw-button"]').trigger('click')
    await cash.get('[data-test="token-amount-valid"]').trigger('click')
    await cash.get('[data-test="token-amount-sher"]').trigger('click')
    await cash.get('[data-test="token-amount-amount-1"]').trigger('click')
    await cash.get('[data-test="owner-withdraw-submit"]').trigger('click')
    await flushPromises()

    expect(mockExpenseAccountWrites.ownerWithdrawToken.executeWrite).toHaveBeenCalled()
    expect(mockCashRemunerationWrites.ownerWithdrawToken.executeWrite).toHaveBeenCalled()
  })

  it.skip('creates bod action for native withdraw and completes success watcher', async () => {
    mockUserStore.address = '0x00000000000000000000000000000000000000de'
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper()

    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="token-amount-valid"]').trigger('click')
    await wrapper.get('[data-test="token-amount-amount-1"]').trigger('click')
    await wrapper.get('[data-test="owner-withdraw-submit"]').trigger('click')
    await flushPromises()
    expect(mockBodAddAction.executeAddAction).toHaveBeenCalled()

    mockBodAddAction.isActionAdded.value = true
    await nextTick()
    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Action added successfully, waiting for board confirmation',
    //   color: 'success'
    // })
  })

  it.skip('covers early-return and error handling paths', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(
      () => undefined as unknown as string
    ) as unknown as typeof mockTeamStore.getContractAddressByType
    const wrapper = createWrapper()
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="token-amount-valid"]').trigger('click')
    await wrapper.get('[data-test="token-amount-unknown"]').trigger('click')
    await wrapper.get('[data-test="token-amount-amount-1"]').trigger('click')
    await wrapper.get('[data-test="owner-withdraw-submit"]').trigger('click')

    mockCashRemunerationWrites.ownerWithdrawNative.executeWrite.mockRejectedValueOnce({
      shortMessage: 'Short withdraw error'
    })
    mockTeamStore.getContractAddressByType = vi.fn(
      () => '0x6666666666666666666666666666666666666666'
    )
    const owner = createWrapper()
    await owner.get('[data-test="owner-withdraw-button"]').trigger('click')
    await owner.get('[data-test="token-amount-valid"]').trigger('click')
    await owner.get('[data-test="token-amount-amount-1"]').trigger('click')
    await owner.get('[data-test="owner-withdraw-submit"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.ownerWithdrawToken.executeWrite).not.toHaveBeenCalled()
    // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Short withdraw error', color: 'error' })
  })
})
