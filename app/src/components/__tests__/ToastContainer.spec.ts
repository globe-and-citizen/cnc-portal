import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'

// Mocking Toast component
const Toast = defineComponent({
  props: ['message', 'type', 'timeout'],
  template: '<div class="mock-toast">{{ message }}</div>'
})

// Import your component
import ToastContainer from '@/components/ToastContainer.vue'

// Mock the useToastStore function
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    toasts: [
      { message: 'Toast 1', type: 'success', timeout: 5000 },
      { message: 'Toast 2', type: 'error', timeout: 5000 }
    ]
  })
}))

describe('ToastContainer.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders the correct position class based on prop', () => {
    const wrapper = mount(ToastContainer, {
      global: {
        plugins: [createPinia()],
        components: { Toast }
      },
      props: {
        position: 'bottom-right'
      }
    })
    expect(wrapper.classes()).toContain('toast-end')
  })

  it('renders the correct number of Toast components', () => {
    const wrapper = mount(ToastContainer, {
      global: {
        plugins: [createPinia()],
        components: { Toast }
      },
      props: {
        position: 'bottom-right'
      }
    })

    const toasts = wrapper.findAllComponents(Toast)
    expect(toasts.length).toBe(2)
    expect(toasts[0].props()).toMatchObject({ message: 'Toast 1', type: 'success', timeout: 5000 })
    expect(toasts[1].props()).toMatchObject({ message: 'Toast 2', type: 'error', timeout: 5000 })
  })
})
