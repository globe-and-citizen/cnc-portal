import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/MemberCard.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'

describe('MemberCard', () => {
  const member = { name: 'Dasarath', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }
  const teamId = 1
  const ownerAddress = '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
  const props = { member, teamId, ownerAddress }
  const wrapper = mount(MemberCard, {
    props,
    global: {
      stubs: {
        DeleteConfirmModal: {
          template: '<button @click="$emit(\'deleteMember\')"></button>'
        }
      }
    }
  })
  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should render the component', () => {
      expect(wrapper.exists()).toBeTruthy()
    })

    it('Should display member name and address', () => {
      expect(wrapper.text()).toContain(props.member.name)
      expect(wrapper.text()).toContain(props.member.address)
    })
  })
})
