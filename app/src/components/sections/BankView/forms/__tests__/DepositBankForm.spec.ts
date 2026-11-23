import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { nextTick, ref } from 'vue'
import { zeroAddress, type Address } from 'viem'
import DepositBankForm from '@/components/sections/BankView/forms/DepositBankForm.vue'
import {
  mockTransactionFunctions,
  mockUseSafeSendTransaction,
  mockERC20Reads,
  mockERC20Writes,
  mockBankWrites,
  useQueryClientFn,
  mockUseChainId,
  useReadContractFn
} from '@/tests/mocks'
import { contractBalanceKeys } from '@/composables/useContractBalance'

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
  const tokenAmount = wrapper.findComponent({ name: 'TokenAmountInput' })
  await tokenAmount.vm.$emit('update:modelValue', { amount: value, tokenId })
  await tokenAmount.vm.$emit('validation', isValid)
  await nextTick()
}

const submitForm = async (wrapper: ReturnType<typeof createWrapper>) => {
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
}

const BANK_FEE_BPS = 50
const USDC_ADDRESS = '0xA3492D046095AFFE351cFac15de9b86425E235dB'

const mockBankFee = ({ feeBps = BANK_FEE_BPS, isFeeCollectorToken = true } = {}) =>
  useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => ({
    data: ref(functionName === 'getFeeFor' ? feeBps : isFeeCollectorToken),
    error: ref(null),
    refetch: vi.fn()
  }))

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

    // Cancel and assert TokenAmountInput returns to native + empty
    await wrapper.find('[data-test="cancel-button"]').trigger('click')

    const tokenAmount = wrapper.findComponent({ name: 'TokenAmountInput' })
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

  it('[AC-US-BANK-001-01] handles native token deposits successfully and on failure', async () => {
    const { invalidateQueries } = createQueryClient()
    const wrapper = createWrapper({ title: 'Deposit Bank Form' })

    await setTokenAmount(wrapper, '0.1', 'native', true)
    await submitForm(wrapper)
    await flushPromises()

    expect(mockTransactionFunctions.mockMutateAsync).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: contractBalanceKeys.detail(defaultProps.bankAddress, mockUseChainId.value)
    })
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
    expect(wrapper.findComponent({ name: 'TokenAmountInput' }).exists()).toBe(true)

    // Switch to usdc → stepper appears (renders Approval/Deposit labels)
    await setTokenAmount(wrapper, '0', 'usdc', false)
    expect(wrapper.text()).toContain('Approval')
  })

  it('[AC-US-BANK-001-07] requests approval when allowance is insufficient', async () => {
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

  it('[AC-US-BANK-001-07] skips approval when allowance is sufficient', async () => {
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

  it('deposits a decimal token amount without floating-point loss', async () => {
    mockERC20Reads.allowance.data.value = 1_000_000_000n
    mockBankFee({ feeBps: 0 })
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '8.2', 'usdc')
    await submitForm(wrapper)

    expect(mockBankWrites.deposit.mutateAsync).toHaveBeenCalledWith({
      args: [USDC_ADDRESS, 8_200_000n]
    })
  })

  it('[AC-US-BANK-001-05] rejects a token amount with more than six decimals', async () => {
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '0.0000001', 'usdc')
    await submitForm(wrapper)

    expect(wrapper.text()).toContain('Enter a valid token amount with up to 6 decimal places.')
    expect(wrapper.text()).not.toContain('Enter a valid amount greater than 0.')
    expect(mockBankWrites.deposit.mutateAsync).not.toHaveBeenCalled()
  })

  it('keeps Deposit enabled and warns when the amount exceeds the balance', async () => {
    const wrapper = createWrapper()

    await setTokenAmount(wrapper, '60', 'usdc', false)

    expect(getDepositButton(wrapper)?.props('disabled')).toBe(false)

    await submitForm(wrapper)

    expect(wrapper.text()).toContain('Amount exceeds available balance.')
    expect(mockBankWrites.deposit.mutateAsync).not.toHaveBeenCalled()
  })

  describe('Add fee option', () => {
    const checkAddFee = (wrapper: ReturnType<typeof createWrapper>) =>
      wrapper.get('[data-test="add-fee-checkbox"]').trigger('click')

    beforeEach(() => {
      mockERC20Reads.allowance.data.value = 1_000_000_000n
      mockBankFee()
    })

    it('deposits the entered amount alone until Add fee is checked', async () => {
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '20', 'usdc')
      await submitForm(wrapper)

      expect(wrapper.find('[data-test="deposit-fee-summary"]').exists()).toBe(false)
      expect(mockBankWrites.deposit.mutateAsync).toHaveBeenCalledWith({
        args: [USDC_ADDRESS, 20_000_000n]
      })
    })

    it('[AC-US-BANK-001-11] adds the exact transfer fee once Add fee is checked', async () => {
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '20', 'usdc')
      await checkAddFee(wrapper)
      await submitForm(wrapper)

      expect(mockBankWrites.deposit.mutateAsync).toHaveBeenCalledWith({
        args: [USDC_ADDRESS, 20_100_502n]
      })
    })

    it('shows the fee and the total deposited', async () => {
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '20', 'usdc')
      await checkAddFee(wrapper)

      expect(wrapper.find('[data-test="deposit-fee-amount"]').text()).toBe('0.100502 USDC')
      expect(wrapper.find('[data-test="deposit-total-amount"]').text()).toBe('20.100502 USDC')
    })

    it('adds the fee to a native deposit in 18 decimals', async () => {
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '0.1', 'native')
      await checkAddFee(wrapper)
      await submitForm(wrapper)

      expect(mockTransactionFunctions.mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ value: 100_502_512_562_814_070n })
      )
    })

    it('rejects a deposit whose fee pushes it past the wallet balance', async () => {
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '49.9', 'usdc')
      await checkAddFee(wrapper)
      await submitForm(wrapper)

      expect(wrapper.text()).toContain('Amount exceeds available balance.')
      expect(mockBankWrites.deposit.mutateAsync).not.toHaveBeenCalled()
    })

    it('[AC-US-BANK-001-12] sets Max so the amount plus its fee fits the balance exactly', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '', 'usdc', false)
      await checkAddFee(wrapper)

      await wrapper.find('[data-test="maxButton"]').trigger('click')

      expect(wrapper.find<HTMLInputElement>('[data-test="amountInput"]').element.value).toBe(
        '49.75'
      )
      expect(wrapper.find('[data-test="deposit-total-amount"]').text()).toBe('50 USDC')
    })

    it('lowers a Max amount to fit the fee when Add fee is checked afterwards', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '', 'usdc', false)
      await wrapper.find('[data-test="maxButton"]').trigger('click')

      await checkAddFee(wrapper)

      expect(wrapper.find<HTMLInputElement>('[data-test="amountInput"]').element.value).toBe(
        '49.75'
      )
    })

    it('hides the option when the Bank charges no transfer fee', async () => {
      mockBankFee({ feeBps: 0 })
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '20', 'usdc')

      expect(wrapper.find('[data-test="add-fee-checkbox"]').exists()).toBe(false)
    })

    it('hides the option for a token the Bank transfers without fee', async () => {
      mockBankFee({ isFeeCollectorToken: false })
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '20', 'usdc')

      expect(wrapper.find('[data-test="add-fee-checkbox"]').exists()).toBe(false)
    })
  })
})
