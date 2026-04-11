import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import SafeDepositRouterForm from '../SafeDepositRouterForm.vue'
import {
  mockUseContractBalance,
  mockERC20Reads,
  mockERC20Writes,
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites,
  mockInvestorReads,
  mockParseError,
  resetComposableMocks,
  resetERC20Mocks,
  resetSafeDepositRouterMocks
} from '@/tests/mocks'

type SafeDepositRouterVm = {
  amount: string
  sherAmount: string
  selectedTokenId: string
  isAmountValid: boolean
  isUpdatingFromSher: boolean
  currentStep: number
  submitting: boolean
  bigIntAmount: bigint
  handleSherAmountChange: (value: string) => void
  performDeposit: () => Promise<void>
  submitForm: () => Promise<void>
  handleCancel: () => void
  reset: () => void
}

const createWrapper = () =>
  mount(SafeDepositRouterForm, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

const getVm = (wrapper: ReturnType<typeof createWrapper>) =>
  wrapper.vm as unknown as SafeDepositRouterVm

const setTokenAmount = async (
  wrapper: ReturnType<typeof createWrapper>,
  value: string,
  tokenId: string,
  isValid: boolean = true
) => {
  const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
  await tokenAmount.vm.$emit('update:modelValue', { amount: value, tokenId })
  await tokenAmount.vm.$emit('validation', isValid)
  await wrapper.vm.$nextTick()
}

describe('SafeDepositRouterForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetComposableMocks()
    resetERC20Mocks()
    resetSafeDepositRouterMocks()
    mockInvestorReads.symbol.data.value = 'SHER'
    mockUseContractBalance.balances.value = [
      {
        amount: 50,
        token: {
          id: 'usdc',
          name: 'USD Coin',
          symbol: 'USDC',
          code: 'USDC',
          coingeckoId: 'usd-coin',
          decimals: 6,
          address: '0xA3492D046095AFFE351cFac15de9b86425E235dB'
        },
        values: {
          USD: {
            value: 50,
            formated: '$50',
            id: 'usd',
            code: 'USD',
            symbol: '$',
            price: 1,
            formatedPrice: '$1'
          }
        }
      }
    ]
    mockERC20Reads.allowance.data.value = 0n
  })

  it('handles bidirectional amount calculations and cancel/reset paths', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    vm.handleSherAmountChange('')
    expect(vm.amount).toBe('0')
    expect(vm.isUpdatingFromSher).toBe(true)

    vm.isUpdatingFromSher = false
    vm.handleSherAmountChange('-1')
    expect(vm.amount).toBe('0')

    vm.handleSherAmountChange('10')
    expect(Number(vm.amount)).toBeGreaterThan(0)

    vm.currentStep = 2
    vm.handleCancel()
    await wrapper.vm.$nextTick()

    expect(vm.amount).toBe('')
    expect(vm.sherAmount).toBe('0')
    expect(vm.selectedTokenId).toBe('usdc')
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('reacts to multiplier and transaction errors with the right toast messages', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    mockSafeDepositRouterReads.multiplier.error.value = new Error('Multiplier failed')
    await wrapper.vm.$nextTick()

    vm.submitting = true
    vm.currentStep = 1
    mockParseError.mockReturnValueOnce('User rejected request')
    mockERC20Writes.approve.writeResult.error.value = new Error('approve rejected')
    await wrapper.vm.$nextTick()
    expect(vm.currentStep).toBe(0)

    vm.submitting = true
    vm.currentStep = 2
    mockParseError.mockReturnValueOnce('Deposit failed')
    mockSafeDepositRouterWrites.deposit.writeResult.error.value = new Error('deposit failed')
    await wrapper.vm.$nextTick()
    expect(vm.submitting).toBe(false)
  })

  it('deposits after approval success and closes after deposit receipt success', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, '1', 'usdc', true)
    vm.handleSherAmountChange('5')
    mockSafeDepositRouterWrites.deposit.executeWrite.mockResolvedValue(undefined)

    mockERC20Writes.approve.receiptResult.isSuccess.value = true
    await flushPromises()
    expect(mockSafeDepositRouterWrites.deposit.executeWrite).toHaveBeenCalled()

    mockSafeDepositRouterWrites.deposit.receiptResult.isSuccess.value = true
    await flushPromises()

    expect(vm.amount).toBe('')
    expect(vm.sherAmount).toBe('0')
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('guards submitForm when prerequisites are missing', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await vm.submitForm()
    expect(mockERC20Writes.approve.executeWrite).not.toHaveBeenCalled()

    vm.isAmountValid = true
    mockSafeDepositRouterAddress.value = ''
    await vm.submitForm()
    expect(mockERC20Writes.approve.executeWrite).not.toHaveBeenCalled()

    mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    vm.selectedTokenId = 'missing-token'
    await vm.submitForm()
    expect(mockSafeDepositRouterWrites.deposit.executeWrite).not.toHaveBeenCalled()

    vm.selectedTokenId = 'usdc'
    mockSafeDepositRouterReads.multiplier.data.value = undefined as never
    await vm.submitForm()
    expect(mockSafeDepositRouterWrites.deposit.executeWrite).not.toHaveBeenCalled()
  })

  it('runs approval when allowance is too low and deposits directly otherwise', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, '1', 'usdc', true)
    await vm.submitForm()
    await flushPromises()

    expect(mockERC20Writes.approve.executeWrite).toHaveBeenCalledWith([
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      1000000n
    ])
    expect(vm.currentStep).toBe(1)

    mockERC20Reads.allowance.data.value = 1000000n
    mockSafeDepositRouterWrites.deposit.executeWrite.mockResolvedValue(undefined)
    await vm.submitForm()
    await flushPromises()

    expect(mockSafeDepositRouterWrites.deposit.executeWrite).toHaveBeenCalledWith(
      '0xA3492D046095AFFE351cFac15de9b86425E235dB',
      1000000n
    )
    expect(vm.currentStep).toBe(2)
  })

  it('handles execution exceptions and bigint parsing fallback', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, 'invalid', 'usdc', true)
    expect(vm.bigIntAmount).toBe(0n)

    mockSafeDepositRouterWrites.deposit.executeWrite.mockRejectedValueOnce(
      new Error('deposit boom')
    )
    await vm.performDeposit()

    mockERC20Writes.approve.executeWrite.mockRejectedValueOnce(new Error('approve boom'))
    await setTokenAmount(wrapper, '1', 'usdc', true)
    mockERC20Reads.allowance.data.value = 0n
    await vm.submitForm()
    await flushPromises()

    expect(mockSafeDepositRouterWrites.deposit.executeWrite).toHaveBeenCalledTimes(1)
  })
})
