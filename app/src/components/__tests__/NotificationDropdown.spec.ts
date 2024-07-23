// tests/components/NotificationDropdown.spec.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'

// Mock data

describe('NotificationDropdown.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(NotificationDropdown, {
      props: {}
    })
  })

  it('renders correctly and displays the dropdown button', () => {
    const button = wrapper.find('div[role="button"]')
    expect(button.exists()).toBe(true)
  })
})
