import { it, describe, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTeamCard from '@/components/AddTeamCard.vue'
import IconPlus from '@/components/icons/IconPlus.vue'

describe('AddTeamCard.vue', () => {
  const wrapper = mount(AddTeamCard, {
    global: {
      components: {
        IconPlus
      }
    }
  })
  describe('Render', () => {
    it('renders correctly', () => {
      expect(wrapper.find('span').text()).toBe('Add Team')
    })
    it('renders icon plus', () => {
      expect(wrapper.findComponent(IconPlus).exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('emits addTeamCard when add team card is clicked', async () => {
      await wrapper.findComponent(IconPlus).trigger('click')
      expect(wrapper.emitted()).toHaveProperty('openAddTeamModal')
    })
  })
})
