import { mount } from '@vue/test-utils'
import MyComponent from '@/components/MemberCard.vue'
import { describe, it, expect } from 'vitest'

describe('MyComponent', () => {
  it('emits deleteMember event when delete button is clicked', async () => {
    const member = { name: 'John Doe', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }
    const teamId = 1

    const wrapper = mount(MyComponent, {
      props: { member, teamId }
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('deleteMember')).toBeTruthy()
  })
})
