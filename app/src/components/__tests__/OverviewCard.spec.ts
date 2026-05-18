import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OverviewCard from '../OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'

describe('OverviewCard', () => {
  it('should renders card correctly', async () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: '73.9K USD',
        subtitle: 'Total Balance',
        cardIcon: bagIcon
      }
    })

    expect(wrapper.find('img[data-test="card-icon"]').exists()).toBeTruthy()
    expect(wrapper.find("[data-test='amount']").text()).toBe('73.9K USD')
    expect(wrapper.find('[data-test="subtitle"]').text()).toBe('Total Balance')
  })

  it.each(['info', 'success', 'warning', 'unknown'] as const)(
    'exposes the %s color via data-color',
    (color) => {
      const wrapper = mount(OverviewCard, {
        props: {
          title: 'Test Title',
          subtitle: 'Test Subtitle',
          color,
          cardIcon: 'test-icon.png'
        }
      })

      expect(wrapper.attributes('data-color')).toBe(color)
    }
  )

  it('shows skeleton while loading and hides amount', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: '73.9K USD',
        subtitle: 'Total Balance',
        cardIcon: bagIcon,
        loading: true
      }
    })

    expect(wrapper.find('[data-test="amount"]').exists()).toBe(false)
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
  })

  it('renders slot content', () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: '73.9K USD',
        subtitle: 'Total Balance',
        cardIcon: bagIcon
      },
      slots: {
        default: '<div data-test="overview-extra">Extra</div>'
      }
    })

    expect(wrapper.find('[data-test="overview-extra"]').exists()).toBe(true)
  })
})
