import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import MultiSelectMemberInput from '../MultiSelectMemberInput.vue'
import SelectMemberInput from '../SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'

interface Member {
  name: string
  address: string
  id?: string
}

describe('MultiSelectMemberInput', () => {
  const createWrapper = (initialMembers: Member[] = []) => {
    return mount(MultiSelectMemberInput, {
      props: {
        modelValue: initialMembers,
        'onUpdate:modelValue': () => {}
      },
      global: {
        stubs: {
          SelectMemberInput: true,
          UserComponent: true,
          ButtonUI: true
        }
      }
    })
  }

  it('renders empty state correctly', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="members-list"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(UserComponent)).toHaveLength(0)
  })

  it('renders existing members correctly', () => {
    const initialMembers: Member[] = [
      { name: 'John Doe', address: '0x123' },
      { name: 'Jane Smith', address: '0x456' }
    ]
    const wrapper = createWrapper(initialMembers)
    const userComponents = wrapper.findAllComponents(UserComponent)

    expect(userComponents).toHaveLength(2)
    expect(userComponents[0].props('user')).toEqual(initialMembers[0])
    expect(userComponents[1].props('user')).toEqual(initialMembers[1])
  })

  it('prevents adding duplicate members (same address)', async () => {
    const initialMembers: Member[] = [{ name: 'John Doe', address: '0x123' }]
    const wrapper = createWrapper(initialMembers)

    await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
      name: 'Different Name',
      address: '0x123' // Same address as existing member
    })

    expect(wrapper.findAllComponents(UserComponent)).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('removes a member when clicking on it', async () => {
    const seed: Member[] = [
      { name: 'John Doe', address: '0x123' },
      { name: 'Jane Smith', address: '0x456' },
      { name: 'Bob Alice', address: '0x789' }
    ]
    const wrapper = createWrapper([...seed])

    // Ensure all members are rendered
    let userComponents = wrapper.findAllComponents(UserComponent)
    expect(userComponents).toHaveLength(3)

    // Click the second member (index 1) to remove it
    await userComponents[1].trigger('click')
    await nextTick()

    userComponents = wrapper.findAllComponents(UserComponent)
    expect(userComponents).toHaveLength(2)

    expect(userComponents[0].props('user')).toEqual(seed[0])
    expect(userComponents[1].props('user')).toEqual(seed[2])
  })
})
