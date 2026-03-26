import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MemberSection from '@/components/sections/DashboardView/MemberSection.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Address } from 'viem'
import { useGetTeamWagesQuery } from '@/queries/wage.queries'
import { mockTeamStore, mockToastStore, mockUserDataStore } from '@/tests/mocks/store.mock'
import { NETWORK } from '@/constant'
import type { Wage } from '@/types'

// Create mutable refs for reactive state outside the mock
const mockWageData = ref<Wage[]>([])
const mockWageError = ref<string | null | Error>(null)
const mockWageIsFetching = ref(false)

describe.skip('MemberSection.vue', () => {
  let wrapper: ReturnType<typeof mount>

  const baseMembers = [
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

  const wageDataMock: Wage[] = [
    {
      id: 1,
      teamId: 1,
      userAddress: '0x1234' as Address,
      maximumHoursPerWeek: 40,
      maximumOvertimeHoursPerWeek: 10,
      ratePerHour: [
        { type: 'native', amount: 20 },
        { type: 'usdc', amount: 50 },
        { type: 'sher', amount: 10 }
      ],
      overtimeRatePerHour: [],
      nextWageId: null,
      disabled: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      teamId: 1,
      userAddress: '0x5678' as Address,
      maximumHoursPerWeek: 30,
      maximumOvertimeHoursPerWeek: 5,
      ratePerHour: [
        { type: 'native', amount: 25 },
        { type: 'usdc', amount: 45 },
        { type: 'sher', amount: 15 }
      ],
      overtimeRatePerHour: [
        { type: 'native', amount: 35 },
        { type: 'usdc', amount: 55 },
        { type: 'sher', amount: 20 }
      ],
      nextWageId: null,
      disabled: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ]

  const createWrapper = (
    ownerAddress: Address = '0x1234' as Address,
    userAddress: Address = '0x1234' as Address
  ) => {
    mockWageData.value = wageDataMock
    mockWageError.value = null
    mockWageIsFetching.value = false
    mockUserDataStore.address = userAddress
    mockTeamStore.currentTeamId = '1'
    mockTeamStore.currentTeam = {
      ...mockTeamStore.currentTeam,
      id: '1',
      ownerAddress,
      members: [...baseMembers]
    }
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: {
        ...mockTeamStore.currentTeam,
        ownerAddress,
        members: [...baseMembers]
      }
    }

    vi.mocked(useGetTeamWagesQuery).mockReturnValue({
      data: mockWageData,
      isLoading: mockWageIsFetching,
      error: mockWageError
    } as ReturnType<typeof useGetTeamWagesQuery>)

    wrapper = mount(MemberSection, {
      global: {
        stubs: {
          IconifyIcon: {
            name: 'IconifyIcon',
            template: '<span data-test="iconify-icon" />'
          },
          UButton: {
            name: 'UButton',
            emits: ['click'],
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
          },
          CardComponent: {
            name: 'CardComponent',
            props: ['title'],
            template:
              '<div data-test="card-component"><div data-test="card-title">{{ title }}</div><slot name="card-action" /><slot /></div>'
          },
          TableComponent: {
            name: 'TableComponent',
            props: ['rows', 'loading', 'columns'],
            template: `
              <div data-test="table">
                <div
                  v-for="(row, index) in rows || []"
                  :key="row.address ?? index"
                  :data-test="String(index) + '-row'"
                >
                  <slot name="member-data" :row="row">{{ row.name }}</slot>
                  <slot name="maxWeeklyHours-data" :row="row" />
                  <slot name="wage-data" :row="row" />
                  <slot
                    v-if="(columns || []).some((column) => column.key === 'action')"
                    name="action-data"
                    :row="row"
                  />
                </div>
              </div>
            `
          },
          UserComponent: {
            name: 'UserComponent',
            props: ['user'],
            template: '<div data-test="user-component">{{ user.name }}</div>'
          },
          ModalComponent: {
            name: 'ModalComponent',
            props: ['modelValue'],
            emits: ['update:modelValue', 'reset'],
            template: '<div data-test="modal-component"><slot /></div>'
          },
          AddMemberForm: {
            name: 'AddMemberForm',
            props: ['teamId'],
            emits: ['memberAdded'],
            template: '<div data-test="add-member-form" />'
          },
          DeleteMemberModal: {
            name: 'DeleteMemberModal',
            props: ['member', 'teamId'],
            template: '<div data-test="delete-member-modal" />'
          },
          SetMemberWageModal: {
            name: 'SetMemberWageModal',
            props: ['member', 'teamId', 'wage'],
            template: '<div data-test="set-member-wage-modal" />'
          }
        },
        plugins: [
          createTestingPinia({
            createSpy: vi.fn
          })
        ]
      }
    })

    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockToastStore.addErrorToast.mockClear()
    createWrapper()
  })

  describe('Wage Rendering', () => {
    it('renders N/A values when wage data is empty', async () => {
      mockWageData.value = []
      await wrapper.vm.$nextTick()

      const firstRow = wrapper.find('[data-test="0-row"]')
      expect(firstRow.text()).toContain('N/A')
    })

    it('renders member wage values when wage data is found', () => {
      const firstRow = wrapper.find('[data-test="0-row"]')

      expect(firstRow.text()).toContain('Member 1')
      expect(firstRow.text()).toContain('40 hrs/wk')
      expect(firstRow.text()).toContain(`20 ${NETWORK.currencySymbol}/hr`)
      expect(firstRow.text()).toContain('50 USDC/hr')
      expect(firstRow.text()).toContain('10 SHER/hr')
    })

    it('renders overtime values for members with overtime rates', () => {
      const secondRow = wrapper.find('[data-test="1-row"]')

      expect(secondRow.text()).toContain('30 hrs/wk')
      expect(secondRow.text()).toContain('OT: 5 hrs/wk')
      expect(secondRow.text()).toContain(`OT: 35 ${NETWORK.currencySymbol}/hr`)
      expect(secondRow.text()).toContain('OT: 55 USDC/hr')
      expect(secondRow.text()).toContain('OT: 20 SHER/hr')
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

    // it('renders Add Member button only for team owner', () => {
    //   createWrapper('0x1234' as Address, '0x1234' as Address)
    //   const addButton = wrapper.find('[data-test="add-member-button"]')
    //   expect(addButton.exists()).toBe(true)
    // })

    it('does not render Add Member button for non-owners', () => {
      createWrapper('0xowner' as Address, '0xnotowner' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      expect(addButton.exists()).toBe(false)
    })

    it('displays loading skeletons when data is fetching', async () => {
      mockWageIsFetching.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('skeleton')
    })
  })

  describe('User Interactions', () => {
    it('opens modal when Add Member button is clicked', async () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="add-member-form"]').exists()).toBe(true)
    })

    it('closes modal when memberAdded event is emitted', async () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      const addMemberForm = wrapper.findComponent({ name: 'AddMemberForm' })
      expect(addMemberForm.exists()).toBe(true)

      await addMemberForm.vm.$emit('memberAdded')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="add-member-form"]').exists()).toBe(false)
    })

    it('closes modal on reset event', async () => {
      createWrapper('0x1234' as Address, '0x1234' as Address)
      const addButton = wrapper.find('[data-test="add-member-button"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent({ name: 'ModalComponent' })
      expect(wrapper.find('[data-test="add-member-form"]').exists()).toBe(true)

      await modal.vm.$emit('reset')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="add-member-form"]').exists()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('shows error toast when wage data fetch fails', async () => {
      mockWageError.value = new Error('New error')
      await wrapper.vm.$nextTick()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to fetch team wage data')
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
