import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import SelectMemberItem from '@/components/SelectMemberItem.vue'
import { mockTeamStore, mockRouterPush } from '@/tests/mocks/index'
import type { Address } from 'viem'

describe('SelectMemberItem', () => {
  const defaultAddress = '0x1111111111111111111111111111111111111111' as Address

  const createWrapper = (props: Partial<{ address: Address }> = {}) => {
    const address = (props.address ?? defaultAddress) as Address
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
    mockRouterPush.mockClear()
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
      const selectedAddress = '0x1111111111111111111111111111111111111111' as Address
      const wrapper = createWrapper({ address: selectedAddress })

      const selectedUser = wrapper.find('[data-test="select-member-item-selected-user"]')
      expect(selectedUser.exists()).toBe(true)
    })

    it('should not display selected user in trigger when address does not match members', () => {
      const unknownAddress = '0x9999999999999999999999999999999999999999' as Address
      const wrapper = createWrapper({ address: unknownAddress })

      const selectedUser = wrapper.find('[data-test="select-member-item-selected-user"]')
      expect(selectedUser.exists()).toBe(false)
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

      if (options[0] && targetMember) {
        await options[0].trigger('click')
      }

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'payroll-history',
        params: {
          id: mockTeamStore.currentTeamId,
          memberAddress: targetMember!.address
        }
      })
    })

    it('should not navigate if teamId is missing', async () => {
      const originalId = mockTeamStore.currentTeamId
      mockTeamStore.currentTeamId = undefined

      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')
      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      expect(options.length).toBeGreaterThan(0)
      if (options[0]) {
        await options[0].trigger('click')
      }

      expect(mockRouterPush).not.toHaveBeenCalled()

      mockTeamStore.currentTeamId = originalId
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
      expect(options[0]?.text()).toContain('Bob')
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

    it('should filter members by address when search matches address', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')

      const searchInput = wrapper.find('[data-test="select-member-item-search"]')
      await searchInput.setValue('1234567890')

      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      expect(options).toHaveLength(1)
      expect(options[0]?.text()).toContain('Member 1')
    })

    it('should handle members with missing name/address when filtering', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')

      const searchInput = wrapper.find('[data-test="select-member-item-search"]')
      expect(searchInput.exists()).toBe(true)

      await searchInput.setValue('Member')
      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      expect(options.length).toBeGreaterThan(0)
    })
  })

  describe('Click outside behavior', () => {
    it('should close dropdown when clicking trigger twice', async () => {
      const wrapper = createWrapper()

      const trigger = wrapper.find('[data-test="select-member-item-trigger"]')
      await trigger.trigger('click')
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)

      await trigger.trigger('click')
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(false)
    })

    it('should close dropdown when clicking outside', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)

      // Simule un click en dehors du composant
      document.body.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(false)
    })

    it('should stay open when clicking inside component', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)

      await wrapper.find('[data-test="select-member-item-search"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)
    })

    it('should not throw when document click happens after unmount while open', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')
      wrapper.unmount()

      expect(() => document.body.click()).not.toThrow()
    })
  })
})
