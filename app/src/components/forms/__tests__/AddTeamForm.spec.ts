import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTeamModal from '@/components/forms/AddTeamForm.vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconMinus from '@/components/icons/IconMinus.vue'
import LoadingButton from '@/components/LoadingButton.vue'
import type { TeamInput, User } from '@/types'

describe('AddTeamModal.vue', () => {
  const team: TeamInput = {
    name: '',
    description: '',
    members: [{ name: '', address: '', isValid: true }]
  }
  const users: User[] = [
    { name: 'Ravioli', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' },
    { name: 'Dasarath', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' }
  ]

  const wrapper = mount(AddTeamModal, {
    props: {
      showAddTeamModal: true,
      team,
      users,
      isLoading: false
    },
    global: {
      components: {
        IconPlus,
        IconMinus,
        LoadingButton
      }
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
      expect(wrapper.vm.team.members[0].name).toBe(users[0].name)
      expect(wrapper.vm.team.members[0].address).toBe(users[0].address)
    })
  })
  describe('Emits', () => {
    it('emits addTeam when submit button is clicked', async () => {
      await wrapper.find('button.btn-primary').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('addTeam')
    })
  })
})
