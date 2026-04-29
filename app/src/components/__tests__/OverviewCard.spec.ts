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
    'exposes the %s variant via data-variant',
    (variant) => {
      const wrapper = mount(OverviewCard, {
        props: {
          title: 'Test Title',
          subtitle: 'Test Subtitle',
          variant,
          cardIcon: 'test-icon.png'
        }
      })

      expect(wrapper.attributes('data-variant')).toBe(variant)
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
    expect(wrapper.findComponent({ name: 'SkeletonLoading' }).exists()).toBe(true)
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
