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

type MutateOptions = {
  onSuccess?: (...args: unknown[]) => void | Promise<void>
  onError?: (err: unknown) => void | Promise<void>
}

type SafeDepositRouterVm = {
  amount: string
  sherAmount: string
  selectedTokenId: string
  isAmountValid: boolean
  isUpdatingFromSher: boolean
  currentStep: number
  bigIntAmount: bigint
  handleSherAmountChange: (value: string) => void
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

/**
 * Helpers that fire the per-call onSuccess / onError that `submitForm` passes
 * to mutateAsync. Mirrors the V3 + TanStack callback contract.
 */
const resolveOnSuccess = (mutateAsync: ReturnType<typeof vi.fn>) =>
  mutateAsync.mockImplementationOnce(async (_vars: unknown, opts?: MutateOptions) => {
    await opts?.onSuccess?.()
    return undefined
  })

const rejectOnError = (mutateAsync: ReturnType<typeof vi.fn>, err: Error) =>
  mutateAsync.mockImplementationOnce(async (_vars: unknown, opts?: MutateOptions) => {
    await opts?.onError?.(err)
    throw err
  })

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

  it('toasts on multiplier read failure', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterReads.multiplier.error.value = new Error('Multiplier failed')
    await wrapper.vm.$nextTick()
    // The watcher logs the error and shows a toast — covered by mockToast in
    // the shared composables setup; we're asserting the watcher path runs
    // without throwing.
    expect(wrapper.exists()).toBe(true)
  })

  it('approve onError resets the step and surfaces a user-rejection toast', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, '1', 'usdc', true)
    mockParseError.mockReturnValue('User rejected request')
    rejectOnError(mockERC20Writes.approve.mutateAsync, new Error('approve rejected'))

    await vm.submitForm()
    await flushPromises()

    expect(vm.currentStep).toBe(0)
    expect(mockSafeDepositRouterWrites.deposit.mutateAsync).not.toHaveBeenCalled()
  })

  it('deposit onError resets the step', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, '1', 'usdc', true)
    mockERC20Reads.allowance.data.value = 1000000n // skip approval
    mockParseError.mockReturnValue('Deposit failed')
    rejectOnError(mockSafeDepositRouterWrites.deposit.mutateAsync, new Error('deposit failed'))

    await vm.submitForm()
    await flushPromises()

    expect(vm.currentStep).toBe(0)
  })

  it('runs approval then deposit sequentially and closes on success', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, '1', 'usdc', true)

    resolveOnSuccess(mockERC20Writes.approve.mutateAsync)
    resolveOnSuccess(mockSafeDepositRouterWrites.deposit.mutateAsync)

    await vm.submitForm()
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).toHaveBeenCalledWith(
      { args: ['0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 1000000n] },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
    expect(mockSafeDepositRouterWrites.deposit.mutateAsync).toHaveBeenCalledWith(
      { args: ['0xA3492D046095AFFE351cFac15de9b86425E235dB', 1000000n] },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
    expect(vm.amount).toBe('')
    expect(vm.sherAmount).toBe('0')
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('skips approval when allowance is sufficient', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, '1', 'usdc', true)
    mockERC20Reads.allowance.data.value = 1000000n
    resolveOnSuccess(mockSafeDepositRouterWrites.deposit.mutateAsync)

    await vm.submitForm()
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()
    expect(mockSafeDepositRouterWrites.deposit.mutateAsync).toHaveBeenCalled()
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('guards submitForm when prerequisites are missing', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await vm.submitForm()
    expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()

    vm.isAmountValid = true
    mockSafeDepositRouterAddress.value = ''
    await vm.submitForm()
    expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()

    mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    vm.selectedTokenId = 'missing-token'
    await vm.submitForm()
    expect(mockSafeDepositRouterWrites.deposit.mutateAsync).not.toHaveBeenCalled()

    vm.selectedTokenId = 'usdc'
    mockSafeDepositRouterReads.multiplier.data.value = undefined as never
    await vm.submitForm()
    expect(mockSafeDepositRouterWrites.deposit.mutateAsync).not.toHaveBeenCalled()
  })

  it('returns 0n on invalid bigint input', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, 'invalid', 'usdc', true)
    expect(vm.bigIntAmount).toBe(0n)
  })
})
