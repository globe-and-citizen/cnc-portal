import { it, describe, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddMemberCard from '../AddMemberCard.vue'
import IconPlus from '../icons/IconPlus.vue'

describe('AddMemberCard.vue', () => {
  const wrapper = mount(AddMemberCard, {
    global: {
      components: {
        IconPlus
      }
    }
  })
  describe('Render', () => {
    it('renders text correctly', () => {
      console.log(wrapper.html())
      expect(wrapper.text()).toBe('Add Member')
    })
    it('renders icon plus', () => {
      expect(wrapper.findComponent(IconPlus).exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('emits addMemberCard when add member card is clicked', async () => {
      await wrapper.findComponent(IconPlus).trigger('click')
      expect(wrapper.emitted()).toHaveProperty('toggleAddMemberModal')
    })
  })
})
