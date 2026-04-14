import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useQueryClient } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import { useToggleWageStatusMutation } from '@/queries/wage.queries'
import MemberSection from '../MemberSection.vue'

vi.mock('@/queries/team.queries', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    teamKeys: {
      detail: (id: string) => ['team', id]
    }
  }
})

vi.mock('@nuxt/ui/components/Table.vue', () => ({
  default: {
    name: 'UTable',
    props: ['data', 'columns', 'loading'],
    template: `
      <div data-test="members-table-stub">
        <div data-test="table-loading">{{ String(loading) }}</div>
        <div data-test="column-count">{{ columns.length }}</div>
          <slot name="wage-header" />
        <div v-for="row in data" :key="row.address" :data-test="'row-' + row.address">
          <slot name="member-cell" :row="{ original: row }" />
          <slot name="standard-cell" :row="{ original: row }" />
          <slot name="overtime-cell" :row="{ original: row }" />
          <slot
            v-if="columns.some((column) => column.id === 'action')"
            name="action-cell"
            :row="{ original: row }"
          />
        </div>
      </div>
    `
  }
}))

const mockMutateToggle = vi.fn()
const mockInvalidateQueries = vi.fn()

const teamStoreState = {
  currentTeamId: '1',
  currentTeamMeta: {
    isPending: false,
    data: {
      name: 'Core Team',
      ownerAddress: '0xOWNER',
      members: [
        {
          name: 'Alice',
          address: '0xAAA',
          imageUrl: '',
          currentWage: {
            id: 11,
            disabled: false,
            maximumHoursPerWeek: 40,
            maximumOvertimeHoursPerWeek: 10,
            ratePerHour: [{ type: 'native', amount: 20 }],
            overtimeRatePerHour: [{ type: 'native', amount: 25 }]
          }
        },
        {
          name: 'Bob',
          address: '0xBBB',
          imageUrl: '',
          currentWage: {
            id: 12,
            disabled: true,
            maximumHoursPerWeek: 30,
            maximumOvertimeHoursPerWeek: 0,
            ratePerHour: [{ type: 'native', amount: 15 }],
            overtimeRatePerHour: []
          }
        },
        {
          name: 'Charlie',
          address: '0xCCC',
          imageUrl: '',
          currentWage: null
        }
      ]
    }
  }
}

const userStoreState = {
  address: '0xOWNER'
}

const makeWrapper = () =>
  mount(MemberSection, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        UserComponent: { template: '<div data-test="user-component" />' },
        RateDotList: { template: '<div data-test="rate-dot-list" />' },
        AddMemberForm: {
          emits: ['memberAdded'],
          template:
            '<button data-test="emit-member-added" @click="$emit(\'memberAdded\')">ok</button>'
        },
        DeleteMemberModal: { template: '<div data-test="delete-member-modal" />' },
        SetMemberWageModal: { template: '<div data-test="set-member-wage-modal" />' }
      }
    }
  })

describe('MemberSection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useTeamStore).mockReturnValue(teamStoreState as never)
    vi.mocked(useUserDataStore).mockReturnValue(userStoreState as never)
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidateQueries
    } as never)
    vi.mocked(useToggleWageStatusMutation).mockReturnValue({
      mutate: mockMutateToggle,
      isPending: ref(false)
    } as never)
  })

  it('renders owner action column and add-member button for owner', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-test="add-member-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="column-count"]').text()).toBe('5')
    expect(wrapper.text()).toContain('SHER')
  })

  it('hides owner-only actions for non-owner users', () => {
    vi.mocked(useUserDataStore).mockReturnValue({ address: '0xNOT_OWNER' } as never)
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-test="add-member-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="column-count"]').text()).toBe('4')
    expect(wrapper.find('[data-test="delete-member-modal"]').exists()).toBe(false)
  })

  it('opens and closes add-member modal through click, event and modal close', async () => {
    const wrapper = makeWrapper()

    expect(wrapper.find('[data-test="emit-member-added"]').exists()).toBe(false)
    await wrapper.find('[data-test="add-member-button"]').trigger('click')
    expect(wrapper.find('[data-test="emit-member-added"]').exists()).toBe(true)

    await wrapper.find('[data-test="emit-member-added"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="emit-member-added"]').exists()).toBe(false)

    await wrapper.find('[data-test="add-member-button"]').trigger('click')
    expect(wrapper.find('[data-test="emit-member-added"]').exists()).toBe(true)
    await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="emit-member-added"]').exists()).toBe(false)
  })

  it('does not mount AddMemberForm when current team id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValue({
      ...teamStoreState,
      currentTeamId: ''
    } as never)

    const wrapper = makeWrapper()
    await wrapper.find('[data-test="add-member-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="emit-member-added"]').exists()).toBe(false)
  })

  it('renders standard/overtime placeholders and values for wage states', () => {
    const wrapper = makeWrapper()
    const firstRowText = wrapper.find('[data-test="row-0xAAA"]').text()
    const secondRowText = wrapper.find('[data-test="row-0xBBB"]').text()
    const thirdRowText = wrapper.find('[data-test="row-0xCCC"]').text()

    expect(firstRowText).toContain('40h/wk')
    expect(firstRowText).toContain('10h/wk')
    expect(secondRowText).toContain('30h/wk')
    expect(secondRowText).toContain('0h/wk')
    expect(thirdRowText).toContain('—')
  })

  it('disables toggle button when member has no current wage', () => {
    const wrapper = makeWrapper()
    const noWageRowButtons = wrapper.find('[data-test="row-0xCCC"]').findAll('button')
    const toggleButton = noWageRowButtons.find((btn) => {
      const testAttr = btn.attributes('data-test')
      return testAttr === 'pause-wage-button' || testAttr === 'resume-wage-button'
    })

    expect(toggleButton).toBeDefined()
    expect(toggleButton?.attributes('disabled')).toBeDefined()
  })

  it('calls toggle mutation success path and invalidates team detail query', async () => {
    mockMutateToggle.mockImplementationOnce((_payload, options) => {
      options?.onSuccess?.()
    })
    const wrapper = makeWrapper()

    await wrapper.find('[data-test="row-0xAAA"] [data-test="pause-wage-button"]').trigger('click')

    expect(mockMutateToggle).toHaveBeenCalledWith(
      {
        pathParams: { wageId: 11 },
        queryParams: { action: 'disable' }
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
    expect(mockInvalidateQueries).toHaveBeenCalled()
  })

  it('calls toggle mutation error path', async () => {
    mockMutateToggle.mockImplementationOnce((_payload, options) => {
      options?.onError?.()
    })

    const wrapper = makeWrapper()
    await wrapper.find('[data-test="row-0xBBB"] [data-test="resume-wage-button"]').trigger('click')

    expect(mockMutateToggle).toHaveBeenCalled()
  })

  it('passes table loading when team meta is pending or toggling is pending', () => {
    vi.mocked(useToggleWageStatusMutation).mockReturnValue({
      mutate: mockMutateToggle,
      isPending: computed(() => true)
    } as never)

    const wrapper = makeWrapper()
    expect(wrapper.find('[data-test="table-loading"]').text()).toBe('true')
  })
})
