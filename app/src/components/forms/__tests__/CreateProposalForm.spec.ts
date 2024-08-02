import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CreateProposalForm from '@/components/sections/SingleTeamView/Governance/forms/CreateProposalForm.vue'

describe('CreateProposal.vue', () => {
  describe('renders', () => {
    it('renders correctly', () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false }
      })
      expect(wrapper.find('h2').text()).toBe('Create Proposal')
    })
  })

  describe('emits', () => {
    it('emits createProposal event when button is clicked', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false }
      })

      const button = wrapper.find('button')
      await button.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('createProposal')
    })
  })
  describe('actions', () => {
    it('updates newProposalInput when input fields change', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false }
      })

      const titleInput = wrapper.find('input[placeholder="Title"]')
      await titleInput.setValue('New Proposal Title')
      expect((wrapper.vm as any).newProposalInput.title).toBe('New Proposal Title')

      const descriptionInput = wrapper.find('textarea')
      await descriptionInput.setValue('New Proposal Description')
      expect((wrapper.vm as any).newProposalInput.description).toBe('New Proposal Description')
    })

    it('updates newProposalInput.isElection when select changes', async () => {
      const wrapper = mount(CreateProposalForm, {
        props: { isLoading: false }
      })

      const select = wrapper.find('select')
      await select.setValue('true')
      expect((wrapper.vm as any).newProposalInput.isElection).toBe(true)

      await select.setValue('false')
      expect((wrapper.vm as any).newProposalInput.isElection).toBe(false)
    })
  })
})
