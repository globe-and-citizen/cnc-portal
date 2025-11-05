import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MultiSelectMemberInput from '../MultiSelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import { createTestingPinia } from '@pinia/testing'

interface Member {
  name?: string
  address?: string
  id?: string
}

describe('MultiSelectMemberInput', () => {
  let wrapper: ReturnType<typeof mount>

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('addMember function', () => {
    it('should not add member if member is null', async () => {
      const initialMembers: Member[] = [{ name: 'Existing Member', address: '0x123' }]
      let currentMembers = [...initialMembers]

      wrapper = mount(MultiSelectMemberInput, {
        props: {
          modelValue: currentMembers,
          'onUpdate:modelValue': (value: Member[]) => {
            currentMembers = value
          }
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
          components: { UserComponent }
        }
      })

      const selectMemberInput = wrapper.findComponent({ name: 'SelectMemberInput' })
      await selectMemberInput.vm.$emit('selectMember', null)
      await wrapper.vm.$nextTick()

      expect(currentMembers).toHaveLength(1) // Should remain unchanged
    })

    it('should toggle member - add then remove same member', async () => {
      let currentMembers: Member[] = []

      wrapper = mount(MultiSelectMemberInput, {
        props: {
          modelValue: currentMembers,
          'onUpdate:modelValue': (value: Member[]) => {
            currentMembers = value
          }
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
          components: { UserComponent }
        }
      })

      const member = { name: 'Toggle Member', address: '0x999' }

      // First click - add member
      const selectMemberInput = wrapper.findComponent({ name: 'SelectMemberInput' })
      await selectMemberInput.vm.$emit('selectMember', member)
      await wrapper.vm.$nextTick()

      expect(currentMembers).toHaveLength(1)
      expect(currentMembers[0]).toEqual(member)

      // Update wrapper with new members
      await wrapper.setProps({ modelValue: currentMembers })
      await wrapper.vm.$nextTick()

      // Second click - remove member
      const userComponents = wrapper.findAllComponents(UserComponent)
      await userComponents[0].trigger('click')
      await wrapper.vm.$nextTick()

      expect(currentMembers).toHaveLength(0)
    })
  })
})
