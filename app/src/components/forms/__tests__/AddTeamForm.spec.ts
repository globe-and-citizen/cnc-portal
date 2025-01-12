import { describe, it, expect, beforeEach } from 'vitest'
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
    wrapper.setProps({ users, isLoading: false })
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
  })

  describe('Edge Cases', () => {
    it('handles empty users array', async () => {
      await wrapper.setProps({ users: [] })
      expect(wrapper.find('.dropdown').exists()).toBe(true)
    })
  })
})
