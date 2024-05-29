import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MemberCard from '@/components/MemberCard.vue'
import UpdateMemberModal from '@/components/modals/UpdateMemberModal.vue'

describe('MemberCard.vue', () => {
  const member = {
    id: '1',
    name: 'John Doe',
    walletAddress: '0xc0ffee254729296a45a3885639AC7E10F9d54979'
  }
  it('should emit toggleUpdateMemberModal with member data on row click', async () => {
    const wrapper = mount(MemberCard, {
      props: {
        showUpdateMemberModal: false,
        member: member,
        updateMemberInput: {}
      }
    })

    await wrapper.find('tr').trigger('click')
    expect(wrapper.emitted().toggleUpdateMemberModal).toBeTruthy()
    expect(wrapper.emitted().toggleUpdateMemberModal[0]).toEqual([member])
  })

  it('should pass props to UpdateMemberModal correctly', () => {
    const updateMemberInput = { id: '1', name: 'John Doe' }
    const wrapper = mount(MemberCard, {
      props: {
        showUpdateMemberModal: true,
        member: member,
        updateMemberInput: updateMemberInput
      }
    })

    const modal = wrapper.findComponent(UpdateMemberModal)
    expect(modal.exists()).toBe(true)
    expect(modal.props()).toEqual({
      showUpdateMemberModal: true,
      updateMemberInput: updateMemberInput
    })
  })

  it('should emit updateMember with member id when UpdateMemberModal emits updateMember', async () => {
    const wrapper = mount(MemberCard, {
      props: {
        showUpdateMemberModal: false,
        member: member,
        updateMemberInput: {}
      }
    })

    const modal = wrapper.findComponent(UpdateMemberModal)
    await modal.vm.$emit('updateMember', member.id)
    expect(wrapper.emitted().updateMember).toBeTruthy()
    expect(wrapper.emitted().updateMember[0]).toEqual([member.id])
  })

  it('should emit deleteMember with member id when UpdateMemberModal emits deleteMember', async () => {
    const wrapper = mount(MemberCard, {
      props: {
        showUpdateMemberModal: false,
        member: member,
        updateMemberInput: {}
      }
    })

    const modal = wrapper.findComponent(UpdateMemberModal)
    await modal.vm.$emit('deleteMember', member.id)
    expect(wrapper.emitted().deleteMember).toBeTruthy()
    expect(wrapper.emitted().deleteMember[0]).toEqual([member.id])
  })
})
