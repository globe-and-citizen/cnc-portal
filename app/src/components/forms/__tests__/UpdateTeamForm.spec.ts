// UpdateTeamForm.spec.ts
import { it, expect, describe, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UpdateTeamForm from '@/components/sections/SingleTeamView/forms/UpdateTeamForm.vue'

interface ComponentData {
  team: {
    name: string
    description: string
    bankAddress: string
  }
}
describe('UpdateTeamForm.vue', () => {
  const defaultTeam = {
    name: 'Test Team',
    description: 'This is a test team',
    bankAddress: '0x1234567890abcdef1234567890abcdef12345678'
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
      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    })

    it('displays the submit button when teamIsUpdating is false', async () => {
      await wrapper.setProps({ teamIsUpdating: false })
      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
      expect(wrapper.find('button.btn-primary').exists()).toBe(true)
    })
  })
  describe('Actions', () => {
    it('updates the model when input fields are changed', async () => {
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('New Team Name')
      await inputs[1].setValue('New Description')
      await inputs[2].setValue('0xabcdefabcdefabcdefabcdefabcdefabcdef')

      expect((wrapper.vm as unknown as ComponentData).team.name).toBe('New Team Name')
      expect((wrapper.vm as unknown as ComponentData).team.description).toBe('New Description')
      expect((wrapper.vm as unknown as ComponentData).team.bankAddress).toBe(
        '0xabcdefabcdefabcdefabcdefabcdefabcdef'
      )
    })

    it('emits updateTeam event when submit button is clicked', async () => {
      await wrapper.find('button.btn-primary').trigger('click')
      expect(wrapper.emitted('updateTeam')).toBeTruthy()
    })
  })
})
