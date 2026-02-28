// UpdateTeamForm.spec.ts
import { it, expect, describe, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UpdateTeamForm from '@/components/sections/DashboardView/forms/UpdateTeamForm.vue'

interface ComponentData {
  team: {
    name: string
    description: string
  }
}
describe('UpdateTeamForm.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(UpdateTeamForm, {
      props: { teamIsUpdating: false }
    })
  })
  describe('Renders ', () => {
    it('renders correctly', () => {
      expect(wrapper.find('h1').text()).toBe('Update Team Details')
    })

    it('displays the loading button when teamIsUpdating is true', async () => {
      await wrapper.setProps({ teamIsUpdating: true })
      const button = wrapper.find('button[type="submit"]')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('displays the submit button when teamIsUpdating is false', async () => {
      await wrapper.setProps({ teamIsUpdating: false })
      const button = wrapper.find('button[type="submit"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Submit')
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

    it('emits updateTeam event when form is submitted', async () => {
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('Valid Name')
      await inputs[1].setValue('Valid description text')
      await flushPromises()

      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.emitted('updateTeam')).toBeTruthy()
    })

    it('does not emit updateTeam event when validation fails', async () => {
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('Ab')
      await inputs[1].setValue('Short')
      await flushPromises()

      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.emitted('updateTeam')).toBeFalsy()
    })
  })
})
