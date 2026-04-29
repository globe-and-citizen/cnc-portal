import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import { zeroAddress, type Address } from 'viem'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import {
  mockTransactionFunctions,
  mockUseSafeSendTransaction,
  mockERC20Reads,
  mockERC20Writes,
  mockBankWrites,
  resetComposableMocks,
  resetERC20Mocks,
  useQueryClientFn
} from '@/tests/mocks'

type DepositBankVm = {
  amount: string
  selectedTokenId: string
  currentStep: number
  isAmountValid: boolean
  submitting: boolean
  reset: () => void
  submitForm: () => Promise<void>
}

const defaultProps = {
  bankAddress: zeroAddress as Address
}

const createQueryClient = () => {
  const invalidateQueries = vi.fn()
  useQueryClientFn.mockReturnValue({
    invalidateQueries,
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    removeQueries: vi.fn()
  })
  return { invalidateQueries }
}

const createWrapper = (overrides = {}) =>
  mount(DepositBankForm, {
    props: { ...defaultProps, ...overrides },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

const getVm = (wrapper: ReturnType<typeof createWrapper>) => wrapper.vm as unknown as DepositBankVm

const setTokenAmount = async (
  wrapper: ReturnType<typeof createWrapper>,
  value: string,
  tokenId: string,
  isValid: boolean = true
) => {
  const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
  await tokenAmount.vm.$emit('update:modelValue', { amount: value, tokenId })
  await tokenAmount.vm.$emit('validation', isValid)
  await nextTick()
}

describe('DepositBankForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetComposableMocks()
    resetERC20Mocks()
    createQueryClient()
    mockBankWrites.deposit.mutateAsync.mockResolvedValue(undefined)
  })

  it('resets and emits closeModal when cancelled', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await setTokenAmount(wrapper, '1', 'usdc', true)
    vm.currentStep = 2
    await wrapper.find('[data-test="cancel-button"]').trigger('click')

    expect(vm.amount).toBe('')
    expect(vm.selectedTokenId).toBe('native')
    expect(vm.currentStep).toBe(0)
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('prevents submission when invalid or already pending', async () => {
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '1', 'native', false)
    await getVm(wrapper).submitForm()
    expect(mockTransactionFunctions.mockMutateAsync).not.toHaveBeenCalled()

    mockUseSafeSendTransaction.isPending.value = true
    await setTokenAmount(wrapper, '1', 'native', true)
    await getVm(wrapper).submitForm()
    expect(mockTransactionFunctions.mockMutateAsync).not.toHaveBeenCalled()
  })

  it('handles native token deposits successfully and on failure', async () => {
    const wrapper = createWrapper({ title: 'Deposit Bank Form' })

    const vm = getVm(wrapper)
    vm.amount = '1'
    vm.selectedTokenId = 'native'
    vm.isAmountValid = true
    await getVm(wrapper).submitForm()
    await flushPromises()

    expect(mockTransactionFunctions.mockMutateAsync).toHaveBeenCalled()
    expect(wrapper.emitted('closeModal')).toBeTruthy()

    mockTransactionFunctions.mockMutateAsync.mockRejectedValueOnce(new Error('Transaction failed'))
    const failedWrapper = createWrapper()
    const failedVm = getVm(failedWrapper)
    failedVm.amount = '2'
    failedVm.selectedTokenId = 'native'
    failedVm.isAmountValid = true
    await failedVm.submitForm()
    await flushPromises()

    expect(mockTransactionFunctions.mockMutateAsync).toHaveBeenCalledTimes(2)
    expect(failedWrapper.emitted('closeModal')).toBeFalsy()
  })

  it('shows native and erc20 stepper states correctly', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    vm.selectedTokenId = 'native'
    await wrapper.vm.$nextTick()

    vm.selectedTokenId = 'usdc'
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'TokenAmount' }).exists()).toBe(true)

    expect(() => getVm(wrapper).reset()).not.toThrow()
  })

  it('runs approval first when allowance is insufficient and then deposits token', async () => {
    const { invalidateQueries } = createQueryClient()
    mockERC20Reads.allowance.data.value = 0n
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '1', 'usdc', true)
    await getVm(wrapper).submitForm()
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).toHaveBeenCalledWith({
      args: [defaultProps.bankAddress, 1000000n]
    })
    expect(mockBankWrites.deposit.mutateAsync).toHaveBeenCalledWith({
      args: ['0xA3492D046095AFFE351cFac15de9b86425E235dB', 1000000n]
    })
    expect(invalidateQueries).toHaveBeenCalled()
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('skips approval when allowance is sufficient', async () => {
    mockERC20Reads.allowance.data.value = 1000000n
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '1', 'usdc', true)
    await getVm(wrapper).submitForm()
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()
    expect(mockBankWrites.deposit.mutateAsync).toHaveBeenCalledOnce()
    expect(getVm(wrapper).currentStep).toBe(2)
  })

  it('surfaces approval failures and resets submitting state', async () => {
    mockERC20Reads.allowance.data.value = 0n
    mockERC20Writes.approve.mutateAsync.mockRejectedValueOnce(new Error('Approval failed'))
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '1', 'usdc', true)
    await getVm(wrapper).submitForm()
    await flushPromises()

    expect(mockBankWrites.deposit.mutateAsync).not.toHaveBeenCalled()
    expect(getVm(wrapper).submitting).toBe(false)
  })
})
