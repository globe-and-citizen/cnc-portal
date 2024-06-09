import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/MemberCard.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'

describe('MemberCard', () => {
  const member = { name: 'Dasarath', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }
  const teamId = 1
  const isOwner = false
  const props = { member, teamId, isOwner }
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

  describe('Emits', () => {
    it('Should emit deleteMember event when deleteMember event is received', async () => {
      await wrapper.find('button.btn-error').trigger('click')
      expect((wrapper.vm as any)?.showDeleteConfirmModal).toBe(true)

      // Simulate deleteMember event from modal
      await wrapper.findComponent(DeleteConfirmModal).vm.$emit('deleteMember')

      const emittedEvents = wrapper.emitted('deleteMember')
      expect(emittedEvents).toBeTruthy()
      if (emittedEvents) {
        expect(emittedEvents[0]).toEqual([teamId, member.address])
      }
    })
  })
})
