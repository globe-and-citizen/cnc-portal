import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/MemberCard.vue'

describe('MemberCard', () => {
  const props = {
    member: { name: 'Dasarath', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' },
    teamId: 1
  }

  const wrapper = mount(MemberCard, { props })

  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should render the component', () => {
      expect(wrapper.exists()).toBeTruthy()
    })

    it('Should display member name and address', () => {
      expect(wrapper.text()).toContain(props.member.name)
      expect(wrapper.text()).toContain(props.member.address)
    })

    it('Should render a delete button', () => {
      expect(wrapper.find('button').text()).toContain('Delete')
    })
  })

  describe('Emits', () => {
    it('Should emit deleteMember event with correct arguments when delete button is clicked', async () => {
      await wrapper.find('button').trigger('click')
      expect(wrapper.emitted('deleteMember')).toBeTruthy()
    })
  })
})
