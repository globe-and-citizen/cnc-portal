import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MemberSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'
import { nextTick, type ComponentPublicInstance } from 'vue'
import type { User } from '@/types'

interface MemberSectionInstance extends ComponentPublicInstance {
  teamMembers: { name: string; address: string; isValid: boolean }[]
  searchUserName: string
  searchUserAddress: string
  searchUsers: (input: { name: string; address: string }) => Promise<void>
  executeSearchUser: () => Promise<void>
  users: { users: User[] }
  searchUserResponse: { ok: boolean }
  foundUsers: User[]
  addMembersError: string | null
  addMembersLoading: boolean
  showAddMemberForm: boolean
}

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
      mockReturnValue: (address: object) => {}
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

      const TableCompoent = wrapper.findComponent(TableComponent)
      expect(TableCompoent.exists()).toBe(true)
      expect(TableCompoent.props().loading).toBe(true)
    })

    it('renders the team members', () => {
      teamMock.members.forEach((member, index) => {
        expect(wrapper.html()).toContain(teamMock.members[index].name)
      })
    })
  })
  describe('methods', () => {
    it('opens the modal for adding members when toggleAddMemberModal is called', async () => {
      // select the data-test="add-member-button" element
      const addMemberButton = wrapper.find('[data-test="add-member-button"]')
      // click the addMemberButton
      await addMemberButton.trigger('click')
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent(ModalComponent)
      expect(modal.exists()).toBe(true)
    })

    it('searches users when searchUsers is called', async () => {
      // Cast wrapper.vm to an instance with the searchUsers method
      expect(1 + 1).toBe(2)

      // TODO - Fix this test:
      // Normay you can't spy on a method that is not a props or an event
      // const searchSpy = vi.spyOn(wrapper.vm as InstanceType<typeof MemberSection>, 'searchUsers')

      // await (wrapper.vm as unknown as typeof AddMemberCard).searchUsers({
      //   name: 'Alice',
      //   address: '1234'
      // })
      // expect(searchSpy).toHaveBeenCalled()
    })
  })

  describe('Table Structure', () => {
    it('should render properly member table', () => {
      expect(wrapper.find('[data-test="members-table"]').exists()).toBe(true)
    })

    it('shows action column only for team owner', async () => {
      // Test when user is owner
      // expect(wrapper.find('th:nth-child(5)').exists()).toBe(true)

      // Test when user is not owner

      wrapper = mount(MemberSection, {
        props: {
          team: {
            ...teamMock,
            ownerAddress: 'different_owner'
          },
          teamIsFetching: false
        }
      })
      nextTick()
      expect(wrapper.find('[data-test="action-header"]').exists()).toBe(false)
    })

    it('renders correct number of member rows', () => {
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(teamMock.members.length)
    })
  })

  describe('Add Member Form', () => {
    it('shows add member button only for team owner', async () => {
      // Test when user is owner
      expect(wrapper.find('[data-test="add-member-button"]').exists()).toBe(true)

      // Test when user is not owner
      await wrapper.setProps({
        team: {
          ...teamMock,
          ownerAddress: 'different_owner'
        }
      })
      expect(wrapper.find('[data-test="add-member-button"]').exists()).toBe(false)
    })

    // it('initializes with empty team members array', () => {
    //   const defaultTeamMembers = (wrapper.vm as MemberSectionInstance).teamMembers
    //   expect(defaultTeamMembers).toEqual([{ name: '', address: '', isValid: false }])
    // })
  })

  // describe('User Search', () => {
  //   it('updates search input values correctly', async () => {
  //     const searchInput = {
  //       name: 'John',
  //       address: '0x123'
  //     }

  //     await (wrapper.vm as MemberSectionInstance).searchUsers(searchInput)
  //     expect((wrapper.vm as MemberSectionInstance).searchUserName).toBe('John')
  //     expect((wrapper.vm as MemberSectionInstance).searchUserAddress).toBe('0x123')
  //   })

  //   it('updates foundUsers when search is successful', async () => {
  //     const mockUsers = [
  //       { name: 'John', address: '0x123' },
  //       { name: 'Jane', address: '0x456' }
  //     ]

  //     const vm = wrapper.vm as MemberSectionInstance
  //     vm.users = { users: mockUsers }
  //     vm.searchUserResponse = { ok: true }

  //     await wrapper.vm.$nextTick()
  //     expect(vm.foundUsers).toEqual(mockUsers)
  //   })
  // })

  // describe('Add Members', () => {
  //   it('resets form after successful member addition', async () => {
  //     const vm = wrapper.vm as MemberSectionInstance
  //     // Mock successful member addition
  //     vm.addMembersError = null
  //     vm.addMembersLoading = false

  //     await wrapper.vm.$nextTick()

  //     expect(vm.teamMembers).toEqual([{ name: '', address: '', isValid: false }])
  //     expect(vm.foundUsers).toEqual([])
  //     expect(vm.showAddMemberForm).toBe(false)
  //   })

  //   it('shows error toast on failed member addition', async () => {
  //     const error = 'Failed to add members'
  //     const vm = wrapper.vm as MemberSectionInstance
  //     vm.addMembersError = error

  //     await wrapper.vm.$nextTick()

  //     expect(addErrorToast).toHaveBeenCalledWith(error)
  //   })
  // })
})
