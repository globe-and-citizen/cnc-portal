import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MemberSection from '@/components/sections/DashboardView/MemberSection.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Address } from 'viem'
import { useTeamStore } from '@/stores'
import { mockTeamStore } from '@/tests/mocks/store.mock'
import { mock } from 'node:test'

interface WageData {
  userAddress: Address
  maximumHoursPerWeek: number
  cashRatePerHour: number
  usdcRatePerHour?: number
  sherRatePerHour?: number
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
      cashRatePerHour: 20,
      usdcRatePerHour: 50,
      sherRatePerHour: 10
    },
    {
      userAddress: '0x5678' as Address,
      maximumHoursPerWeek: 30,
      cashRatePerHour: 25,
      usdcRatePerHour: 45,
      sherRatePerHour: 15
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
    vi.mocked(useTeamStore).mockReturnValue({
      //@ts-expect-error: TypeScript expects exact return type as original
      currentTeam: {
        ...mockTeamStore,
        members: [
          {
            address: '0x1234' as Address,
            name: 'Member 1',
            id: '1',
            teamId: 1
          },
          {
            address: '0x5678' as Address,
            name: 'Member 2',
            id: '2',
            teamId: 1
          }
        ]
      }
    })
  })

  describe('getMemberWage', () => {
    it('returns N/A when teamWageData is null', () => {
      mockWageData.value = []
      expect(component.getMemberWage('0x1234' as Address)).toEqual({
        cashRatePerHour: 'N/A',
        maximumHoursPerWeek: 'N/A',
        sherRatePerHour: 'N/A',
        usdcRatePerHour: 'N/A'
      })
    })

    it('returns N/A when member wage data is not found', () => {
      expect(component.getMemberWage('0x9999' as Address)).toEqual({
        cashRatePerHour: 'N/A',
        maximumHoursPerWeek: 'N/A',
        sherRatePerHour: 'N/A',
        usdcRatePerHour: 'N/A'
      })
    })

    it('returns formatted wage string when member wage data is found', () => {
      const result = component.getMemberWage('0x1234' as Address)
      expect(result).toEqual({
        maximumHoursPerWeek: 40,
        cashRatePerHour: 20,
        usdcRatePerHour: 50,
        sherRatePerHour: 10
      })
      const memberListTable = wrapper.findComponent({ name: 'TableComponent' })
      expect(memberListTable.exists()).toBe(true)
      expect(memberListTable.find('[data-test="table"]').exists()).toBe(true)
      const firstRow = memberListTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBe(true)
      expect(firstRow.html()).toContain('Member 1')
      expect(firstRow.html()).toContain('40')
    })

    it('returns formatted wage string for different member', () => {
      const result = component.getMemberWage('0x5678' as Address)
      expect(result).toEqual({
        maximumHoursPerWeek: 30,
        cashRatePerHour: 25,
        usdcRatePerHour: 45,
        sherRatePerHour: 15
      })
    })
  })
})
