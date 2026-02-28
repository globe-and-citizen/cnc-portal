import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DistributeMintForm from '../../../SherTokenView/forms/DistributeMintForm.vue'
import { createTestingPinia } from '@pinia/testing'
import { mockToastStore } from '@/tests/mocks/store.mock'
import { ref } from 'vue'
import { useGetSearchUsersQuery } from '@/queries/user.queries'

const ButtonStub = {
  props: ['loading', 'disabled', 'color'],
  template: `<button :disabled="disabled" :loading="loading" data-test="submit-button" @click="$emit('click')"><slot /></button>`
}

const FormFieldStub = {
  props: ['label', 'error'],
  template: `<div><slot /></div>`
}

interface ComponentData {
  shareholderWithAmounts: { shareholder: string; amount: number }[]
  usersData: {
    users: { address: string; name: string }[]
  } | null
  showDropdown: boolean[]
  errorSearchUser: unknown
}

const mockUsers = [
  { address: '0x123', name: 'John Doe' },
  { address: '0x456', name: 'Jane Doe' }
]

describe('DistributeMintForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createComponent = (loading?: boolean, queryOverrides = {}) => {
    // Mock the search users query
    vi.mocked(useGetSearchUsersQuery).mockReturnValue({
      data: ref({ users: mockUsers }),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
      isLoading: ref(false),
      isPending: ref(false),
      isSuccess: ref(true),
      isFetched: ref(true),
      ...queryOverrides
    } as unknown as ReturnType<typeof useGetSearchUsersQuery>)

    return shallowMount(DistributeMintForm, {
      props: {
        tokenSymbol: 'TEST',
        loading: loading || false
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          Button: ButtonStub,
          FormField: FormFieldStub
        }
      }
    })
  }

  it('should set shareholder ref when input address', async () => {
    const wrapper = createComponent()
    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].shareholder = '0x123'
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].shareholder).toBe(
      '0x123'
    )
  })

  it('should set shareholder ref when input amount', async () => {
    const wrapper = createComponent()
    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].amount = 1
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].amount).toBe(1)
  })

  it('should add and subtract the shareholder when click icon button', async () => {
    const wrapper = createComponent()

    // Add a new shareholder
    const addButton = wrapper.find('div[data-test="plus-icon"]')
    await addButton.trigger('click')
    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts.length).toBe(2)

    // Subtract the shareholder
    const minusButton = wrapper.find('div[data-test="minus-icon"]')
    await minusButton.trigger('click')

    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts.length).toBe(1)
  })

  it('should render loading button if loading is true', async () => {
    const wrapper = createComponent(true)

    const submitButton = wrapper.find('[data-test="submit-button"]')
    expect(submitButton.attributes('loading')).toBe('true')
    expect(submitButton.attributes('disabled')).toBeDefined()
  })

  it('should emit submit event when button submit clicked', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].shareholder =
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].amount = 1
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('should render list of user suggestions when dropdown is shown', async () => {
    const wrapper = createComponent()

    // Manually set the dropdown to visible
    ;(wrapper.vm as unknown as ComponentData).showDropdown[0] = true
    await wrapper.vm.$nextTick()

    const foundUsers = wrapper.findAll('[data-test="found-user"]')
    expect(foundUsers.length).toBe(2)
  })

  it('should render error message when address is invalid', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].shareholder = '0x123'
    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].amount = 1
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const errorMessage = wrapper.find('[data-test="error-message-shareholder"]')
    expect(errorMessage.exists()).toBeTruthy()
    expect(errorMessage.text()).toBe('Invalid address')
  })

  it('should render error message when amount is invalid', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].shareholder =
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    ;(wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].amount = 0
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const errorMessage = wrapper.find('[data-test="error-message-amount"]')
    expect(errorMessage.exists()).toBeTruthy()
    expect(errorMessage.text()).toBe('Amount must be greater than 0')
  })

  it('should add error toast if there is an error when searching users', async () => {
    const mockError = ref<Error | null>(null)
    vi.mocked(useGetSearchUsersQuery).mockReturnValue({
      data: ref({ users: mockUsers }),
      isFetching: ref(false),
      error: mockError,
      refetch: vi.fn(),
      isLoading: ref(false),
      isPending: ref(false),
      isSuccess: ref(true),
      isFetched: ref(true)
    } as unknown as ReturnType<typeof useGetSearchUsersQuery>)

    const wrapper = shallowMount(DistributeMintForm, {
      props: {
        tokenSymbol: 'TEST',
        loading: false
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          Button: ButtonStub,
          FormField: FormFieldStub
        }
      }
    })

    await wrapper.vm.$nextTick()

    // Now trigger the error by updating the ref
    mockError.value = new Error('Search failed')
    await wrapper.vm.$nextTick()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to search users')
  })
})
