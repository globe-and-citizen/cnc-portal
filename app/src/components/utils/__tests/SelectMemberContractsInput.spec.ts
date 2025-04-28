import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SelectMemberContractsInput from '../SelectMemberContractsInput.vue'

interface Item {
  name: string
  address: string
  type?: 'member' | 'contract'
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

// Create a wrapper component that properly handles v-model
const WrapperComponent = defineComponent({
  components: { SelectMemberContractsInput },
  template: '<SelectMemberContractsInput v-model="model" @selectItem="onSelectItem" />',
  emits: ['selectItem'],
  data() {
    return {
      model: {
        name: '',
        address: ''
      }
    }
  },
  methods: {
    onSelectItem(item: Item) {
      this.$emit('selectItem', item)
    }
  }
})

describe('SelectMemberContractsInput.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
    wrapper = mount(WrapperComponent)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('shows dropdown with only members when name matches', async () => {
    const nameInput = wrapper.find('[data-test="member-contracts-name-input"]')
    await nameInput.setValue('John')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="search-dropdown"]').exists()).toBe(true)
    expect(wrapper.find('.menu-title span').text()).toBe('Team Members')
    expect(wrapper.find('[data-test="user-dropdown-0x123"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="contract-dropdown-0x789"]').exists()).toBe(false)
  })

  it('shows dropdown with only contracts when name matches contract type', async () => {
    const nameInput = wrapper.find('[data-test="member-contracts-name-input"]')
    await nameInput.setValue('Bank')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="search-dropdown"]').exists()).toBe(true)
    expect(wrapper.findAll('.menu-title span').at(0)?.text()).toBe('Contracts')
    expect(wrapper.find('[data-test="contract-dropdown-0x789"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="user-dropdown-0x123"]').exists()).toBe(false)
  })

  it('shows both members and contracts when both match', async () => {
    const addressInput = wrapper.find('[data-test="member-contracts-address-input"]')
    await addressInput.setValue('0x')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="search-dropdown"]').exists()).toBe(true)
    const titles = wrapper.findAll('.menu-title span').map((el) => el.text())
    expect(titles).toContain('Team Members')
    expect(titles).toContain('Contracts')
  })

  it('emits selectItem when clicking a member in the dropdown', async () => {
    const nameInput = wrapper.find('[data-test="member-contracts-name-input"]')
    await nameInput.setValue('John')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()

    const memberItem = wrapper.find('[data-test="user-dropdown-0x123"]')
    expect(memberItem.exists()).toBe(true)
    await memberItem.trigger('click')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('selectItem')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0][0]).toEqual({ name: 'John Doe', address: '0x123', type: 'member' })
  })

  it('emits selectItem when clicking a contract in the dropdown', async () => {
    const nameInput = wrapper.find('[data-test="member-contracts-name-input"]')
    await nameInput.setValue('Bank')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()

    const contractItem = wrapper.find('[data-test="contract-dropdown-0x789"]')
    expect(contractItem.exists()).toBe(true)
    await contractItem.trigger('click')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('selectItem')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0][0]).toEqual({ name: 'Bank', address: '0x789', type: 'contract' })
  })

  it('shows and hides dropdown based on watcher (debounced)', async () => {
    const nameInput = wrapper.find('[data-test="member-contracts-name-input"]')
    await nameInput.setValue('Jane')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="search-dropdown"]').exists()).toBe(true)

    await nameInput.setValue('')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="search-dropdown"]').exists()).toBe(false)
  })

  it('adds animate-pulse class when isFetching is true', async () => {
    mockTeamStore.currentTeamMeta.teamIsFetching = true
    wrapper = mount(WrapperComponent)
    expect(wrapper.find('[data-test="member-contracts-input"]').classes()).toContain(
      'animate-pulse'
    )
    mockTeamStore.currentTeamMeta.teamIsFetching = false
  })
})
