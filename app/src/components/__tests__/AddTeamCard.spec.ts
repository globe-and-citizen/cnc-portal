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
      expect(wrapper.find('span').text()).toBe('Add Team')
    })
    it('renders icon plus', () => {
      expect(wrapper.findComponent(IconifyIcon).exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('emits addTeamCard when add team card is clicked', async () => {
      await wrapper.findComponent(IconifyIcon).trigger('click')
      expect(wrapper.emitted()).toHaveProperty('openAddTeamModal')
    })
  })
})
