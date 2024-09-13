import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import CreateProposalForm from '@/components/sections/SingleTeamView/forms/CreateProposalForm.vue'
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
        props: { isLoading: false }
      })
      expect(wrapper.find('h2').text()).toBe('Create Proposal')
    })
    it('renders election form', () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false }
      })
      expect(wrapper.find('[data-test="electionDiv"]').exists()).toBe(true)
    })
  })

  describe('actions', () => {
    it('updates newProposalInput when input fields change', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false }
      })

      const titleInput = wrapper.find('input[placeholder="Title"]')
      await titleInput.setValue('New Proposal Title')
      expect((wrapper.vm as unknown as ComponentData).newProposalInput.title).toBe(
        'New Proposal Title'
      )

      const descriptionInput = wrapper.find('textarea')
      await descriptionInput.setValue('New Proposal Description')
      expect((wrapper.vm as unknown as ComponentData).newProposalInput.description).toBe(
        'New Proposal Description'
      )
    })

    it('updates newProposalInput.isElection when select changes', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false }
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
        props: { isLoading: false }
      })

      const submitButton = wrapper.find('button[data-test="submitButton"]')
      await submitButton.trigger('click')
      expect(wrapper.emitted('createProposal')).toBeTruthy()
    })
  })
})
