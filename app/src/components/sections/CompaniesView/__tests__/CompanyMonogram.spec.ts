import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompanyMonogram from '@/components/sections/CompaniesView/CompanyMonogram.vue'

describe('CompanyMonogram', () => {
  const root = (wrapper: ReturnType<typeof mount>) => wrapper.find('[data-test="company-monogram"]')

  it('renders the root with a data-test attribute', () => {
    const wrapper = mount(CompanyMonogram, { props: { name: 'Acme', role: 'owner' } })
    expect(root(wrapper).exists()).toBe(true)
  })

  it('derives initials from the first two letters of the name', () => {
    const wrapper = mount(CompanyMonogram, { props: { name: 'globe', role: 'owner' } })
    expect(root(wrapper).text()).toBe('GL')
  })

  it('prefers the explicit code over the name', () => {
    const wrapper = mount(CompanyMonogram, {
      props: { name: 'Globe and Citizen', code: 'gc', role: 'owner' }
    })
    expect(root(wrapper).text()).toBe('GC')
  })

  it('truncates a long code to two characters', () => {
    const wrapper = mount(CompanyMonogram, {
      props: { name: 'Acme', code: 'ACME', role: 'owner' }
    })
    expect(root(wrapper).text()).toBe('AC')
  })

  it('marks an owner tile via data-role', () => {
    const wrapper = mount(CompanyMonogram, { props: { name: 'Acme', role: 'owner' } })
    expect(root(wrapper).attributes('data-role')).toBe('owner')
  })

  it('marks an employee tile via data-role', () => {
    const wrapper = mount(CompanyMonogram, { props: { name: 'Acme', role: 'employee' } })
    expect(root(wrapper).attributes('data-role')).toBe('employee')
  })

  it('defaults to a 34px tile', () => {
    const wrapper = mount(CompanyMonogram, { props: { name: 'Acme', role: 'owner' } })
    const style = root(wrapper).attributes('style') ?? ''
    expect(style).toContain('width: 34px')
    expect(style).toContain('height: 34px')
  })

  it('honors a custom size', () => {
    const wrapper = mount(CompanyMonogram, { props: { name: 'Acme', role: 'owner', size: 48 } })
    const style = root(wrapper).attributes('style') ?? ''
    expect(style).toContain('width: 48px')
    expect(style).toContain('height: 48px')
  })
})
