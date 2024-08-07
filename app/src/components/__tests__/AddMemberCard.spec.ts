import { it, describe, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddMemberCard from '../sections/SingleTeamView/Team/AddMemberCard.vue'

import { PlusCircleIcon } from '@heroicons/vue/24/outline'
describe('AddMemberCard.vue', () => {
  const wrapper = mount(AddMemberCard, {
    global: {
      components: {
        PlusCircleIcon
      }
    }
  })
  describe('Render', () => {
    it('renders text correctly', () => {
      expect(wrapper.text()).toBe('Add Member')
    })
    it('renders icon plus', () => {
      expect(wrapper.findComponent(PlusCircleIcon).exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('emits addMemberCard when add member card is clicked', async () => {
      await wrapper.findComponent(PlusCircleIcon).trigger('click')
      expect(wrapper.emitted()).toHaveProperty('toggleAddMemberModal')
    })
  })
})
