// UpdateTeamForm.spec.ts
import { it, expect, describe, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UpdateTeamForm from '@/components/sections/DashboardView/forms/UpdateTeamForm.vue'
import ButtonUI from '@/components/ButtonUI.vue'

interface ComponentData {
  team: {
    name: string
    description: string
  }
}
describe('UpdateTeamForm.vue', () => {
  const defaultTeam = {
    name: 'Test Team',
    description: 'This is a test team'
  }

  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(UpdateTeamForm, {
      props: { teamIsUpdating: false },
      global: {
        provide: {
          team: defaultTeam
        }
      }
    })
  })
  describe('Renders ', () => {
    it('renders correctly', () => {
      expect(wrapper.find('h1').text()).toBe('Update Team Details')
    })

    it('displays the loading button when teamIsUpdating is true', async () => {
      await wrapper.setProps({ teamIsUpdating: true })
      expect(wrapper.findComponent(ButtonUI).props().loading).toBe(true)
    })

    it('displays the submit button when teamIsUpdating is false', async () => {
      await wrapper.setProps({ teamIsUpdating: false })
      expect(wrapper.findComponent(ButtonUI).props().loading).toBe(false)
      expect(wrapper.findComponent(ButtonUI).props().variant).toBe('primary')
    })
  })
  describe('Actions', () => {
    it('updates the model when input fields are changed', async () => {
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('New Team Name')
      await inputs[1].setValue('New Description')

      expect((wrapper.vm as unknown as ComponentData).team.name).toBe('New Team Name')
      expect((wrapper.vm as unknown as ComponentData).team.description).toBe('New Description')
    })

    it('emits updateTeam event when submit button is clicked', async () => {
      await wrapper.find('button.btn-primary').trigger('click')
      expect(wrapper.emitted('updateTeam')).toBeTruthy()
    })
  })
})
