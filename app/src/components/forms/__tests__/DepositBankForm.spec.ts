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
  useQueryClientFn
} from '@/tests/mocks'

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

const submitForm = async (wrapper: ReturnType<typeof createWrapper>) => {
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
}

const getDepositButton = (wrapper: ReturnType<typeof createWrapper>) =>
  wrapper
    .findAllComponents({ name: 'UButton' })
    .find((b) => b.attributes('data-test') === 'deposit-button')

describe('DepositBankForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createQueryClient()
    mockBankWrites.deposit.mutateAsync.mockResolvedValue(undefined)
  })

  it('resets and emits closeModal when cancelled', async () => {
    mockERC20Reads.allowance.data.value = 1000000n
    const wrapper = createWrapper()

    // Drive a valid token amount, then advance currentStep via mutation flow
    await setTokenAmount(wrapper, '1', 'usdc', true)
    await submitForm(wrapper)
    await flushPromises()

    // Cancel and assert TokenAmount returns to native + empty
    await wrapper.find('[data-test="cancel-button"]').trigger('click')

    const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
    expect(tokenAmount.props('modelValue')).toEqual({ amount: '', tokenId: 'native' })
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('prevents submission when invalid or already pending', async () => {
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '0.1', 'native', false)
    await submitForm(wrapper)
    expect(mockTransactionFunctions.mockMutateAsync).not.toHaveBeenCalled()

    mockUseSafeSendTransaction.isPending.value = true
    await setTokenAmount(wrapper, '0.1', 'native', true)
    await submitForm(wrapper)
    expect(mockTransactionFunctions.mockMutateAsync).not.toHaveBeenCalled()
  })

  it('handles native token deposits successfully and on failure', async () => {
    const wrapper = createWrapper({ title: 'Deposit Bank Form' })

    await setTokenAmount(wrapper, '0.1', 'native', true)
    await submitForm(wrapper)
    await flushPromises()

    expect(mockTransactionFunctions.mockMutateAsync).toHaveBeenCalled()
    expect(wrapper.emitted('closeModal')).toBeTruthy()

    mockTransactionFunctions.mockMutateAsync.mockRejectedValueOnce(new Error('Transaction failed'))
    const failedWrapper = createWrapper()
    await setTokenAmount(failedWrapper, '0.2', 'native', true)
    await submitForm(failedWrapper)
    await flushPromises()

    expect(mockTransactionFunctions.mockMutateAsync).toHaveBeenCalledTimes(2)
    expect(failedWrapper.emitted('closeModal')).toBeFalsy()
  })

  it('shows native and erc20 stepper states correctly', async () => {
    const wrapper = createWrapper()

    // Default: native selected → no Approval/Deposit stepper labels rendered
    expect(wrapper.text()).not.toContain('Approval')
    expect(wrapper.findComponent({ name: 'TokenAmount' }).exists()).toBe(true)

    // Switch to usdc → stepper appears (renders Approval/Deposit labels)
    await setTokenAmount(wrapper, '0', 'usdc', false)
    expect(wrapper.text()).toContain('Approval')
  })

  it('runs approval first when allowance is insufficient and then deposits token', async () => {
    const { invalidateQueries } = createQueryClient()
    mockERC20Reads.allowance.data.value = 0n
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '1', 'usdc', true)
    await submitForm(wrapper)
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
    await submitForm(wrapper)
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()
    expect(mockBankWrites.deposit.mutateAsync).toHaveBeenCalledOnce()
    // Stepper reflected Deposit step (closes on success; assert deposit was the last call)
    expect(wrapper.emitted('closeModal')).toBeTruthy()
  })

  it('surfaces approval failures and resets submitting state', async () => {
    mockERC20Reads.allowance.data.value = 0n
    mockERC20Writes.approve.mutateAsync.mockRejectedValueOnce(new Error('Approval failed'))
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '1', 'usdc', true)
    await submitForm(wrapper)
    await flushPromises()

    expect(mockBankWrites.deposit.mutateAsync).not.toHaveBeenCalled()
    // Submit button is no longer loading once submitting reset to false
    expect(getDepositButton(wrapper)?.props('loading')).toBe(false)
  })
})
