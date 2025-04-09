import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MemberSection from '@/components/sections/DashboardView/MemberSection.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Address } from 'viem'

interface WageData {
  userAddress: Address
  maximumHoursPerWeek: number
  cashRatePerHour: number
}

interface MemberSectionInstance {
  getMemberWage: (address: Address) => string
}

// Create mutable refs for reactive state outside the mock
const mockStatus = ref(200)
const mockWageData = ref<WageData[]>([])
const mockWageError = ref<string | null>(null)
const mockWageIsFetching = ref(false)

// Mock the modules BEFORE importing the component
vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: () => ({
      json: () => ({
        execute: vi.fn(),
        error: mockWageError,
        isFetching: mockWageIsFetching,
        data: mockWageData,
        status: mockStatus
      })
    })
  }
})

describe('MemberSection.vue', () => {
  let wrapper: ReturnType<typeof mount>
  let component: MemberSectionInstance

  const wageDataMock: WageData[] = [
    {
      userAddress: '0x1234' as Address,
      maximumHoursPerWeek: 40,
      cashRatePerHour: 20
    },
    {
      userAddress: '0x5678' as Address,
      maximumHoursPerWeek: 30,
      cashRatePerHour: 25
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockWageData.value = wageDataMock
    mockWageError.value = null
    mockWageIsFetching.value = false

    wrapper = mount(MemberSection, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
    component = wrapper.vm as unknown as MemberSectionInstance
  })

  describe('getMemberWage', () => {
    it('returns N/A when teamWageData is null', () => {
      mockWageData.value = []
      expect(component.getMemberWage('0x1234' as Address)).toBe('N/A')
    })

    it('returns N/A when member wage data is not found', () => {
      expect(component.getMemberWage('0x9999' as Address)).toBe('N/A')
    })

    it('returns formatted wage string when member wage data is found', () => {
      const result = component.getMemberWage('0x1234' as Address)
      expect(result).toBe('40 h/week & 20 ETH/h')
    })

    it('returns formatted wage string for different member', () => {
      const result = component.getMemberWage('0x5678' as Address)
      expect(result).toBe('30 h/week & 25 ETH/h')
    })
  })
})
