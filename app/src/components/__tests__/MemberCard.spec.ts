import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberCard from '@/components/MemberCard.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'

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
    it('Should render the component', () => {
      expect(wrapper.exists()).toBeTruthy()
    })

    it('Should display member name and address', () => {
      expect(wrapper.text()).toContain(props.member.name)
      expect(wrapper.text()).toContain(props.member.address)
    })
    it('Should show delete member button when user is team owner', () => {
      const deleteButton = wrapper.find('button.btn-error')
      expect(deleteButton.exists()).toBe(true)
    })

    describe('Modal Interaction', () => {
      it('Should toggle modal visibility on button click', async () => {
        const deleteButton = wrapper.find('button')
        await deleteButton.trigger('click')
        expect((wrapper as any).vm.showDeleteConfirmModal).toBe(true)
      })

      it('Should emit deleteMember event with correct arguments', async () => {
        const deleteButton = wrapper.find('button.btn-error')
        await deleteButton.trigger('click')

        const deleteModalButton = wrapper.findComponent(DeleteConfirmModal).find('button.btn-error')
        await deleteModalButton.trigger('click')

        const deleteEvent: any = wrapper.emitted('deleteMember')
        expect(deleteEvent).toBeTruthy()
        expect(deleteEvent[0]).toEqual([teamId, member.address])
      })
    })
  })
})
