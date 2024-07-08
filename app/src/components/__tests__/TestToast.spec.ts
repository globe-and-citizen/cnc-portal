import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
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
})
