import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionButton from '../ActionButton.vue'

describe('ActionButton.vue', () => {
  const createWrapper = (props = {}, attrs = {}) =>
    mount(ActionButton, {
      global: {
        stubs: {
          UBadge: {
            props: ['label'],
            template: '<span data-test="u-badge">{{ label }}</span>'
          }
        }
      },
      props: {
        icon: 'heroicons:plus-circle',
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-700',
        title: 'Mint',
        toneClass: 'border-teal-200',
        ...props
      },
      attrs
    })

  it('renders title and icon', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Mint')
    expect(wrapper.find('[data-test="u-icon"]').exists()).toBe(true)
  })

  it('does not render badge when badge is not provided', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="u-badge"]').exists()).toBe(false)
  })

  it('renders badge when provided', () => {
    const wrapper = createWrapper({ badge: '2x' })

    expect(wrapper.text()).toContain('2x')
  })

  it('forwards attributes to button', () => {
    const wrapper = createWrapper({}, { disabled: true, 'data-test': 'custom-action-button' })

    const button = wrapper.find('button[data-test="custom-action-button"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
  })
})
