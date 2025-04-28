import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import SelectMemberContractsInput from '../SelectMemberContractsInput.vue'

interface Item {
  name: string
  address: string
}

interface ComponentInstance {
  selectItem: (item: Item, type: 'member' | 'contract') => void
  $nextTick: () => Promise<void>
}

// Mock team store
const mockTeamStore = {
  currentTeam: {
    members: [
      { name: 'John Doe', address: '0x123' },
      { name: 'Jane Smith', address: '0x456' }
    ],
    teamContracts: [
      { type: 'Bank', address: '0x789' },
      { type: 'Expense', address: '0xabc' }
    ]
  },
  currentTeamMeta: {
    teamIsFetching: false
  }
}

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

describe('SelectMemberContractsInput.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(SelectMemberContractsInput, {
      props: {
        modelValue: {
          name: '',
          address: ''
        }
      }
    })
  })

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('emits selectItem event when member is selected', async () => {
    const member = { name: 'John Doe', address: '0x123' }
    const component = wrapper.vm as unknown as ComponentInstance
    component.selectItem(member, 'member')
    const emitted = wrapper.emitted('selectItem')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0][0]).toEqual({
      ...member,
      type: 'member'
    })
  })

  it('emits selectItem event when contract is selected', async () => {
    const contract = { name: 'Bank', address: '0x789' }
    const component = wrapper.vm as unknown as ComponentInstance
    component.selectItem(contract, 'contract')
    const emitted = wrapper.emitted('selectItem')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0][0]).toEqual({
      ...contract,
      type: 'contract'
    })
  })

  it('handles empty team data', async () => {
    mockTeamStore.currentTeam = {
      members: [],
      teamContracts: []
    }
    await wrapper.setProps({
      modelValue: {
        name: 'test',
        address: ''
      }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="search-dropdown"]').exists()).toBe(false)
  })
})
