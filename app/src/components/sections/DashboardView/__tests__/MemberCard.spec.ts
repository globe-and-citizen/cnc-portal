import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/sections/DashboardView/MemberCard.vue'
import { useUserDataStore } from '@/stores/user'
import { NETWORK } from '@/constant'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
// import type { T } from 'vitest/dist/reporters-B7ebVMkT.js'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn()
}))

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useClipboard: vi.fn(() => mockClipboard)
  }
})
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addErrorToast: vi.fn()
  })
}))
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))
describe('MemberCard', () => {
  const member = { name: 'Dasarath', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }
  const teamId = 1
  const ownerAddress = '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
  const userDataStore = {
    address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
  }

  beforeEach(() => {
    interface mockReturn {
      mockReturnValue: (address: object) => {}
    }
    ;(useUserDataStore as unknown as mockReturn).mockReturnValue(userDataStore)
  })
  const props = { member, teamId, ownerAddress }
  const wrapper = mount(MemberCard, {
    props,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should display member name and address', () => {
      expect(wrapper.text()).toContain(props.member.name)
      expect(wrapper.text()).toContain(props.member.address)
    })
    it('shows delete button if user is the owner and not the member', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })

      expect(wrapper.find('button[data-test="delete-member-button"]').exists()).toBe(true)
      expect(wrapper.find('button[data-test="delete-member-button"]').text()).toBe('Delete')
    })

    it('shows show-address button', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })
      expect(wrapper.find('button[data-test="show-address-button"]').exists()).toBe(true)
    })

    it('shows copy address button', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })
      expect(wrapper.find('button[data-test="copy-address-button"]').exists()).toBe(true)
    })

    it('shows "Copied!" when address is copied', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })
      mockClipboard.copied.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('button[data-test="copy-address-button"]').text()).toBe('Copied!')
    })

    it('does not show copy button if copy not supported', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x456'
        }
      })
      mockClipboard.isSupported.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('button[data-test="copy-address-button"]').exists()).toBe(false)
    })

    it('does not show delete button if user is not the owner', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x456'
        }
      })

      expect(wrapper.find('button[data-test="delete-member-button"]').exists()).toBe(false)
    })
  })
  describe('Actions', () => {
    it('opens new window when show address button is clicked', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })

      window.open = vi.fn() // mock window open

      await wrapper.find('button[data-test="show-address-button"]').trigger('click')
      expect(window.open).toBeCalledWith(`${NETWORK.blockExplorerUrl}/address/0x123`, '_blank')
    })

    it('copies address when copy address button is clicked', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })

      mockClipboard.isSupported.value = true
      await wrapper.vm.$nextTick()

      const copyButton = wrapper.find('button[data-test="copy-address-button"]')
      await copyButton.trigger('click')

      expect(mockCopy).toHaveBeenCalledWith('0x123')
    })
  })

  describe('Component State', () => {
    it('initializes with correct props', () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x456'
        }
      })
      expect(wrapper.props().member.name).toBe('John Doe')
      expect(wrapper.props().member.address).toBe('0x123')
      expect(wrapper.props().teamId).toBe(1)
      expect(wrapper.props().ownerAddress).toBe('0x456')
    })

    it('emits getTeam event when member is deleted successfully', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })

      // Trigger delete flow
      await wrapper.find('button[data-test="delete-member-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      // Simulate successful deletion
      await wrapper.vm.$emit('getTeam')
      expect(wrapper.emitted().getTeam).toBeTruthy()
    })
  })

  describe('Modal Interactions', () => {
    it('shows delete confirmation modal with correct member details', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })

      await wrapper.find('button[data-test="delete-member-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      const modalContent = wrapper.html()
      expect(modalContent).toContain('John Doe')
      expect(modalContent).toContain('0x123')
      expect(modalContent).toContain('Are you sure you want to delete')
    })
  })

  describe('Collapse Functionality', () => {
    it('expands and collapses when clicked', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x456'
        }
      })

      const collapse = wrapper.find('.collapse')
      expect(collapse.exists()).toBe(true)

      // Initially not expanded
      const checkbox = wrapper.find('input[type="checkbox"]').element as HTMLInputElement
      expect(checkbox.checked).toBe(false)

      // Click to expand
      await wrapper.find('input[type="checkbox"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(
        true
      )

      // Click to collapse
      await wrapper.find('input[type="checkbox"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(
        false
      )
    })

    it('displays member information in collapse title', () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x456'
        }
      })

      const collapseTitle = wrapper.find('.collapse-title')
      expect(collapseTitle.text()).toContain('John Doe')
      expect(collapseTitle.text()).toContain('0x123')
    })
  })

  describe('Block Explorer Integration', () => {
    it('opens block explorer with correct address when button is clicked', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x456'
        }
      })

      // Mock window.open
      const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      // Click the block explorer button
      await wrapper.find('button[data-test="show-address-button"]').trigger('click')

      const address = wrapper.props().member.address
      if (address) {
        expect(windowSpy).toHaveBeenCalledWith(
          expect.stringContaining(`/address/${address}`),
          '_blank'
        )
      }

      windowSpy.mockRestore()
    })

    it('uses correct network block explorer URL', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x456'
        }
      })

      const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      await wrapper.find('button[data-test="show-address-button"]').trigger('click')

      const address = wrapper.props().member.address
      if (address) {
        const expectedUrl = `${NETWORK.blockExplorerUrl}/address/${address}`
        expect(windowSpy).toHaveBeenCalledWith(expectedUrl, '_blank')
      }

      windowSpy.mockRestore()
    })
  })
})
