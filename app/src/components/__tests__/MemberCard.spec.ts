import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/MemberCard.vue'
import { useUserDataStore } from '@/stores/user'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn()
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
    props
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
  describe('Emits', () => {
    it('emits deleteMember event when delete button is clicked', async () => {
      const wrapper = mount(MemberCard, {
        props: {
          member: { name: 'John Doe', address: '0x123' },
          teamId: 1,
          ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })
      await wrapper.find('button[data-test="delete-member-button"]').trigger('click')

      expect(wrapper.emitted().deleteMember).toBeTruthy()
      expect(wrapper.emitted().deleteMember[0]).toEqual([{ name: 'John Doe', address: '0x123' }])
    })
  })
})
