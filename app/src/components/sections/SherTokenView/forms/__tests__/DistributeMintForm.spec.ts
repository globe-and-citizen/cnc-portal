import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import DistributeMintForm from '../DistributeMintForm.vue'
import * as userQueries from '@/queries/user.queries'

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

  it('fills shareholder address when a user is picked from the search dropdown', async () => {
    vi.mocked(userQueries.useGetSearchUsersQuery).mockReturnValue({
      data: ref({
        users: [{ name: 'Alice', address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }]
      }),
      error: ref(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const wrapper = mountForm()

    const addressInput = wrapper.find('input[data-test="address-input"]')
    await addressInput.setValue('Ali')
    await addressInput.trigger('keyup')
    await flushPromises()

    const foundUser = wrapper.find('[data-test="found-user"]')
    expect(foundUser.exists()).toBe(true)
    expect(foundUser.text()).toContain('Alice')

    await foundUser.trigger('click')
    await flushPromises()

    expect((addressInput.element as HTMLInputElement).value).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )
    expect(wrapper.find('[data-test="found-user"]').exists()).toBe(false)
  })

  it('emits submit with parsed shareholder amounts when all rows are valid', async () => {
    const wrapper = mountForm()

    const validAddress = '0x1234567890123456789012345678901234567890'
    await wrapper.find('input[data-test="address-input"]').setValue(validAddress)
    await wrapper.find('input[data-test="amount-input"]').setValue(5)

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const submitted = wrapper.emitted('submit')
    expect(submitted).toBeTruthy()
    const payload = submitted?.[0]?.[0] as Array<{ shareholder: string; amount: bigint }>
    expect(payload).toHaveLength(1)
    expect(payload[0]!.shareholder).toBe(validAddress)
    expect(typeof payload[0]!.amount).toBe('bigint')
  })
})
