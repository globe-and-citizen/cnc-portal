import { beforeEach, describe, expect, it, vi } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
// import { createPinia, setActivePinia } from 'pinia'

// Create mutable refs for reactive state outside the mock
const mockError = ref<string | null>(null)
const mockIsFetching = ref(false)
const mockData = ref<Array<unknown> | null>(null)

// Mock the modules BEFORE importing the component
vi.mock('@/composables/useCustomFetch', () => {
  // Inline the fake implementation to avoid hoisting issues
  return {
    useCustomFetch: () => ({
      json: () => ({
        execute: vi.fn(),
        error: mockError,
        isFetching: mockIsFetching,
        data: mockData
      }),
      post: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData
        })
      }),
      get: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData
        })
      })
    })
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => ({
      params: {
        id: 0
      },
      meta: {
        name: 'Team List View'
      }
    })),
    useRouter: vi.fn(() => ({
      push: vi.fn()
    }))
  }
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({
      addErrorToast: vi.fn(),
      addSuccessToast: vi.fn()
    })),
    useAccount: vi.fn(() => {
      return {
        chainId: ref(11155111)
      }
    }),
    useSwitchChain: vi.fn(() => {
      return {
        switchChain: vi.fn()
      }
    })
  }
})

describe('ListIndex', () => {
  // Define interface for component instance
  beforeEach(() => {
    // Use original stores
    vi.unmock('@/stores')
    vi.clearAllMocks()
    // Reset refs between tests if needed
    mockError.value = null
    mockIsFetching.value = false
    mockData.value = null
  })

  it('should render the team List and switch from loading, to error , empty data or somes data', async () => {
    const wrapper = mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: ['AddTeamForm']
      }
    })

    // Set state after mount (simulate async change)...
    mockError.value = null
    mockIsFetching.value = true
    mockData.value = null

    // Wait for watchers to run
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="loader"]').exists()).toBeTruthy()

    // Set state after mount (simulate async change)
    // set is fetching to false & data to empty array
    mockIsFetching.value = false
    // teamsAreFetching.value = false
    mockData.value = []
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.find('[data-test="loader"]').exists()).toBeFalsy()
    expect(wrapper.find('[data-test="empty-state"]').exists()).toBeTruthy()

    // Set state after mount (simulate async change)
    // set error to a string
    mockError.value = 'New Error'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    // Set state after mount (simulate async change)
    // set data to an array with one team
    mockData.value = [{ id: '0x123', name: 'John Doe', description: 'Lorem' }]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="empty-state"]').exists()).toBeFalsy()

    expect(wrapper.html()).toContain('Team List View')
    expect(wrapper.html()).toContain('John Doe')

    // Click the team card to navigate to the team detail view
    wrapper.find('[data-test="team-card-0x123"]').trigger('click')
    await wrapper.vm.$nextTick()

    // TODO: Assert the redirection is done
  })

  it('Should open the modal on click ', async () => {
    // setActivePinia(createPinia())
    // const appStore = useAppStore()
    const wrapper = mount(ListIndex, {
      global: {
        stubs: ['AddTeamForm']
      }
    })

    // Open the modal by clicking the button
    wrapper.find('[data-test="add-team"]').trigger('click')
    await wrapper.vm.$nextTick()

    // TODO : This test in the drawer
    // Assert the modal is open
    // const modalComponent = wrapper.findComponent(ModalComponent)
    // expect(modalComponent.exists()).toBeTruthy()
    // expect(modalComponent.props().modelValue).toBeTruthy()

    // // Close the modal by emitting the done event
    // wrapper.findComponent({ name: 'AddTeamForm' }).vm.$emit('done')
    // await wrapper.vm.$nextTick()

    // // Assert the modal is closed
    // expect(modalComponent.props().modelValue).toBeFalsy()

    // // Open the modal by clicking the button
    // wrapper.find('[data-test="add-team"]').trigger('click')
    // await wrapper.vm.$nextTick()

    // // Assert the modal is open
    // expect(modalComponent.props().modelValue).toBeTruthy()

    // // Close the modal by clicking the backdrop
    // wrapper.find('.modal-backdrop').trigger('click')
    // await wrapper.vm.$nextTick()

    // // Assert the modal is closed
    // expect(modalComponent.props().modelValue).toBeFalsy()
  })
})
