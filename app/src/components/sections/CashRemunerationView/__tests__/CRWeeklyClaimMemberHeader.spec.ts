import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CRWeeklyClaimMemberHeader from '../CRWeeklyClaimMemberHeader.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { type WageResponse } from '@/types'

// Mock the custom fetch hook
const mockFetchData = ref<Array<WageResponse> | null>(null)
const mockFetchError = ref<Error | null>(null)

const mocks = vi.hoisted(() => ({
  mockUseCustomFetch: vi.fn(() => ({
    get: vi.fn().mockReturnValue({
      json: vi.fn().mockReturnValue({
        data: mockFetchData,
        error: mockFetchError
      })
    })
  })),
  mockUseUserDataStore: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890'
  })),
  mockUseTeamStore: vi.fn(() => ({
    currentTeam: {
      id: 1
    }
  })),
  mockUseToastStore: vi.fn(() => ({
    addErrorToast: vi.fn()
  }))
}))

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: mocks.mockUseCustomFetch
}))

vi.mock('@/stores', () => ({
  useUserDataStore: mocks.mockUseUserDataStore,
  useTeamStore: mocks.mockUseTeamStore,
  useToastStore: mocks.mockUseToastStore
}))

describe('CRWeeklyClaimMemberHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchData.value = null
    mockFetchError.value = null
  })

  it('should show SubmitClaims component when user has wage', () => {
    // Mock user has wage
    mockFetchData.value = [
      {
        userAddress: '0x1234567890123456789012345678901234567890',
        maximumHoursPerWeek: 40,
        cashRatePerHour: 100
      }
    ]

    const wrapper = mount(CRWeeklyClaimMemberHeader, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          SubmitClaims: true // Stub out the SubmitClaims component to avoid complex mocking
        }
      }
    })

    // Should show the SubmitClaims component
    expect(wrapper.findComponent({ name: 'SubmitClaims' }).exists()).toBe(true)

    // Should not show the disabled button
    expect(wrapper.find('[data-test="submit-claim-disabled-button"]').exists()).toBe(false)

    // Should not have tooltip class on the container
    expect(wrapper.find('[data-tip]').exists()).toBe(false)
  })

  it('should show disabled button with tooltip when user has no wage', () => {
    // Mock user has no wage
    mockFetchData.value = []

    const wrapper = mount(CRWeeklyClaimMemberHeader, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    // Should not show the SubmitClaims component
    expect(wrapper.findComponent({ name: 'SubmitClaims' }).exists()).toBe(false)

    // Should show the disabled button
    const disabledButton = wrapper.find('[data-test="submit-claim-disabled-button"]')
    expect(disabledButton.exists()).toBe(true)
    expect(disabledButton.text()).toBe('Submit Claim')

    // Should have tooltip with appropriate message
    const tooltipContainer = wrapper.find('.tooltip')
    expect(tooltipContainer.exists()).toBe(true)
    expect(tooltipContainer.attributes('data-tip')).toBe(
      'You need to have a wage set up to submit claims'
    )
  })

  it('should show disabled button with tooltip when user address is not in wage data', () => {
    // Mock user address not in wage data
    mockFetchData.value = [
      {
        userAddress: '0x9876543210987654321098765432109876543210',
        maximumHoursPerWeek: 40,
        cashRatePerHour: 100
      }
    ]

    const wrapper = mount(CRWeeklyClaimMemberHeader, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    // Should not show the SubmitClaims component
    expect(wrapper.findComponent({ name: 'SubmitClaims' }).exists()).toBe(false)

    // Should show the disabled button with tooltip
    const disabledButton = wrapper.find('[data-test="submit-claim-disabled-button"]')
    expect(disabledButton.exists()).toBe(true)

    const tooltipContainer = wrapper.find('.tooltip')
    expect(tooltipContainer.exists()).toBe(true)
    expect(tooltipContainer.attributes('data-tip')).toBe(
      'You need to have a wage set up to submit claims'
    )
  })
})
