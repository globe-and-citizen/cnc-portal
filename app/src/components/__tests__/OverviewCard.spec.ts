import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OverviewCard from '../OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'
import SkeletonLoading from '../SkeletonLoading.vue'

describe('OverviewCard', () => {
  it('should renders card correctly', async () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Total Balance',
        bgColor: 'bg-[#C8FACD]',
        cardIcon: bagIcon,
        textColor: 'text-[#005249]',
        currency: 'USD',
        amount: 73900,
        previousAmount: 52000
      }
    })

    expect(wrapper.find('img[data-test="card-icon"]').exists()).toBeTruthy()
    expect(wrapper.find("[data-test='amount']").text()).toBe('73.9K USD')
    expect(wrapper.find('[data-test="percentage-increase"]').text()).toBe('+42.12%')
  })

  it('should not show percentage increase if previous amount is not provided', async () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Total Balance',
        bgColor: 'bg-[#C8FACD]',
        cardIcon: bagIcon,
        textColor: 'text-[#005249]',
        currency: 'USD',
        amount: 73900,
        previousAmount: 0
      }
    })

    expect(wrapper.find("[data-test='percentage-increase'").text()).toBe('-%')
  })

  it('should renders loading spinner', async () => {
    const wrapper = mount(OverviewCard, {
      props: {
        title: 'Total Balance',
        isLoading: true
      }
    })

    expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    expect(wrapper.find("[data-test='amount'").exists()).toBeFalsy()
  })
})
