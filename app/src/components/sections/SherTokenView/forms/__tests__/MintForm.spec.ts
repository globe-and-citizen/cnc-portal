import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseUnits } from 'viem'
import MintForm from '../MintForm.vue'
import {
  mockToast,
  mockTeamStore,
  useReadContractFn,
  useWaitForTransactionReceiptFn,
  useWriteContractFn
} from '@/tests/mocks'

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890'

type MintOptions = {
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (e: unknown) => void
}

const mintMock = vi.fn(async (_params: unknown, options?: MintOptions) => {
  options?.onSuccess?.('0xDefaultHash')
  return '0xDefaultHash'
})

const writeState = {
  mutateAsync: mintMock,
  isPending: ref(false)
}

const receiptState = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

const symbolRef = ref('SHER')
const totalSupplyRef = ref<bigint | undefined>(undefined)
const recipientBalanceRef = ref<bigint | undefined>(undefined)

const mountForm = (props: Record<string, unknown> = {}) =>
  mount(MintForm, {
    props,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        UAlert: {
          name: 'UAlert',
          props: ['color', 'title', 'description', 'variant', 'icon'],
          template: '<div data-test="u-alert">{{ title }}{{ description }}</div>'
        },
        SelectMemberContractsInput: {
          name: 'SelectMemberContractsInput',
          props: ['modelValue', 'disabled'],
          emits: ['update:modelValue'],
          template: `<div data-test="address-input">
            <button data-test="emit-member-input"
              @click="$emit('update:modelValue', { name: 'Alice', address: '${VALID_ADDRESS}' })">
              select
            </button>
          </div>`
        }
      }
    }
  })

describe('MintForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useToast', () => mockToast)

    writeState.isPending.value = false
    receiptState.isLoading.value = false
    receiptState.isSuccess.value = false
    symbolRef.value = 'SHER'
    totalSupplyRef.value = undefined
    recipientBalanceRef.value = undefined

    mockTeamStore.getContractAddressByType = vi.fn(
      () => '0x2222222222222222222222222222222222222222'
    )

    useWriteContractFn.mockReset().mockReturnValue(writeState as never)
    useWaitForTransactionReceiptFn.mockReset().mockReturnValue(receiptState as never)
    useReadContractFn
      .mockReset()
      .mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'symbol') return { data: symbolRef }
        if (functionName === 'totalSupply') return { data: totalSupplyRef }
        if (functionName === 'balanceOf') return { data: recipientBalanceRef }
        return { data: ref(undefined) }
      })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders form essentials and token symbol', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-test="address-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ending-mode-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="add-mode-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="percentage-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="amount-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="submit-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cancel-button"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('SHER')
  })

  it('shows current supply section when totalSupply exists', () => {
    totalSupplyRef.value = BigInt(1_000_000)
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('Current supply')
  })

  it('shows warning when total supply is zero', () => {
    totalSupplyRef.value = BigInt(0)
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('issue a fixed amount first')
  })

  it('prefills member input from prop', async () => {
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })
    await wrapper.vm.$nextTick()
    expect(
      wrapper.findComponent({ name: 'SelectMemberContractsInput' }).props('modelValue')
    ).toEqual({
      name: 'Bob',
      address: VALID_ADDRESS
    })
  })

  it('updates selected member on update:modelValue', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')
    expect(
      wrapper.findComponent({ name: 'SelectMemberContractsInput' }).props('modelValue')
    ).toEqual({
      name: 'Alice',
      address: VALID_ADDRESS
    })
  })

  it('keeps percentage and amount synchronized for valid supply', async () => {
    totalSupplyRef.value = BigInt(1_000_000)
    recipientBalanceRef.value = BigInt(100_000)
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')

    await wrapper.find('[data-test="percentage-input"]').setValue('50')
    expect(
      Number((wrapper.find('[data-test="amount-input"]').element as HTMLInputElement).value)
    ).toBeGreaterThan(0)

    await wrapper.find('[data-test="amount-input"]').setValue('1')
    expect(
      Number((wrapper.find('[data-test="percentage-input"]').element as HTMLInputElement).value)
    ).toBeGreaterThan(0)
  })

  it('supports add-mode percentage based on current stake', async () => {
    totalSupplyRef.value = BigInt(1_000_000_000) // 1,000 tokens with 6 decimals
    recipientBalanceRef.value = BigInt(230_000_000) // 230 tokens -> 23%
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await wrapper.find('[data-test="percentage-input"]').setValue('5')

    const computedAmount = Number(
      (wrapper.find('[data-test="amount-input"]').element as HTMLInputElement).value
    )
    expect(computedAmount).toBeGreaterThan(60)
    expect(computedAmount).toBeLessThan(80)
  })

  it('treats token amount as ending balance in ending mode', async () => {
    totalSupplyRef.value = BigInt(100_000_000) // 100 tokens with 6 decimals
    recipientBalanceRef.value = BigInt(20_000_000) // 20 tokens -> 20%
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="amount-input"]').setValue('30')

    const percentage = Number(
      (wrapper.find('[data-test="percentage-input"]').element as HTMLInputElement).value
    )
    expect(percentage).toBeGreaterThan(27)
    expect(percentage).toBeLessThan(28)
  })

  it('shows allocation recap for resulting stake and new total supply', async () => {
    totalSupplyRef.value = BigInt(1_000_000_000) // 1,000 tokens with 6 decimals
    recipientBalanceRef.value = BigInt(230_000_000) // 230 tokens -> 23%
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('28')

    expect(wrapper.find('[data-test="allocation-recap"]').text()).toContain('Issuing')
    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain('Recipient stake → 28%')
    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain('(was 23%)')
    expect(wrapper.find('[data-test="recap-token-stake-line"]').text()).toContain(
      'Recipient SHER stake → 299.444444 (was 230 SHER)'
    )
    expect(wrapper.find('[data-test="new-total-supply-recap"]').text()).toContain(
      'New total supply'
    )
  })

  it('truncates current stake display instead of rounding up', async () => {
    totalSupplyRef.value = BigInt(24_814_814)
    recipientBalanceRef.value = BigInt(2_481_481)
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('15')

    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain('(was 9.99%)')
  })

  it('shows validation when ending stake is lower than current recipient stake', async () => {
    totalSupplyRef.value = BigInt(1_000_000_000) // 1,000 tokens with 6 decimals
    recipientBalanceRef.value = BigInt(230_000_000) // 230 tokens -> 23%
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('20')

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Ending % must be greater than recipient'
    )
  })

  it('shows validation when ending amount is lower than current recipient balance', async () => {
    totalSupplyRef.value = BigInt(100_000_000) // 100 tokens
    recipientBalanceRef.value = BigInt(12_000_000) // 12 tokens
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="amount-input"]').setValue('10')

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Ending % must be greater than recipient'
    )
    expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined()
  })

  it('disables submit when ending stake is not greater than current recipient stake', async () => {
    totalSupplyRef.value = BigInt(1_000_000_000)
    recipientBalanceRef.value = BigInt(230_000_000)
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('20')

    expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined()
  })

  it('keeps computed fields empty for invalid or zero-edge cases', async () => {
    const wrapper = mountForm()

    totalSupplyRef.value = BigInt(0)
    await wrapper.find('[data-test="percentage-input"]').setValue('10')
    expect(wrapper.find('[data-test="amount-input"]').element).toHaveProperty('value', '')

    totalSupplyRef.value = BigInt(1_000_000)
    await wrapper.find('[data-test="percentage-input"]').setValue('0')
    expect(wrapper.find('[data-test="amount-input"]').element).toHaveProperty('value', '')

    await wrapper.find('[data-test="amount-input"]').setValue('-1')
    expect(wrapper.find('[data-test="percentage-input"]').element).toHaveProperty('value', '')
  })

  it('emits close-modal on cancel', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="cancel-button"]').trigger('click')
    expect(wrapper.emitted('close-modal')).toBeTruthy()
  })

  it('disables buttons while mint pending or confirmation in progress', () => {
    writeState.isPending.value = true
    let wrapper = mountForm()
    expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined()

    writeState.isPending.value = false
    receiptState.isLoading.value = true
    wrapper = mountForm()
    expect(wrapper.find('[data-test="cancel-button"]').attributes('disabled')).toBeDefined()
  })

  it('submits valid form and calls mint', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await wrapper.find('[data-test="amount-input"]').setValue('10')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mintMock).toHaveBeenCalled()
  })

  it('does not show ending stake warning for invalid recipient address context', async () => {
    totalSupplyRef.value = BigInt(100_000_000)
    recipientBalanceRef.value = BigInt(20_000_000)
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: '0x123' } })

    await wrapper.find('[data-test="amount-input"]').setValue('10')

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="recap-card"]').exists()).toBe(false)
  })

  it('submits issued delta when ending-mode amount is final balance', async () => {
    totalSupplyRef.value = BigInt(100_000_000) // 100 tokens
    recipientBalanceRef.value = BigInt(20_000_000) // 20 tokens
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="amount-input"]').setValue('30') // ending balance target
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mintMock).toHaveBeenCalled()
    const latestCall = mintMock.mock.calls.at(-1)
    expect(latestCall?.[0]).toMatchObject({
      args: [VALID_ADDRESS, parseUnits('10', 6)]
    })
  })

  it('shows mint error message using shortMessage/message/fallback', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await wrapper.find('[data-test="amount-input"]').setValue('10')

    mintMock.mockImplementationOnce(async (_p: unknown, opts?: MintOptions) => {
      opts?.onError?.({ shortMessage: 'Insufficient funds' })
      return '0xErrHash'
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Insufficient funds')

    mintMock.mockImplementationOnce(async (_p: unknown, opts?: MintOptions) => {
      opts?.onError?.(new Error('Generic error'))
      return '0xErrHash'
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Generic error')

    mintMock.mockImplementationOnce(async (_p: unknown, opts?: MintOptions) => {
      opts?.onError?.({})
      return '0xErrHash'
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Transaction failed')
  })

  it('closes modal after confirmation success transition', async () => {
    const wrapper = mountForm()

    receiptState.isLoading.value = true
    await wrapper.vm.$nextTick()
    receiptState.isLoading.value = false
    receiptState.isSuccess.value = true
    await flushPromises()

    expect(wrapper.emitted('close-modal')).toBeTruthy()
  })
})
