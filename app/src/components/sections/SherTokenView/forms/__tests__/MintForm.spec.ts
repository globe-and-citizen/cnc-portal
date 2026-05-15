import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseUnits } from 'viem'
import MintForm from '../MintForm.vue'
import {
  mockToast,
  mockTeamStore,
  mockInvestorWrites,
  resetContractMocks,
  useReadContractFn
} from '@/tests/mocks'

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890'

type MintOptions = {
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (e: unknown) => void
}

const symbolRef = ref('SHER')
const totalSupplyRef = ref<bigint | undefined>(undefined)
const recipientBalanceRef = ref<bigint | undefined>(undefined)

vi.mock('@/composables/investor/reads', () => ({
  useInvestorSymbol: vi.fn(() => ({ data: symbolRef })),
  useInvestorTotalSupply: vi.fn(() => ({ data: totalSupplyRef })),
  useInvestorBalanceOf: vi.fn(() => ({ data: recipientBalanceRef }))
}))

const setSupplyAndBalance = (supply: bigint, balance: bigint) => {
  totalSupplyRef.value = supply
  recipientBalanceRef.value = balance
}

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
  const mintMutation = mockInvestorWrites.individualMint

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    vi.stubGlobal('useToast', () => mockToast)

    symbolRef.value = 'SHER'
    totalSupplyRef.value = undefined
    recipientBalanceRef.value = undefined

    mockTeamStore.getContractAddressByType = vi.fn(
      () => '0x2222222222222222222222222222222222222222'
    )

    mintMutation.mutate.mockImplementation((_params: unknown, options?: MintOptions) => {
      options?.onSuccess?.('0xDefaultHash')
    })

    useReadContractFn
      .mockReset()
      .mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'symbol') return { data: symbolRef }
        if (functionName === 'totalSupply') return { data: totalSupplyRef }
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

  it('supports add-mode percentage based on current stake', async () => {
    setSupplyAndBalance(1_000_000_000n, 230_000_000n) // 1,000 tokens, recipient 230 -> 23%
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await wrapper.find('[data-test="percentage-input"]').setValue('5')

    const computedAmount = Number(
      (wrapper.find('[data-test="amount-input"]').element as HTMLInputElement).value
    )
    expect(computedAmount).toBeCloseTo(69.44, 1)
  })

  it('shows validation when ending stake is lower than current recipient stake', async () => {
    setSupplyAndBalance(1_000_000_000n, 230_000_000n) // 1,000 tokens, recipient 230 -> 23%
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('20')

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Ending % must be greater than 23%'
    )
  })

  it('shows validation when ending amount is lower than current recipient balance', async () => {
    setSupplyAndBalance(100_000_000n, 12_000_000n) // 100 tokens, recipient 12
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="amount-input"]').setValue('10')

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Ending % must be greater than 12%'
    )
    expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined()
  })

  it('disables submit when ending stake is not greater than current recipient stake', async () => {
    setSupplyAndBalance(1_000_000_000n, 230_000_000n)
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('20')

    expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined()
  })

  it('clears ending validation message when switching to add mode', async () => {
    setSupplyAndBalance(1_000_000_000n, 230_000_000n)
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('20')
    expect(wrapper.find('[data-test="ending-stake-validation-message"]').exists()).toBe(true)

    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="ending-stake-validation-message"]').exists()).toBe(false)
  })

  it('re-evaluates ending validation message when switching back to ending mode', async () => {
    setSupplyAndBalance(1_000_000_000n, 230_000_000n)
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })

    await wrapper.find('[data-test="percentage-input"]').setValue('20')
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="ending-stake-validation-message"]').exists()).toBe(false)

    await wrapper.find('[data-test="ending-mode-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Ending % must be greater than 23%'
    )
  })

  it('emits close-modal on cancel', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="cancel-button"]').trigger('click')
    expect(wrapper.emitted('close-modal')).toBeTruthy()
  })

  it('disables buttons while mint pending', () => {
    mintMutation.isPending.value = true
    const wrapper = mountForm()
    expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="cancel-button"]').attributes('disabled')).toBeDefined()
  })

  it('submits valid form and calls mint', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await wrapper.find('[data-test="amount-input"]').setValue('10')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mintMutation.mutate).toHaveBeenCalled()
  })

  it('submits issued delta when ending-mode amount is final balance', async () => {
    setSupplyAndBalance(100_000_000n, 20_000_000n) // 100 tokens, recipient 20
    const wrapper = mountForm({ memberInput: { name: 'Bob', address: VALID_ADDRESS } })
    await wrapper.find('[data-test="amount-input"]').setValue('30') // ending balance target
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mintMutation.mutate).toHaveBeenCalled()
    const latestCall = mintMutation.mutate.mock.calls.at(-1)
    expect(latestCall?.[0]).toMatchObject({
      args: [VALID_ADDRESS, parseUnits('10', 6)]
    })
  })

  it('shows mint error message using shortMessage/message/fallback', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await wrapper.find('[data-test="amount-input"]').setValue('10')

    mintMutation.mutate.mockImplementationOnce((_p: unknown, opts?: MintOptions) => {
      opts?.onError?.({ shortMessage: 'Insufficient funds' })
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Insufficient funds')

    mintMutation.mutate.mockImplementationOnce((_p: unknown, opts?: MintOptions) => {
      opts?.onError?.(new Error('Generic error'))
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Generic error')

    mintMutation.mutate.mockImplementationOnce((_p: unknown, opts?: MintOptions) => {
      opts?.onError?.({})
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Transaction failed')
  })

  it('closes modal after mint mutation resolves', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')
    await wrapper.find('[data-test="amount-input"]').setValue('10')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('close-modal')).toBeTruthy()
  })
})
