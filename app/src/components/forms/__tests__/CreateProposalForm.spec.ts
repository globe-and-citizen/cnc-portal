import { it, describe, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateProposalForm from '../CreateProposalForm.vue'

describe('CreateProposalForm.vue', () => {
  describe('render', () => {
    it('renders form elements correctly', () => {
      const wrapper = mount(CreateProposalForm)
      expect(wrapper.find('h2').text()).toBe('Create Proposal')
      expect(wrapper.find('select').exists()).toBe(true)
      expect(wrapper.findAll('input').length).toBe(4) // 4 input fields by default: title, description, start time and end time
      expect(wrapper.find('textarea').exists()).toBe(true)
      expect(wrapper.find('button').text()).toBe('Create Proposal')
    })

    it('shows candidate input when proposal type is election', async () => {
      const wrapper = mount(CreateProposalForm)
      await wrapper.find('select').setValue('election')
      expect(wrapper.find('input[placeholder="Candidate"]').exists()).toBe(true)
    })
    it('does not show candidate input when proposal type is directive', async () => {
      const wrapper = mount(CreateProposalForm)
      await wrapper.find('select').setValue('directive')
      expect(wrapper.find('input[placeholder="Candidate"]').exists()).toBe(false)
    })
  })
})
