import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MemberSection from '@/components/sections/DashboardView/MemberSection.vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types/team'
import { ref } from 'vue'

// Create mutable refs for reactive state outside the mock
const mockError = ref<string | null>(null)
const mockIsFetching = ref(false)
const mockData = ref<Team | null>(null)
const mockStatus = ref(200)
// Mock the modules BEFORE importing the component
vi.mock('@/composables/useCustomFetch', () => {
  // Inline the fake implementation to avoid hoisting issues
  return {
    useCustomFetch: () => ({
      json: () => ({
        execute: vi.fn(),
        error: mockError,
        isFetching: mockIsFetching,
        data: mockData,
        status: mockStatus
      }),
      post: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData,
          status: mockStatus
        })
      }),
      get: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData,
          status: mockStatus
        })
      })
    })
  }
})
describe('MemberSection.vue', () => {
  let wrapper: ReturnType<typeof mount>

  const teamMock = {
    id: '1',
    name: 'Sample Team',
    description: 'Sample Description',
    ownerAddress: '0xowner123',
    members: [
      { id: '1', name: 'Alice', address: '1234', teamId: 1 },
      { id: '2', name: 'Bob', address: '5678', teamId: 1 }
    ],
    teamContracts: []
  } as Team

  // const addSuccessToast = vi.fn()
  // const addErrorToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset refs between tests if needed
    mockError.value = null
    mockIsFetching.value = false
    mockData.value = teamMock
    mockStatus.value = 200

    wrapper = mount(MemberSection, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  })
  describe('renders', () => {
    it('renders the component', async () => {
      expect(wrapper.exists()).toBe(true)

      // Check that the card action don't have children
      expect(wrapper.find('.card-actions').exists()).toBe(true)
      expect(wrapper.find('.card-actions').html()).toBe(
        '<div class="card-actions justify-end"></div>'
      )
    })
  })
})
