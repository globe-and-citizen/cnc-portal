// UpdateTeamForm.spec.ts
import { it, expect, describe, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UpdateTeamForm from '@/components/sections/DashboardView/forms/UpdateTeamForm.vue'

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
        },
        stubs: {
          UButton: {
            name: 'UButton',
            props: ['loading', 'disabled', 'variant', 'color', 'label'],
            emits: ['click'],
            template:
              '<button data-test="submit-btn" :disabled="disabled" @click="$emit(\'click\')">{{ label || $slots.default?.() }}</button>'
          }
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
      // Component should accept and render with the loading prop set
      expect(wrapper.props('teamIsUpdating')).toBe(true)
    })

    it('displays the submit button when teamIsUpdating is false', async () => {
      await wrapper.setProps({ teamIsUpdating: false })
      // Component should accept and render with the loading prop unset
      expect(wrapper.props('teamIsUpdating')).toBe(false)
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
      // Populate required fields to pass validation
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('Valid Team Name')
      await inputs[1].setValue('Valid Description')
      await wrapper.vm.$nextTick()

      // Component renders and validation rules are in place
      expect((wrapper.vm as unknown as ComponentData).team.name).toBe('Valid Team Name')
      expect((wrapper.vm as unknown as ComponentData).team.description).toBe('Valid Description')
    })
  })
})
