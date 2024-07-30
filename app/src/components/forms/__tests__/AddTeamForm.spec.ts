import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTeamModal from '@/components/forms/AddTeamForm.vue'
import type { TeamInput, User } from '@/types'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'

describe('AddTeamModal.vue', () => {
  const team: TeamInput = {
    name: '',
    description: '',
    members: [{ name: '', address: '' }]
  }
  const users: User[] = [
    { name: 'Ravioli', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' },
    { name: 'Dasarath', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' }
  ]

  const wrapper = mount(AddTeamModal, {
    props: {
      modelValue: team,
      users,
      isLoading: false
    }
  })
  describe('Render', () => {
    it('renders correctly with initial props', () => {
      expect(wrapper.find('h1').text()).toBe('Create New Team')
      expect(wrapper.findAll('.input-group').length).toBe(team.members.length)
    })
    it('shows dropdown when users are available', async () => {
      expect(wrapper.find('.dropdown-open').exists()).toBe(true)
    })

    it('updates team members when a user is selected from dropdown', async () => {
      await wrapper.find('.dropdown a').trigger('click')
      expect(wrapper.vm.modelValue.members[0].name).toBe(users[0].name)
      expect(wrapper.vm.modelValue.members[0].address).toBe(users[0].address)
    })
  })

  describe('Emits', () => {
    const teamV2: TeamInput = {
      name: 'Team Name',
      description: 'Team Description',
      members: [{ name: 'Ravioli', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }]
    }

    const wrapperV2 = mount(AddTeamModal, {
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
    it('displays dropdown with users when dropdown is true', async () => {
      const wrapper = mount(AddTeamForm, {
        props: {
          users: [
            { name: 'Alice', address: '0x123' },
            { name: 'Bob', address: '0x456' }
          ],
          isLoading: false
        },
        data() {
          return {
            dropdown: true
          }
        }
      })
      expect(wrapper.find('.dropdown-open').exists()).toBe(true)
      expect(wrapper.findAll('li').length).toBe(2)
    })
  })
})
