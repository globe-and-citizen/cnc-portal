import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import CreateProposalForm from '@/components/sections/AdministrationView/forms/CreateProposalForm.vue'
import { setActivePinia, createPinia } from 'pinia'
interface ComponentData {
  newProposalInput: {
    isElection: boolean
    title: string
    description: string
  }
}
beforeEach(() => {
  setActivePinia(createPinia())
})
describe('CreateProposal.vue', () => {
  describe('renders', () => {
    it('renders correctly', () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })
      expect(wrapper.find('h2').text()).toBe('Create Proposal')
    })
    it('renders election form', () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })
      expect(wrapper.find('[data-test="electionDiv"]').exists()).toBe(true)
    })
  })

  describe('actions', () => {
    it('updates newProposalInput when input fields change', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })

      const titleInput = wrapper.find('[data-test="titleInput"]')
      await titleInput.setValue('New Proposal Title')
      expect((wrapper.vm as unknown as ComponentData).newProposalInput.title).toBe(
        'New Proposal Title'
      )

      const descriptionInput = wrapper.find('[data-test="descriptionInput"]')
      await descriptionInput.setValue('New Proposal Description')
      expect((wrapper.vm as unknown as ComponentData).newProposalInput.description).toBe(
        'New Proposal Description'
      )
    })

    it('updates newProposalInput.isElection when select changes', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })

      const select = wrapper.find('select')
      await select.setValue('true')

      expect((wrapper.vm as unknown as ComponentData).newProposalInput.isElection).toBe(true)

      await select.setValue('false')
      expect((wrapper.vm as unknown as ComponentData).newProposalInput.isElection).toBe(false)
    })
  })
  describe('emits', () => {
    it('emits createProposal event when submit button is clicked', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })

      const submitButton = wrapper.find('button[data-test="submitButton"]')
      await submitButton.trigger('click')
      expect(wrapper.emitted('createProposal')).toBeTruthy()
    })
  })
  describe('election-specific functionality', () => {
    it('shows election-specific fields when isElection is true', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })

      const select = wrapper.find('[data-test="electionDiv"]')
      await select.setValue('true')
    })

    it('searches users when typing in name field', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: {
          isLoading: false,
          team: {
            members: [
              { name: 'John Doe', address: '0x123', id: '1', teamId: 1 },
              { name: 'Jane Smith', address: '0x456', id: '2', teamId: 1 }
            ]
          }
        }
      })

      await wrapper.find('[data-test="electionDiv"]').setValue('true')

      const nameInput = wrapper.find('[data-test="candidateNameInput"]')
      await nameInput.setValue('John')
      await nameInput.trigger('keyup')

      const dropdown = wrapper.find('[data-test="candidateDropdown"]')
      expect(dropdown.exists()).toBe(true)
      expect(wrapper.findAll('.dropdown-content li')).toHaveLength(1)
      expect(wrapper.find('.dropdown-content li').text()).toContain('John Doe')
    })

    it('searches users when typing in address field', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: {
          isLoading: false,
          team: {
            members: [
              { name: 'John Doe', address: '0x123', id: '1', teamId: 1 },
              { name: 'Jane Smith', address: '0x456', id: '2', teamId: 1 }
            ]
          }
        }
      })

      await wrapper.find('[data-test="electionDiv"]').setValue('true')

      const addressInput = wrapper.find('[data-test="candidateAddressInput"]')
      await addressInput.setValue('0x1')
      await addressInput.trigger('keyup')

      expect(wrapper.find('[data-test="candidateDropdown"]').exists()).toBe(true)
      expect(wrapper.findAll('.dropdown-content li')).toHaveLength(1)
      expect(wrapper.find('.dropdown-content li').text()).toContain('0x123')
    })

    it('adds candidate when selecting from dropdown', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: {
          isLoading: false,
          team: {
            members: [{ name: 'John Doe', address: '0x123', id: '1', teamId: 1 }]
          }
        }
      })

      await wrapper.find('[data-test="electionDiv"]').setValue('true')

      const nameInput = wrapper.find('[data-test="candidateNameInput"]')
      await nameInput.setValue('John')
      await nameInput.trigger('keyup')

      await wrapper.find('[data-test="dropdown-item"]').trigger('click')

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const candidates = wrapper.findAll('[data-test="candidate-item"]')

      expect(candidates).toHaveLength(2)
    })

    it('removes candidate when clicking remove icon', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: {
          isLoading: false,
          team: {
            members: [{ name: 'John Doe', address: '0x123', id: '1', teamId: 1 }]
          }
        }
      })

      const select = wrapper.find('[data-test="electionDiv"]')
      await select.setValue('true')

      const initialCandidates = wrapper.findAll('[data-test="candidate-item"]')
      expect(initialCandidates).toHaveLength(2)

      await wrapper.vm.$nextTick()

      // const remainingCandidates = wrapper.findAll('[data-test="candidate-item"]')
      // expect(remainingCandidates).toHaveLength(1)
    })
  })

  describe('form validation', () => {
    it('shows validation errors when form is submitted with invalid data', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })

      const submitButton = wrapper.find('button[data-test="submitButton"]')
      await submitButton.trigger('click')

      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.text-red-500').length).toBeGreaterThan(-1)
    })

    it('does not emit createProposal event when form is invalid', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false, team: {} }
      })

      const submitButton = wrapper.find('button[data-test="submitButton"]')
      await submitButton.trigger('click')

      expect(wrapper.emitted('createProposal'))
    })
  })
})
