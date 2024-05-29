import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import Toast from '../TestToast.vue'
import { ToastType } from '../../types'

// Mocking the icons to avoid importing the actual components
vi.mock('../icons/IconCheck.vue', () => ({ default: { template: '<span>Success Icon</span>' } }))
vi.mock('../icons/IconInfo.vue', () => ({ default: { template: '<span>Info Icon</span>' } }))
vi.mock('../icons/IconWarning.vue', () => ({ default: { template: '<span>Warning Icon</span>' } }))
vi.mock('../icons/IconError.vue', () => ({ default: { template: '<span>Error Icon</span>' } }))

describe('Toast Component', () => {
  it('renders success toast correctly', () => {
    const wrapper = mount(Toast, {
      props: { type: ToastType.Success, message: 'Success message', timeout: 5000 }
    })

    expect(wrapper.text()).toContain('Success message')
    expect(wrapper.html()).toContain('Success Icon')
    expect(wrapper.find('.alert').classes()).toContain('alert-success')
  })

  it('renders info toast correctly', () => {
    const wrapper = mount(Toast, {
      props: { type: ToastType.Info, message: 'Info message', timeout: 5000 }
    })

    expect(wrapper.text()).toContain('Info message')
    expect(wrapper.html()).toContain('Info Icon')
    expect(wrapper.find('.alert').classes()).toContain('alert-info')
  })

  it('renders warning toast correctly', () => {
    const wrapper = mount(Toast, {
      props: { type: ToastType.Warning, message: 'Warning message', timeout: 5000 }
    })

    expect(wrapper.text()).toContain('Warning message')
    expect(wrapper.html()).toContain('Warning Icon')
    expect(wrapper.find('.alert').classes()).toContain('alert-warning')
  })

  it('renders error toast correctly', () => {
    const wrapper = mount(Toast, {
      props: { type: ToastType.Error, message: 'Error message', timeout: 5000 }
    })

    expect(wrapper.text()).toContain('Error message')
    expect(wrapper.html()).toContain('Error Icon')
    expect(wrapper.find('.alert').classes()).toContain('alert-error')
  })

  it('disappears after 5 seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Toast, {
      props: { type: ToastType.Info, message: 'Disappearing message', timeout: 5000 }
    })

    expect(wrapper.text()).toContain('Disappearing message')

    vi.advanceTimersByTime(5000)

    await wrapper.vm.$nextTick() // wait for the DOM to update

    expect(wrapper.text()).not.toContain('Disappearing message')
    vi.useRealTimers()
  })
})
