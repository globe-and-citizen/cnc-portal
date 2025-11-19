import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import SelectMemberItem from '@/components/SelectMemberItem.vue'
import type { User } from '@/types'

const mockTeamStore = {
  currentTeam: {
    id: '1',
    name: 'Team A',
    members: [
      {
        id: 'user-1',
        name: 'Alice',
        address: '0x1111111111111111111111111111111111111111'
      },
      {
        id: 'user-2',
        name: 'Bob',
        address: '0x2222222222222222222222222222222222222222'
      }
    ] as User[]
  }
}

const mockRouterPush = vi.fn()

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: mockRouterPush
    }))
  }
})

describe('SelectMemberItem', () => {
  const defaultAddress = mockTeamStore.currentTeam.members[0].address as `0x${string}`

  const createWrapper = (props: Partial<{ address: `0x${string}` }> = {}) => {
    const address = (props.address ?? defaultAddress) as `0x${string}`
    return mount(SelectMemberItem, {
      props: {
        address,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      attachTo: document.body
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Component Rendering', () => {
    it('should render trigger and open dropdown on click', async () => {
      const wrapper = createWrapper()

      const trigger = wrapper.find('[data-test="select-member-item-trigger"]')
      expect(trigger.exists()).toBe(true)

      // Initially closed
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(false)

      await trigger.trigger('click')

      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)
    })

    it('should display selected user in trigger when address matches a member', () => {
      const selectedAddress = mockTeamStore.currentTeam.members[1].address as `0x${string}`
      const wrapper = createWrapper({ address: selectedAddress })

      const selectedUser = wrapper.find('[data-test="select-member-item-selected-user"]')
      expect(selectedUser.exists()).toBe(true)
    })
  })

  describe('Selection Behavior', () => {
    it('should navigate to selected member claim history on click', async () => {
      const wrapper = createWrapper()

      // Open dropdown
      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')

      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      expect(options.length).toBeGreaterThan(0)

      const targetMember = mockTeamStore.currentTeam.members[0]

      await options[0].trigger('click')

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'claim-history',
        params: {
          id: mockTeamStore.currentTeam.id,
          memberAddress: targetMember.address
        }
      })
    })

    it('should not navigate if teamId is missing', async () => {
      ;(mockTeamStore.currentTeam as Partial<typeof mockTeamStore.currentTeam>).id = undefined

      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')
      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      await options[0].trigger('click')

      expect(mockRouterPush).not.toHaveBeenCalled()

      // Remettre l'id pour ne pas polluer d'autres tests
      mockTeamStore.currentTeam.id = '1'
    })
  })

  describe('Search and filtering', () => {
    it('should filter members based on search input', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')

      const searchInput = wrapper.find('[data-test="select-member-item-search"]')
      expect(searchInput.exists()).toBe(true)

      await searchInput.setValue('Bob')

      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      // On ne doit voir que Bob
      expect(options).toHaveLength(1)
      expect(options[0].text()).toContain('Bob')
    })

    it('should show empty state when no member matches search', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')

      const searchInput = wrapper.find('[data-test="select-member-item-search"]')
      await searchInput.setValue('ZZZZZ')

      const emptyState = wrapper.find('[data-test="select-member-item-empty"]')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No member found')
    })
  })

  describe('Click outside behavior', () => {
    it('should close dropdown when clicking outside', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)

      // Simule un click en dehors du composant
      document.body.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(false)
    })
  })
})
