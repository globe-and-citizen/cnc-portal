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

  describe('Form Validation', () => {
    it('shows validation errors for empty team name', async () => {
      await wrapper.find('[data-test="create-team-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="name-error"]').exists()).toBe(true)
    })

    it('shows validation errors for empty investor contract fields', async () => {
      await wrapper.find('[data-test="create-team-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="share-name-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="share-symbol-error"]').exists()).toBe(true)
    })
  })

  describe('Form Submission', () => {
    it('emits addTeam event with valid data', async () => {
      const validTeam = {
        name: 'Test Team',
        description: 'Test Description',
        members: [{ name: 'Test User', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }]
      }
      const validInvestorContract = {
        name: 'Test Shares',
        symbol: 'TST'
      }

      await wrapper.find('[data-test="team-name-input"]').setValue(validTeam.name)
      await wrapper.find('[data-test="team-description-input"]').setValue(validTeam.description)
      await wrapper
        .find('[data-test="member-0-input"] input:first-child')
        .setValue(validTeam.members[0].name)
      await wrapper
        .find('[data-test="member-0-input"] input:last-child')
        .setValue(validTeam.members[0].address)
      await wrapper.find('[data-test="share-name-input"]').setValue(validInvestorContract.name)
      await wrapper.find('[data-test="share-symbol-input"]').setValue(validInvestorContract.symbol)

      await wrapper.find('[data-test="create-team-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('addTeam')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]?.[0]).toEqual({
        team: validTeam,
        investorContract: validInvestorContract
      })
    })
  })

  describe('User Search', () => {
    it('selects user from dropdown', async () => {
      await wrapper.find(`[data-test="user-dropdown-${users[0].address}"]`).trigger('click')
      await wrapper.vm.$nextTick()

      const memberInputs = wrapper.find('[data-test="member-0-input"]')
      const nameInput = memberInputs.find('input:first-child').element as HTMLInputElement
      const addressInput = memberInputs.find('input:last-child').element as HTMLInputElement
      expect(nameInput.value).toBe(users[0].name)
      expect(addressInput.value).toBe(users[0].address)
    })
  })

  describe('Watch Behavior', () => {
    it('hides dropdown when users array becomes empty', async () => {
      await wrapper.setProps({ users: [] })
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as unknown as { showDropdown: boolean }).showDropdown).toBe(false)
    })
  })
})
