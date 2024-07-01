import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ProposalDashboard from '@/components/ProposalDashboard.vue'
import ProposalCard from '@/components/ProposalCard.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateProposalForm from '@/components/forms/CreateProposalForm.vue'

describe('ProposalDashboard.vue', () => {
  it('renders ProposalDashboard with proposals', () => {
    const wrapper = mount(ProposalDashboard)
    const activeProposals = wrapper
      .findAllComponents(ProposalCard)
      .filter((comp) => !comp.props('isDone'))
    const oldProposals = wrapper
      .findAllComponents(ProposalCard)
      .filter((comp) => comp.props('isDone'))

    expect(activeProposals.length).toBe(2)
    expect(oldProposals.length).toBe(1)

    expect(wrapper.find('h2').text()).toBe('Proposals')
  })

  it('opens modal when Create Proposal button is clicked', async () => {
    const wrapper = mount(ProposalDashboard)

    const modalComponent = wrapper.findComponent(ModalComponent)

    await wrapper.find('button.btn-primary').trigger('click')

    expect((wrapper as any).vm.showModal).toBe(true)
    expect(modalComponent.exists()).toBe(true)

    const createProposalForm = wrapper.findComponent(CreateProposalForm)
    expect(createProposalForm.exists()).toBe(true)
  })
})
