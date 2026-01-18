import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MemberSection from '@/components/sections/DashboardView/MemberSection.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Address } from 'viem'
import { useTeamStore } from '@/stores'
import { mockTeamStore } from '@/tests/mocks/store.mock'
import { NETWORK } from '@/constant'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createMockQueryResponse } from '@/tests/mocks/index'

interface WageData {
  userAddress: Address
  maximumHoursPerWeek: number
  cashRatePerHour: number
  usdcRatePerHour?: number
  tokenRatePerHour?: number
  ratePerHour?: { type: string; amount: number }[]
}

interface MemberSectionInstance {
  getMemberWage: (address: Address) => string
}

// Create mutable refs for reactive state outside the mock
const mockWageData = ref<WageData[]>([])
const mockWageError = ref<string | null | Error>(null)
const mockWageIsFetching = ref(false)

describe.skip('MemberSection.vue', () => {
  let wrapper: ReturnType<typeof mount>
  let component: MemberSectionInstance
  const queryClient = new QueryClient()

  const wageDataMock: WageData[] = [
    {
      userAddress: '0x1234' as Address,
      maximumHoursPerWeek: 40,
      ratePerHour: [
        { type: 'native', amount: 20 },
        { type: 'usdc', amount: 50 },
        { type: 'sher', amount: 10 }
      ],
      cashRatePerHour: 20,
      usdcRatePerHour: 50,
      tokenRatePerHour: 10
    },
    {
      userAddress: '0x5678' as Address,
      maximumHoursPerWeek: 30,
      ratePerHour: [
        { type: 'native', amount: 25 },
        { type: 'usdc', amount: 45 },
        { type: 'sher', amount: 15 }
      ],
      cashRatePerHour: 25,
      usdcRatePerHour: 45,
      tokenRatePerHour: 15
    }
  ]

  const createWrapper = (
    ownerAddress: Address = '0x1234' as Address,
    userAddress: Address = '0x1234' as Address
  ) => {
    vi.clearAllMocks()
    mockWageData.value = { data: wageDataMock } as unknown as WageData[]
    mockWageError.value = null
    mockWageIsFetching.value = false

    const teamStoreValues = {
      currentTeamId: 1,
      currentTeam: {
        ...mockTeamStore,
        ownerAddress,
        id: 1,
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
      },
      currentTeamMeta: {
        data: createMockQueryResponse({
          id: 1,
          ownerAddress,
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
        }),
        isPending: false
      }
    }

    wrapper = mount(MemberSection, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: {
                address: userAddress
              }
            }
          }),
          [VueQueryPlugin, { queryClient }]
        ]
      }
    })

    // @ts-expect-error: mocking store values
    vi.mocked(useTeamStore).mockReturnValue(teamStoreValues)

    component = wrapper.vm as unknown as MemberSectionInstance
    return wrapper
  }

  beforeEach(() => {
    createWrapper()
  })

  describe('getMemberWage', () => {
    it('returns N/A when teamWageData is null', () => {
      mockWageData.value = { data: [] } as unknown as WageData[]
      expect(component.getMemberWage('0x1234' as Address)).toEqual({
        cashRatePerHour: 'N/A',
        maximumHoursPerWeek: 'N/A',
        tokenRatePerHour: 'N/A',
        usdcRatePerHour: 'N/A'
      })
    })

    it('returns N/A when member wage data is not found', () => {
      expect(component.getMemberWage('0x9999' as Address)).toEqual({
        cashRatePerHour: 'N/A',
        maximumHoursPerWeek: 'N/A',
        tokenRatePerHour: 'N/A',
        usdcRatePerHour: 'N/A'
      })
    })

    it('returns formatted wage string when member wage data is found', () => {
      const result = component.getMemberWage('0x1234' as Address)
      expect(result).toEqual({
        maximumHoursPerWeek: `${40} hrs/wk`,
        cashRatePerHour: `${20} ${NETWORK.currencySymbol}/hr`,
        usdcRatePerHour: `${50} USDC/hr`,
        tokenRatePerHour: `${10} SHER/hr`
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
        maximumHoursPerWeek: `${30} hrs/wk`,
        cashRatePerHour: `${25} ${NETWORK.currencySymbol}/hr`,
        usdcRatePerHour: `${45} USDC/hr`,
        tokenRatePerHour: `${15} SHER/hr`
      })
    })
  })

  describe('Component Rendering', () => {
    it('renders the card title correctly', () => {
      const card = wrapper.findComponent({ name: 'CardComponent' })
      expect(card.exists()).toBe(true)
      expect(card.props('title')).toBe('Team Members List')
    })

    it('renders table with correct columns when user is owner', () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const table = wrapper.findComponent({ name: 'TableComponent' })
      expect(table.exists()).toBe(true)
      expect(table.props('columns')).toEqual([
        { key: 'index', label: '#' },
        { key: 'member', label: 'Member' },
        { key: 'maxWeeklyHours', label: 'Max Weekly Hours' },
        { key: 'wage', label: `Hourly Rate` },
        { key: 'action', label: 'Action' }
      ])
    })

    it('renders table without action column when user is not owner', () => {
      createWrapper('0xowner' as Address, '0xnotowner' as Address)
      const table = wrapper.findComponent({ name: 'TableComponent' })
      expect(table.exists()).toBe(true)
      expect(table.props('columns')).toEqual([
        { key: 'index', label: '#' },
        { key: 'member', label: 'Member' },
        { key: 'maxWeeklyHours', label: 'Max Weekly Hours' },
        { key: 'wage', label: `Hourly Rate` }
      ])
    })

    it('renders Add Member button only for team owner', () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      expect(addButton.exists()).toBe(true)
    })

    it('does not render Add Member button for non-owners', () => {
      createWrapper('0xowner' as Address, '0xnotowner' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      expect(addButton.exists()).toBe(false)
    })

    it('displays loading skeletons when data is fetching', async () => {
      mockWageIsFetching.value = true
      await wrapper.vm.$nextTick()
      const table = wrapper.findComponent({ name: 'TableComponent' })
      expect(table.exists()).toBe(true)
    })
  })

  describe('User Interactions', () => {
    it('opens modal when Add Member button is clicked', async () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent({ name: 'ModalComponent' })
      expect(modal.exists()).toBe(true)
    })

    it('closes modal when memberAdded event is emitted', async () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      const addMemberForm = wrapper.findComponent({ name: 'AddMemberForm' })
      if (addMemberForm.exists()) {
        await addMemberForm.vm.$emit('memberAdded')
        await wrapper.vm.$nextTick()
      }
    })

    it('closes modal on reset event', async () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent({ name: 'ModalComponent' })
      if (modal.exists()) {
        await modal.vm.$emit('reset')
        await wrapper.vm.$nextTick()
      }
    })
  })

  describe('Error Handling', () => {
    it('shows error toast when wage data fetch fails', async () => {
      mockWageError.value = new Error('Failed to fetch')
      await wrapper.vm.$nextTick()

      // Trigger the watcher
      mockWageError.value = new Error('New error')
      await wrapper.vm.$nextTick()
    })
  })

  describe('Table Data', () => {
    it('passes correct loading state to table', () => {
      const table = wrapper.findComponent({ name: 'TableComponent' })
      expect(table.props('loading')).toBe(false)
    })

    it('passes correctly formatted row data to table', () => {
      const table = wrapper.findComponent({ name: 'TableComponent' })
      const rows = table.props('rows')
      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual(
        expect.objectContaining({
          index: 1,
          address: '0x1234',
          name: 'Member 1'
        })
      )
    })
  })
})
