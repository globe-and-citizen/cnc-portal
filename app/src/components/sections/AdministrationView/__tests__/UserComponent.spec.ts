import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserComponent from '@/components/sections/AdministrationView/UserComponent.vue'

describe('UserComponent', () => {
  const baseUser = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Alice Example',
    imageUrl: 'https://example.com/alice.jpg',
    role: 'Admin'
  }

  it('renders name, address and image (default layout)', () => {
    const wrapper = mount(UserComponent, { props: { user: baseUser } })

    const name = wrapper.find('[data-test="user-name"]')
    expect(name.exists()).toBe(true)
    expect(name.text()).toContain('Alice Example')

    const addr = wrapper.find('[data-test="formatted-address"]')
    expect(addr.exists()).toBe(true)
    // formatted as first 6 ... last 4
    expect(addr.text()).toBe('0x1234...5678')

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(baseUser.imageUrl)
  })

  it('shows role and address in alternate layout', () => {
    const wrapper = mount(UserComponent, { props: { user: baseUser, layout: 'alternate' } })

    const role = wrapper.find('[data-test="user-role"]')
    expect(role.exists()).toBe(true)
    expect(role.text()).toBe('Admin')

    const addr = wrapper.find('[data-test="formatted-address"]')
    expect(addr.exists()).toBe(true)
  })

  it('shows detailed view with role visible when isDetailedView=true', () => {
    const wrapper = mount(UserComponent, { props: { user: baseUser, isDetailedView: true } })

    const role = wrapper.find('[data-test="user-role"]')
    expect(role.exists()).toBe(true)
    expect(role.text()).toBe('Admin')
  })

  it('hides name and details when collapsed', () => {
    const wrapper = mount(UserComponent, { props: { user: baseUser, isCollapsed: true } })

    // In collapsed state the detailed content should not be rendered
    const name = wrapper.find('[data-test="user-name"]')
    expect(name.exists()).toBe(false)

    const addr = wrapper.find('[data-test="formatted-address"]')
    expect(addr.exists()).toBe(false)
  })

  it('uses default avatar when imageUrl is missing', () => {
    const user = { ...baseUser, imageUrl: '' }
    const wrapper = mount(UserComponent, { props: { user } })

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('img.daisyui.com')
  })
})
