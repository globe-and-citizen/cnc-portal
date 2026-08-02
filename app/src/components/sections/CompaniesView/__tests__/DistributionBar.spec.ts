import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DistributionBar from '@/components/sections/CompaniesView/DistributionBar.vue'

describe('DistributionBar', () => {
  const segments = [
    { label: 'Bank', pct: 60, color: '#3b82f6' },
    { label: 'Investor', pct: 40, color: '#22c55e' }
  ]

  it('renders the root with a data-test attribute', () => {
    const wrapper = mount(DistributionBar, { props: { segments } })
    expect(wrapper.find('[data-test="distribution-bar"]').exists()).toBe(true)
  })

  it('renders one segment per non-zero entry', () => {
    const wrapper = mount(DistributionBar, { props: { segments } })
    expect(wrapper.findAll('[data-test="distribution-segment"]')).toHaveLength(2)
  })

  it('sets each segment width and background from the props', () => {
    const wrapper = mount(DistributionBar, { props: { segments } })
    const first = wrapper.findAll('[data-test="distribution-segment"]')[0]
    const style = first.attributes('style') ?? ''
    expect(style).toContain('width: 60%')
    expect(style).toContain('background: rgb(59, 130, 246)')
    expect(first.attributes('data-label')).toBe('Bank')
  })

  it('honors a custom height', () => {
    const wrapper = mount(DistributionBar, { props: { segments, height: '12px' } })
    const bar = wrapper.find('[data-test="distribution-bar"] > div')
    expect(bar.attributes('style')).toContain('height: 12px')
  })

  it('drops zero-percent segments', () => {
    const wrapper = mount(DistributionBar, {
      props: {
        segments: [
          { label: 'Bank', pct: 100, color: '#3b82f6' },
          { label: 'Empty', pct: 0, color: '#22c55e' }
        ]
      }
    })
    expect(wrapper.findAll('[data-test="distribution-segment"]')).toHaveLength(1)
  })

  it('renders nothing when there are no segments', () => {
    const wrapper = mount(DistributionBar, { props: { segments: [] } })
    expect(wrapper.findAll('[data-test="distribution-segment"]')).toHaveLength(0)
  })

  it('hides the legend by default', () => {
    const wrapper = mount(DistributionBar, { props: { segments } })
    expect(wrapper.find('[data-test="distribution-legend"]').exists()).toBe(false)
  })

  it('renders a legend row per segment when legend is enabled', () => {
    const wrapper = mount(DistributionBar, { props: { segments, legend: true } })
    expect(wrapper.find('[data-test="distribution-legend"]').exists()).toBe(true)
    const items = wrapper.findAll('[data-test="distribution-legend-item"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Bank 60%')
    expect(items[1].text()).toContain('Investor 40%')
  })

  it('does not render an empty legend container', () => {
    const wrapper = mount(DistributionBar, { props: { segments: [], legend: true } })
    expect(wrapper.find('[data-test="distribution-legend"]').exists()).toBe(false)
  })
})
