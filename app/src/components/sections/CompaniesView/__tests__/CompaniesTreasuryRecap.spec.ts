import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompaniesTreasuryRecap from '@/components/sections/CompaniesView/CompaniesTreasuryRecap.vue'
import type { TreasuryAggregate } from '@/types'

const seg = (label: string, pct: number) => ({ label, pct, valueUsd: pct, color: '#3b82f6' })

const aggregate: TreasuryAggregate = {
  totalUsd: 27900.45,
  totalLabel: '$27,900.45',
  ownUsd: 22392.4,
  ownLabel: '$22,392.40',
  memberUsd: 5508.05,
  memberLabel: '$5,508.05',
  byCompany: [seg('Acme', 70), seg('Globex', 30)],
  byToken: [seg('USDC', 55), seg('POL', 25), seg('ETH', 20)],
  byAccount: [seg('Bank', 50), seg('Safe', 30), seg('Cash', 12), seg('Expense', 8)]
}

const mountRecap = (props: Partial<Parameters<typeof mount<typeof CompaniesTreasuryRecap>>[1]>) =>
  mount(CompaniesTreasuryRecap, {
    props: { aggregate, ownerCount: 2, memberCount: 3, ...(props as object) }
  })

const legendLabels = (wrapper: ReturnType<typeof mountRecap>) =>
  wrapper.findAll('[data-test="distribution-legend-item"]').map((item) => item.text())

describe('CompaniesTreasuryRecap', () => {
  it('renders the root card', () => {
    const wrapper = mountRecap({})
    expect(wrapper.find('[data-test="treasury-recap"]').exists()).toBe(true)
  })

  it('renders the total label', () => {
    const wrapper = mountRecap({})
    expect(wrapper.find('[data-test="recap-total"]').text()).toBe('$27,900.45')
  })

  it('renders the owner stat with its count', () => {
    const wrapper = mountRecap({})
    expect(wrapper.find('[data-test="recap-own"]').text()).toBe('$22,392.40')
    expect(wrapper.text()).toContain('You own · 2')
  })

  it('renders the member stat with its count', () => {
    const wrapper = mountRecap({})
    expect(wrapper.find('[data-test="recap-member"]').text()).toBe('$5,508.05')
    expect(wrapper.text()).toContain('Member · 3')
  })

  it('defaults the counts to zero when omitted', () => {
    const wrapper = mount(CompaniesTreasuryRecap, { props: { aggregate } })
    expect(wrapper.text()).toContain('You own · 0')
    expect(wrapper.text()).toContain('Member · 0')
  })

  it('omits the POL approximation when the aggregate has no polLabel', () => {
    const wrapper = mountRecap({})
    expect(wrapper.find('[data-test="recap-pol"]').exists()).toBe(false)
  })

  it('renders the POL approximation when a polLabel is present', () => {
    const wrapper = mount(CompaniesTreasuryRecap, {
      props: { aggregate: { ...aggregate, polLabel: '≈ 65,418.2 POL' } as TreasuryAggregate }
    })
    expect(wrapper.find('[data-test="recap-pol"]').text()).toBe('≈ 65,418.2 POL')
  })

  it('feeds the by-company segments to the bar by default', () => {
    const wrapper = mountRecap({})
    const labels = legendLabels(wrapper)
    expect(labels).toHaveLength(2)
    expect(labels[0]).toContain('Acme')
    expect(labels[1]).toContain('Globex')
  })

  it('switches to the by-token segments when "By token" is clicked', async () => {
    const wrapper = mountRecap({})
    await wrapper.find('[data-test="recap-mode-token"]').trigger('click')
    const labels = legendLabels(wrapper)
    expect(labels).toHaveLength(3)
    expect(labels.join(' ')).toContain('USDC')
    expect(labels.join(' ')).toContain('ETH')
  })

  it('switches to the by-account segments when "By account" is clicked', async () => {
    const wrapper = mountRecap({})
    await wrapper.find('[data-test="recap-mode-account"]').trigger('click')
    const segments = wrapper.findAll('[data-test="distribution-segment"]')
    expect(segments).toHaveLength(4)
    expect(legendLabels(wrapper).join(' ')).toContain('Bank')
  })

  it('switches back to the by-company segments', async () => {
    const wrapper = mountRecap({})
    await wrapper.find('[data-test="recap-mode-token"]').trigger('click')
    await wrapper.find('[data-test="recap-mode-company"]').trigger('click')
    expect(wrapper.findAll('[data-test="distribution-segment"]')).toHaveLength(2)
    expect(legendLabels(wrapper).join(' ')).toContain('Acme')
  })
})
