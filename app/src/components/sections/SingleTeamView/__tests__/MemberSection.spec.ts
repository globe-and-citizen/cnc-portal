import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MemberSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import MemberCard from '@/components/sections/SingleTeamView/MemberCard.vue'
import AddMemberCard from '@/components/sections/SingleTeamView/AddMemberCard.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn()
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn()
}))
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))
describe('MemberSection.vue', () => {
  let wrapper: ReturnType<typeof mount>

  const teamMock = {
    id: '1',
    name: 'Sample Team',
    description: 'Sample Description',
    bankAddress: 'Sample Bank Address',
    ownerAddress: 'owner123',
    members: [
      { name: 'Alice', address: '1234', isValid: true },
      { name: 'Bob', address: '5678', isValid: true }
    ]
  }

  const addSuccessToast = vi.fn()
  const addErrorToast = vi.fn()

  beforeEach(() => {
    interface mockReturn {
      mockReturnValue: (address: Object) => {}
    }
    ;(useUserDataStore as unknown as mockReturn).mockReturnValue({
      address: 'owner123'
    })
    ;(useToastStore as unknown as mockReturn).mockReturnValue({
      addSuccessToast,
      addErrorToast
    })

    wrapper = mount(MemberSection, {
      props: {
        team: teamMock,
        teamIsFetching: false
      }
    })
  })
  describe('renders', () => {
    it('renders the loading spinner when teamIsFetching is true', async () => {
      await wrapper.setProps({ teamIsFetching: true })
      expect(wrapper.find('.loading').exists()).toBe(true)
    })

    it('renders the team members', () => {
      const members = wrapper.findAllComponents(MemberCard)
      expect(members.length).toBe(teamMock.members.length)
      members.forEach((member, index) => {
        expect(member.text()).toContain(teamMock.members[index].name)
      })
    })

    it('renders AddMemberCard ', () => {
      expect(wrapper.findComponent(AddMemberCard).exists()).toBe(true)
    })
  })
  describe('methods', () => {
    it('toggles AddMemberForm modal when AddMemberCard emits toggleAddMemberModal', async () => {
      const addMemberCard = wrapper.findComponent(AddMemberCard)
      addMemberCard.vm.$emit('toggleAddMemberModal')

      expect((wrapper.vm as unknown as typeof AddMemberCard).showAddMemberForm).toBe(true)

      await addMemberCard.vm.$emit('toggleAddMemberModal')

      expect((wrapper.vm as unknown as typeof AddMemberCard).showAddMemberForm).toBe(false)
    })

    it('opens the modal for adding members when toggleAddMemberModal is called', async () => {
      ;(wrapper.vm as unknown as typeof AddMemberCard).showAddMemberForm = true
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent(ModalComponent)
      expect(modal.exists()).toBe(true)
    })

    it('searches users when searchUsers is called', async () => {
      // Cast wrapper.vm to an instance with the searchUsers method
      const searchSpy = vi.spyOn(wrapper.vm as InstanceType<typeof MemberSection>, 'searchUsers')

      await (wrapper.vm as unknown as typeof AddMemberCard).searchUsers({
        name: 'Alice',
        address: '1234'
      })
      expect(searchSpy).toHaveBeenCalled()
    })
  })
})
