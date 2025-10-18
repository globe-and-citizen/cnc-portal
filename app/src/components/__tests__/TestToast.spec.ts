import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import Toast from '../TestToast.vue'
import { ToastType } from '../../types'

describe('Toast Component', () => {
  describe('Render', () => {
    it('renders success toast correctly', () => {
      const wrapper = mount(Toast, {
        props: { type: ToastType.Success, message: 'Success message', timeout: 5000 }
      })

      expect(wrapper.find('.alert').classes()).toContain('alert-success')
    })

    it('renders info toast correctly', () => {
      const wrapper = mount(Toast, {
        props: { type: ToastType.Info, message: 'Info message', timeout: 5000 }
      })

      expect(wrapper.find('.alert').classes()).toContain('alert-info')
    })

    it('renders warning toast correctly', () => {
      const wrapper = mount(Toast, {
        props: { type: ToastType.Warning, message: 'Warning message', timeout: 5000 }
      })

      expect(wrapper.find('.alert').classes()).toContain('alert-warning')
    })

    it('renders error toast correctly', () => {
      const wrapper = mount(Toast, {
        props: { type: ToastType.Error, message: 'Error message', timeout: 5000 }
      })

      expect(wrapper.find('.alert').classes()).toContain('alert-error')
    })
  })

  describe('Behavior', () => {
    it('closes automatically after timeout', async () => {
      vi.useFakeTimers()
      const wrapper = mount(Toast, {
        props: { type: ToastType.Success, message: 'Auto-close message', timeout: 3000 }
      })

      expect(wrapper.isVisible()).toBe(true)
      expect(wrapper.text()).toContain('3s')

      vi.advanceTimersByTime(1000)
      await nextTick()
      expect(wrapper.text()).toContain('2s')

      vi.advanceTimersByTime(2000)
      await nextTick()
      expect(wrapper.isVisible()).toBe(true)

      vi.useRealTimers()
    })
  })
})
