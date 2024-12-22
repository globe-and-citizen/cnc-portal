import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTeamForm from '@/components/sections/TeamView/forms/AddTeamForm.vue'
import type { TeamInput, User } from '@/types'

interface AddTeamForm {
  team: TeamInput
  users: User[]
  isLoading: boolean
  dropdown: boolean
  activeInputIndex: number
  showDropdown: boolean
  formRef: HTMLElement
  handleClickOutside: (event: { target: HTMLElement }) => void
}
describe('AddTeamForm.vue', () => {
  const team: TeamInput = {
    name: '',
    description: '',
    members: [{ name: '', address: '' }]
  }
  const users: User[] = [
    { name: 'Ravioli', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' },
    { name: 'Dasarath', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' }
  ]

  const wrapper = mount(AddTeamForm, {
    props: {
      modelValue: team,
      users,
      isLoading: false
    }
  })

  // Reset props
  beforeEach(() => {
    wrapper.setProps({ modelValue: team, users, isLoading: false })
  })
  describe('Render', () => {
    it('renders correctly with initial props', () => {
      expect(wrapper.find('h1').text()).toBe('Create New Team')
      expect(wrapper.findAll('.input-group').length).toBe(team.members.length)
    })
    it('shows dropdown when users are available', async () => {
      expect(wrapper.find('.dropdown').exists()).toBe(true)
    })
    it('should show loading state', async () => {
      wrapper.setProps({ isLoading: true })
      // next tick
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.loading').exists()).toBe(true)
    })

    it('updates team members when a user is selected from dropdown', async () => {
      await wrapper.find('.dropdown a').trigger('click')
      expect(wrapper.vm.modelValue?.members[0].name).toBe(users[0].name)
      expect(wrapper.vm.modelValue?.members[0].address).toBe(users[0].address)
    })
  })

  describe('Emits', () => {
    const teamV2: TeamInput = {
      name: 'Team Name',
      description: 'Team Description',
      members: [{ name: 'Ravioli', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }]
    }

    const wrapperV2 = mount(AddTeamForm, {
      props: {
        modelValue: teamV2,
        users,
        isLoading: false
      }
    })
    it('emits addTeam when submit button is clicked', async () => {
      // TODO: fil the form with valid data
      await wrapperV2.find('input[name="name"]').setValue('Team Name')
      await wrapperV2.find('input[name="description"]').setValue('Team Description')

      await wrapperV2.find('[data-test="submit"]').trigger('click')
      expect(wrapperV2.emitted()).toHaveProperty('addTeam')
    })
    it('Not emits on Error', async () => {
      // TODO: fil the form with valid data

      await wrapper.find('[data-test="submit"]').trigger('click')
      expect(wrapper.emitted()).not.toHaveProperty('addTeam')
    })
  })
  describe('Actions', () => {
    it('adds a new member input field when clicking the add icon', async () => {
      expect(wrapper.findAll('.input-group').length).toBe(1)
      await wrapper.find('[data-test="add-member"]').trigger('click')

      expect(wrapper.findAll('.input-group').length).toBe(2)
    })

    it('removes the last member input field when clicking the remove icon', async () => {
      expect(wrapper.findAll('.input-group').length).toBe(2)
      await wrapper.find('[data-test="remove-member"]').trigger('click')

      expect(wrapper.findAll('.input-group').length).toBe(1)
    })

    it('should set index on focus member name input', async () => {
      await wrapper.find('input[data-test="member-name-input"]').trigger('focus')
      expect((wrapper.vm as unknown as AddTeamForm).activeInputIndex).toBe(0)
    })

    it('should set index on focus member address input', async () => {
      await wrapper.find('input[data-test="member-address-input"]').trigger('focus')
      expect((wrapper.vm as unknown as AddTeamForm).activeInputIndex).toBe(0)
    })

    it('should hide the dropdown when clicking outside the formRef element', () => {
      ;(wrapper.vm as unknown as AddTeamForm).handleClickOutside({
        target: document.createElement('div')
      })
      expect((wrapper.vm as unknown as AddTeamForm).showDropdown).toBe(false)
    })

    it('Should update the users in the dropdow when the userName is updated', async () => {
      const wrapper = mount(AddTeamForm, {
        props: {
          modelValue: team,
          users,
          isLoading: false
        },
        data() {
          return {
            dropdown: true
          }
        }
      })
      await wrapper.find('.input-group input').setValue('Ravioli')
      await wrapper.find('.input-group input').trigger('keyup.stop')

      await wrapper
        .findAll('.input-group input')[1]
        .setValue('0x4b6Bf5cD91446408290725879F5666dcd9785F62')
      await wrapper.findAll('.input-group input')[1].trigger('keyup.stop')
      // next ti
      await wrapper.find('.dropdown a').trigger('click')
      expect(wrapper.vm.modelValue?.members[0].name).toBe(users[0].name)
    })
  })
  describe('Validation', () => {
    it('shows error message for empty team name', async () => {
      await wrapper.find('input[name="name"]').setValue('')
      await wrapper.find('[data-test="submit"]').trigger('click')
      expect(wrapper.find('.text-red-500').text()).toContain('Value is required')
    })

    it('shows error message for invalid wallet address', async () => {
      await wrapper.find('[data-test="submit"]').trigger('click')
      expect(wrapper.find('.text-red-500').text()).toContain('Value is required')
    })
  })

  describe('Component Lifecycle', () => {
    it('adds and removes event listener', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = mount(AddTeamForm, {
        props: {
          modelValue: team,
          users,
          isLoading: false
        }
      })

      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))

      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })
  describe('Edge Cases', () => {
    it('handles empty users array', async () => {
      await wrapper.setProps({ users: [] })
      expect(wrapper.find('.dropdown').exists()).toBe(true)
    })

    it('prevents removing last member', async () => {
      while ((wrapper.vm as unknown as AddTeamForm).team.members.length > 1) {
        await wrapper.find('[data-test="remove-member"]').trigger('click')
      }
      await wrapper.find('[data-test="remove-member"]').trigger('click')
      expect((wrapper.vm as unknown as AddTeamForm).team.members.length).toBe(1)
    })

    it('handles maximum number of members', async () => {
      for (let i = 0; i < 10; i++) {
        await wrapper.find('[data-test="add-member"]').trigger('click')
      }
      expect((wrapper.vm as unknown as AddTeamForm).team.members.length).toBe(11)
      await wrapper.find('[data-test="add-member"]').trigger('click')
      expect((wrapper.vm as unknown as AddTeamForm).team.members.length).toBe(12)
    })
  })
})
