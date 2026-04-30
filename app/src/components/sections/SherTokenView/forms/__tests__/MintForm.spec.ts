import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
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
        return { data: ref(undefined) }
      })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders form essentials and token symbol', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-test="address-input"]').exists()).toBe(true)
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
    const wrapper = mountForm()

    await wrapper.find('[data-test="percentage-input"]').setValue('50')
    expect(
      Number((wrapper.find('[data-test="amount-input"]').element as HTMLInputElement).value)
    ).toBeGreaterThan(0)

    await wrapper.find('[data-test="amount-input"]').setValue('1')
    expect(
      Number((wrapper.find('[data-test="percentage-input"]').element as HTMLInputElement).value)
    ).toBeGreaterThan(0)
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
    await wrapper.find('[data-test="amount-input"]').setValue('10')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mintMock).toHaveBeenCalled()
  })

  it('shows mint error message using shortMessage/message/fallback', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="emit-member-input"]').trigger('click')
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
