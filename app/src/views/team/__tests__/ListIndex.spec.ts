import { beforeEach, describe, expect, it, vi } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import ModalComponent from '@/components/ModalComponent.vue'

// Create mutable refs for reactive state outside the mock
const mockError = ref<string | null>(null)
const mockIsFetching = ref(false)
const mockData = ref<Array<unknown> | null>(null)

// Mock the modules BEFORE importing the component
vi.mock('@/composables/useCustomFetch', () => {
  // Inline the fake implementation to avoid hoisting issues
  return {
    useCustomFetch: () => ({
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

vi.mock('vue-router', () => ({
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
}))

describe('ListIndex', () => {
  // Define interface for component instance
  beforeEach(() => {
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

    // Set state after mount (simulate async change)
    mockError.value = null
    mockIsFetching.value = true
    mockData.value = null

    // Wait for watchers to run
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="loader"]').exists()).toBeTruthy()

    // Set state after mount (simulate async change)
    // set is fetching to false & data to empty array
    mockIsFetching.value = false
    mockData.value = []
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="loader"]').exists()).toBeFalsy()
    expect(wrapper.find('[data-test="empty-state"]').exists()).toBeTruthy()

    // Set state after mount (simulate async change)
    // set data to an array with one team
    mockData.value = [{ id: '0x123', name: 'John Doe', description: 'Lorem' }]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="empty-state"]').exists()).toBeFalsy()

    expect(wrapper.html()).toContain('Team List View')
    expect(wrapper.html()).toContain('John Doe')

    // Set state after mount (simulate async change)
    // set error to a string
    mockError.value = 'New Error'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()
  })

  it('Should open the modal on click ', async () => {

    const wrapper = mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: ['AddTeamForm']
      }
    })

    wrapper.find('[data-test="add-team-card"]').trigger('click')
    await wrapper.vm.$nextTick()

    // wrapper.find('[data-test="add-team-card"]').trigger('click')
    // await wrapper.vm.$nextTick()

    // expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
    // console.log(wrapper.findComponent(ModalComponent).props())
    // expect(wrapper.findComponent(ModalComponent).props().modelValue).toBeTruthy()
  })
})
