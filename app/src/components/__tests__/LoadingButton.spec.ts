import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import LoadingButton from '../LoadingButton.vue'

describe('LoadingButton', () => {
  it('renders correctly with the given color prop', () => {
    const color = 'red'
    const wrapper = mount(LoadingButton, {
      props: {
        color
      }
    })
    const button = wrapper.find('button')

    expect(button.exists()).toBe(true)
    expect(button.classes()).toContain('btn')
    expect(button.classes()).toContain(`btn-${color}`)
    expect(wrapper.find('.loading').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.find('.loading-sm').exists()).toBe(true)
    expect(wrapper.find('.text-white').exists()).toBe(true)
  })
})
