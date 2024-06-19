import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/MemberCard.vue'

describe('MemberCard', () => {
  const member = { name: 'Dasarath', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }
  const teamId = 1
  const ownerAddress = '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
  const isMemberDeleting = false
  const props = { member, teamId, ownerAddress, isMemberDeleting }
  const wrapper = mount(MemberCard, {
    props
  })
  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should display member name and address', () => {
      expect(wrapper.text()).toContain(props.member.name)
      expect(wrapper.text()).toContain(props.member.address)
    })
  })
})
