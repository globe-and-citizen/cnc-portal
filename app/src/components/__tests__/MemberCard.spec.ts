import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/sections/SingleTeamView/MemberCard.vue'
import { useUserDataStore } from '@/stores/user'
import { NETWORK } from '@/constant'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'

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
  const actual: any = await importOriginal()
  return {
    ...actual,
    useClipboard: vi.fn(() => mockClipboard)
  }
})
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
    ;(useUserDataStore as any).mockReturnValue(userDataStore)
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
})
