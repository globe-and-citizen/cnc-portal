import { it, describe, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'
import { Icon as IconifyIcon } from '@iconify/vue'

describe('AddTeamCard.vue', () => {
  const wrapper = mount(AddTeamCard, {
    global: {
      components: {
        IconifyIcon
      }
    }
  })

  describe('Render', () => {
    it('renders correctly', () => {
      expect(wrapper.find('span').text()).toBe('Create Company')
    })

    it('renders icon plus', () => {
      expect(wrapper.findComponent(IconifyIcon).exists()).toBe(true)
    })

    // The tile is the only way to start a company, so it has to be a real
    // control — a clickable div is invisible to the keyboard.
    it('is a button rather than a clickable card', () => {
      const tile = wrapper.find('[data-test="add-team"]')

      expect(tile.element.tagName).toBe('BUTTON')
      expect(tile.attributes('type')).toBe('button')
    })
  })
})
