import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BodAlert from '@/components/BodAlert.vue'

describe('BodAlert', () => {
  it('renders title, message and an icon', () => {
    const wrapper = mount(BodAlert)

    expect(wrapper.text()).toContain('Info')
    expect(wrapper.text()).toContain('This will create a BOD action which requires approval')
    expect(wrapper.find('svg').exists()).toBe(true)
    // basic style sanity check
    expect(wrapper.classes()).toContain('flex')
  })
})
