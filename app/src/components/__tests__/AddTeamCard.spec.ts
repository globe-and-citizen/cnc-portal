import { it, describe, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'
import IconComponent from '@/components/IconComponent.vue'

describe('AddTeamCard.vue', () => {
  const wrapper = mount(AddTeamCard, {
    global: {
      components: {
        IconComponent
      }
    }
  })
  describe('Render', () => {
    it('renders correctly', () => {
      expect(wrapper.find('span').text()).toBe('Add Team')
    })
    it('renders icon plus', () => {
      expect(wrapper.findComponent(IconComponent).exists()).toBe(true)
      expect(wrapper.findComponent(IconComponent).props('icon')).toBe('heroicons:plus-circle')
    })
  })
  describe('Emits', () => {
    it('emits addTeamCard when add team card is clicked', async () => {
      await wrapper.findComponent(IconComponent).trigger('click')
      expect(wrapper.emitted()).toHaveProperty('openAddTeamModal')
    })
  })
})
