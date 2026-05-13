import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import DistributeMintForm from '../DistributeMintForm.vue'

const mountForm = () =>
  mount(DistributeMintForm, {
    props: { tokenSymbol: 'SHER', loading: false },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

describe('DistributeMintForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one shareholder row by default with address + amount inputs', () => {
    const wrapper = mountForm()

    expect(wrapper.findAll('[data-test="address-input"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-test="amount-input"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="submit-button"]').exists()).toBe(true)
  })

  it('adds and removes shareholder rows', async () => {
    const wrapper = mountForm()

    await wrapper.find('[data-test="plus-icon"]').trigger('click')
    await wrapper.find('[data-test="plus-icon"]').trigger('click')
    expect(wrapper.findAll('[data-test="address-input"]')).toHaveLength(3)

    await wrapper.find('[data-test="minus-icon"]').trigger('click')
    expect(wrapper.findAll('[data-test="address-input"]')).toHaveLength(2)
  })

  it('renders field errors via UFormField when address and amount are invalid', async () => {
    const wrapper = mountForm()

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const addressError = wrapper.find('[data-test="error-message-shareholder"]')
    const amountError = wrapper.find('[data-test="error-message-amount"]')

    expect(addressError.exists()).toBe(true)
    expect(addressError.text()).toContain('Address is required')

    expect(amountError.exists()).toBe(true)
    expect(amountError.text()).toContain('Amount must be greater than 0')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('emits submit with parsed shareholder amounts when all rows are valid', async () => {
    const wrapper = mountForm()

    const vm = wrapper.vm as unknown as {
      shareholderWithAmounts: { shareholder: string; amount: number }[]
    }
    vm.shareholderWithAmounts[0]!.shareholder = '0x1234567890123456789012345678901234567890'
    vm.shareholderWithAmounts[0]!.amount = 5
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const submitted = wrapper.emitted('submit')
    expect(submitted).toBeTruthy()
    const payload = submitted?.[0]?.[0] as Array<{ shareholder: string; amount: bigint }>
    expect(payload).toHaveLength(1)
    expect(payload[0]!.shareholder).toBe('0x1234567890123456789012345678901234567890')
    expect(typeof payload[0]!.amount).toBe('bigint')
  })
})
