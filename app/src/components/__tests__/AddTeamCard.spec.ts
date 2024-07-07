import { it, describe, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTeamCard from '@/components/AddTeamCard.vue'

import { PlusCircleIcon } from '@heroicons/vue/24/outline'
describe('AddTeamCard.vue', () => {
  const wrapper = mount(AddTeamCard, {
    global: {
      components: {
        PlusCircleIcon
      }
    }
  })
  describe('Render', () => {
    it('renders correctly', () => {
      expect(wrapper.find('span').text()).toBe('Add Team')
    })
    it('renders icon plus', () => {
      expect(wrapper.findComponent(PlusCircleIcon).exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('emits addTeamCard when add team card is clicked', async () => {
      await wrapper.findComponent(PlusCircleIcon).trigger('click')
      expect(wrapper.emitted()).toHaveProperty('openAddTeamModal')
    })
  })
})
