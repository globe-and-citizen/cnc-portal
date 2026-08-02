import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RoleBadge from '@/components/sections/CompaniesView/RoleBadge.vue'

describe('RoleBadge', () => {
  const badge = (wrapper: ReturnType<typeof mount>) => wrapper.find('[data-test="role-badge"]')

  it('renders the root with a data-test attribute', () => {
    const wrapper = mount(RoleBadge, { props: { role: 'owner' } })
    expect(badge(wrapper).exists()).toBe(true)
  })

  it('renders Owner with an owner role badge', () => {
    const wrapper = mount(RoleBadge, { props: { role: 'owner' } })
    expect(badge(wrapper).attributes('data-role')).toBe('owner')
    expect(badge(wrapper).text()).toBe('Owner')
  })

  it('renders Employee with an employee role badge', () => {
    const wrapper = mount(RoleBadge, { props: { role: 'employee' } })
    expect(badge(wrapper).attributes('data-role')).toBe('employee')
    expect(badge(wrapper).text()).toBe('Employee')
  })

  it('capitalizes the role label', () => {
    const wrapper = mount(RoleBadge, { props: { role: 'employee' } })
    expect(badge(wrapper).text()).toBe('Employee')
  })
})
